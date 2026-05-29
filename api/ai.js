// api/ai.js — Central Multi-IA StockTel com fallback gratuito/baixo custo
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash-lite";

const cleanEnv = (name) => {
  const raw = process.env[name];
  if (!raw) return "";
  return raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/^Bearer\s+/i, "")
    .trim();
};

const tools = [
  {
    type: "function",
    function: {
      name: "get_diagnostics",
      description: "Obtém diagnóstico completo do sistema: status de sync, fila de retry, integridade de dados e erros ativos.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "force_sync",
      description: "Força sincronização de dados locais para a nuvem (Supabase). Use quando dados não estão aparecendo em outras máquinas.",
      parameters: {
        type: "object",
        properties: {
          key: {
            anyOf: [{ type: "string" }, { type: "null" }],
            description: "Chave específica (ex: re_stock, re_veiculos). Use null ou omita para sincronizar TUDO."
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "clear_sync_queue",
      description: "Limpa a fila de retry de sincronização quando estiver travada ou com erros acumulados.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "fix_data_integrity",
      description: "Verifica e corrige automaticamente problemas de integridade: IDs duplicados, registros órfãos, dados corrompidos.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "clear_corrupted_key",
      description: "Limpa uma chave específica corrompida do armazenamento local.",
      parameters: {
        type: "object",
        properties: {
          key: { type: "string", description: "Chave a limpar (ex: re_stock)" }
        },
        required: ["key"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_full_report",
      description: "Gera relatório completo de saúde do sistema com métricas, alertas e recomendações.",
      parameters: { type: "object", properties: {} }
    }
  }
];

const providerStatus = () => [
  {
    id: "groq",
    name: "Groq",
    role: "principal rápido + ferramentas",
    configured: Boolean(cleanEnv("GROQ_API_KEY")),
    model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    supportsTools: true
  },
  {
    id: "openrouter",
    name: "OpenRouter Free",
    role: "fallback gratuito + roteador de modelos",
    configured: Boolean(cleanEnv("OPENROUTER_API_KEY")),
    model: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    supportsTools: true
  },
  {
    id: "gemini",
    name: "Gemini",
    role: "analista/validador em texto",
    configured: Boolean(cleanEnv("GEMINI_API_KEY")),
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    supportsTools: false
  }
];

const parseOpenAIResponse = async (response, provider) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `Erro na API ${provider}`);
  }
  const msg = data.choices?.[0]?.message || {};
  return {
    provider,
    reply: msg.content || "",
    tool_calls: msg.tool_calls || null,
    model: data.model
  };
};

const callGroq = async ({ messages, forceText }) => {
  const apiKey = cleanEnv("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY não configurada.");
  const body = {
    model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL,
    messages,
    max_tokens: 1200,
    temperature: 0.25
  };
  if (!forceText) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return parseOpenAIResponse(response, "groq");
};

const callOpenRouter = async ({ messages, forceText }) => {
  const apiKey = cleanEnv("OPENROUTER_API_KEY");
  if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada.");
  const body = {
    model: process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    messages,
    max_tokens: 1200,
    temperature: 0.25,
    route: "fallback"
  };
  if (!forceText) {
    body.tools = tools;
    body.tool_choice = "auto";
  }
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || "https://retelecom-stock.vercel.app",
      "X-Title": "StockTel Multi-IA"
    },
    body: JSON.stringify(body)
  });
  return parseOpenAIResponse(response, "openrouter");
};

const toGeminiContents = (messages) => {
  const system = messages.filter(m => m.role === "system").map(m => m.content).join("\n\n");
  const rest = messages.filter(m => m.role !== "system" && m.role !== "tool" && m.content);
  const contents = rest.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.content) }]
  }));
  if (system) {
    contents.unshift({ role: "user", parts: [{ text: `Instruções do sistema:\n${system}` }] });
  }
  return contents.length ? contents : [{ role: "user", parts: [{ text: "Responda em português brasileiro." }] }];
};

const callGemini = async ({ messages }) => {
  const apiKey = cleanEnv("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada.");
  const model = process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: toGeminiContents(messages),
      generationConfig: { temperature: 0.25, maxOutputTokens: 1200 }
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || "Erro na API Gemini");
  }
  return {
    provider: "gemini",
    reply: data.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("") || "",
    tool_calls: null,
    model
  };
};

const callWithFallback = async ({ messages, forceText }) => {
  const errors = [];
  const chain = forceText ? [callGroq, callGemini, callOpenRouter] : [callGroq, callOpenRouter];

  for (const fn of chain) {
    try {
      const result = await fn({ messages, forceText });
      return { ...result, fallback_errors: errors };
    } catch (e) {
      errors.push(e.message);
    }
  }
  throw new Error(errors.join(" | ") || "Nenhuma IA configurada respondeu.");
};

const callCouncil = async ({ messages }) => {
  const calls = [callGroq, callGemini, callOpenRouter].map(async fn => {
    try {
      const result = await fn({ messages, forceText: true });
      return { ok: true, ...result };
    } catch (e) {
      return { ok: false, provider: fn.name.replace("call", "").toLowerCase(), error: e.message };
    }
  });
  const results = await Promise.all(calls);
  const good = results.filter(r => r.ok && r.reply);
  if (!good.length) {
    throw new Error(results.map(r => r.error).filter(Boolean).join(" | ") || "Nenhuma IA do conselho respondeu.");
  }
  const reply = good.map(r => `### ${r.provider}\n${r.reply}`).join("\n\n---\n\n");
  return { provider: "council", reply, tool_calls: null, council: results };
};

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  if (req.body?.mode === "status") {
    return res.json({ providers: providerStatus() });
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Parâmetro inválido." });

  try {
    const forceText = req.body.force_text === true;
    const strategy = req.body.strategy || "fallback";
    const result = strategy === "council" && forceText
      ? await callCouncil({ messages })
      : await callWithFallback({ messages, forceText });

    if (result.tool_calls?.length) {
      return res.json({
        provider: result.provider,
        model: result.model,
        fallback_errors: result.fallback_errors || [],
        tool_calls: result.tool_calls
      });
    }

    return res.json({
      provider: result.provider,
      model: result.model,
      fallback_errors: result.fallback_errors || [],
      council: result.council,
      reply: result.reply || ""
    });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
}
