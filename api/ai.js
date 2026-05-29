// api/ai.js — Vercel Serverless Function com Tool Calling
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: "GROQ_API_KEY não configurada. Adicione no Vercel → Settings → Environment Variables." });

  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: "Parâmetro inválido." });

  // Ferramentas que a IA pode chamar para agir no sistema
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
            key: { type: "string", description: "Chave específica (ex: re_stock, re_veiculos). Omita para sincronizar TUDO." }
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

  try {
    const forceText = req.body.force_text === true;

    const body = {
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 2048,
      temperature: 0.3,
    };

    // Só oferece ferramentas se não estiver forçando texto
    if (!forceText) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || "Erro na API Groq" });

    const choice = data.choices[0];
    const msg = choice.message;
    // Se há tool_calls (independente do finish_reason)
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      return res.json({ tool_calls: msg.tool_calls });
    }
    // Resposta de texto normal
    return res.json({ reply: msg.content || "" });
  } catch (e) {
    return res.status(500).json({ error: e.message || "Erro interno" });
  }
}
