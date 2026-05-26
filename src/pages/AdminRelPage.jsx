// src/pages/AdminRelPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";
import * as XLSX from "xlsx";

function AdminRelPage({nf,stock,os,returns,tstock,users,solicitacoes,isMobile,addLog}){
  const[tab,setTab]=useState("financeiro");
  const[emails,setEmails]=useState("");
  const[msg,setMsg]=useState("");

  const LOGO_URL=window.location.origin+"/logo-stocktel.png";

  // ── Filtro de período ──
  const hoje=new Date().toISOString().slice(0,10);
  const primeiroDiaMes=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const[dtInicio,setDtInicio]=useState(primeiroDiaMes);
  const[dtFim,setDtFim]=useState(hoje);
  const[periodoRapido,setPeriodoRapido]=useState("mes");

  const aplicarPeriodo=(p)=>{
    setPeriodoRapido(p);
    const h=new Date();
    if(p==="hoje"){const d=h.toISOString().slice(0,10);setDtInicio(d);setDtFim(d);}
    else if(p==="semana"){const i=new Date(h);i.setDate(h.getDate()-7);setDtInicio(i.toISOString().slice(0,10));setDtFim(h.toISOString().slice(0,10));}
    else if(p==="mes"){setDtInicio(new Date(h.getFullYear(),h.getMonth(),1).toISOString().slice(0,10));setDtFim(h.toISOString().slice(0,10));}
    else if(p==="trimestre"){const i=new Date(h);i.setMonth(h.getMonth()-3);setDtInicio(i.toISOString().slice(0,10));setDtFim(h.toISOString().slice(0,10));}
    else if(p==="tudo"){setDtInicio("2020-01-01");setDtFim("2099-12-31");}
  };

  const parseDateBR=(s)=>{if(!s)return null;const p=s.split(" ")[0].split("/");if(p.length===3)return new Date(`${p[2]}-${p[1]}-${p[0]}`);return new Date(s);};
  const inRange=(s)=>{const d=parseDateBR(s);if(!d)return true;return d>=new Date(dtInicio+"T00:00:00")&&d<=new Date(dtFim+"T23:59:59");};
  const periodoLabel=dtInicio===dtFim?dtInicio.split("-").reverse().join("/"):`${dtInicio.split("-").reverse().join("/")} a ${dtFim.split("-").reverse().join("/")}`;

  // ── Cálculos financeiros ──
  const viewNFAdmin=useMemo(()=>nf.filter(n=>inRange(n.date)),[nf,dtInicio,dtFim]);
  const viewOsAdmin=useMemo(()=>os.filter(o=>inRange(o.date)),[os,dtInicio,dtFim]);
  const viewRetAdmin=useMemo(()=>returns.filter(r=>inRange(r.date)),[returns,dtInicio,dtFim]);

  const gastoPorMes=useMemo(()=>{
    const m={};
    viewNFAdmin.forEach(n=>{
      const mes=n.date?n.date.substring(0,7):"Sem data";
      if(!m[mes])m[mes]={mes,total:0,qtdNF:0,itens:0};
      m[mes].total+=n.total||0;
      m[mes].qtdNF+=1;
      m[mes].itens+=n.items?.length||0;
    });
    return Object.values(m).sort((a,b)=>a.mes.localeCompare(b.mes));
  },[viewNFAdmin]);

  const alertasPreco=useMemo(()=>{
    const hist={};
    const sorted=[...viewNFAdmin].sort((a,b)=>(a.date||"").localeCompare(b.date||""));
    sorted.forEach(n=>{
      n.items?.forEach(it=>{
        const s=stock.find(x=>x.id===it.sid);
        if(!s||!it.qty||it.qty===0)return;
        const unitPrice=it.val/it.qty;
        if(!hist[it.sid])hist[it.sid]={name:s.name,code:s.code,unit:s.unit,prices:[]};
        hist[it.sid].prices.push({date:n.date,nf:n.num,price:unitPrice,qty:it.qty,total:it.val});
      });
    });
    const alerts=[];
    Object.values(hist).forEach(item=>{
      if(item.prices.length>=2){
        const prev=item.prices[item.prices.length-2];
        const curr=item.prices[item.prices.length-1];
        const diff=curr.price-prev.price;
        const pct=prev.price>0?(diff/prev.price)*100:0;
        if(Math.abs(pct)>=1){
          alerts.push({name:item.name,code:item.code,unit:item.unit,
            prevPrice:prev.price,currPrice:curr.price,
            prevNF:prev.nf,currNF:curr.nf,
            diff,pct,up:diff>0});
        }
      }
    });
    return alerts.sort((a,b)=>Math.abs(b.pct)-Math.abs(a.pct));
  },[viewNFAdmin,stock]);

  const rankingTec=useMemo(()=>{
    return users.filter(u=>u.role==="tecnico").map(u=>{
      const myOs=viewOsAdmin.filter(o=>o.uid===u.id);
      const myKit=tstock.filter(t=>t.uid===u.id);
      const myDev=viewRetAdmin.filter(r=>r.uid===u.id);
      const mySol=solicitacoes?.filter(s=>s.uid===u.id)||[];
      const totalMat=myKit.reduce((a,t)=>a+t.qty,0);
      const totalOsMat=myOs.reduce((a,o)=>a+o.items.reduce((b,i)=>b+i.qty,0),0);
      return{...u,qtdOS:myOs.length,matEmPosse:totalMat,matUsado:totalOsMat,devs:myDev.length,sols:mySol.length};
    }).sort((a,b)=>b.qtdOS-a.qtdOS);
  },[users,viewOsAdmin,tstock,viewRetAdmin,solicitacoes,dtInicio,dtFim]);

  const totalGasto=viewNFAdmin.reduce((a,n)=>a+(n.total||0),0);
  const totalNFs=viewNFAdmin.length;
  const mediaGastoPorNF=totalNFs>0?totalGasto/totalNFs:0;
  const maxMes=gastoPorMes.length>0?Math.max(...gastoPorMes.map(m=>m.total)):1;
  const alertasAlta=alertasPreco.filter(a=>a.up);
  const alertasBaixa=alertasPreco.filter(a=>!a.up);

  // ── Gera PDF Profissional ──
  const gerarPDF=()=>{
    const w=window.open("","_blank","width=1100,height=800");
    const low=stock.filter(s=>s.qty<=s.min);
    const crit=stock.filter(s=>s.qty<=s.min*0.6);
    const ok=stock.filter(s=>s.qty>s.min);

    const statusStyle=(s)=>{
      if(s.qty<=s.min*0.6)return'background:#ffebee;color:#c62828;border:1px solid #ef9a9a;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;';
      if(s.qty<=s.min)return'background:#fff3e0;color:#e65100;border:1px solid #ffcc80;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;';
      return'background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;';
    };
    const statusTxt=(s)=>s.qty<=s.min*0.6?"▲ CRÍTICO":s.qty<=s.min?"● BAIXO":"✓ OK";
    const fmt2=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);
    const fmtR=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2}).format(n??0);

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>StockTel — Relatório Completo</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#222;background:#fff;font-size:13px;}
      .page{max-width:960px;margin:0 auto;padding:32px;}
      /* Header */
      .header{background:linear-gradient(135deg,#1a1a1a 0%,#2d0000 50%,#cc0000 100%);color:#fff;padding:28px 32px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
      .header img{height:70px;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.5));}
      .header-info{text-align:right;}
      .header-title{font-size:22px;font-weight:800;letter-spacing:.04em;}
      .header-sub{font-size:12px;opacity:.8;margin-top:4px;}
      .header-date{font-size:11px;opacity:.7;margin-top:8px;background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:20px;display:inline-block;}
      /* Summary cards */
      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
      .card{border-radius:10px;padding:16px;text-align:center;border:1px solid;}
      .card-title{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;}
      .card-value{font-size:28px;font-weight:800;line-height:1;}
      .card-sub{font-size:10px;margin-top:4px;opacity:.7;}
      .card-red{background:#ffebee;border-color:#ef9a9a;color:#c62828;}
      .card-orange{background:#fff3e0;border-color:#ffcc80;color:#e65100;}
      .card-green{background:#e8f5e9;border-color:#a5d6a7;color:#2e7d32;}
      .card-blue{background:#e3f2fd;border-color:#90caf9;color:#1565c0;}
      /* Section */
      .section{margin-bottom:28px;}
      .section-title{font-size:15px;font-weight:800;color:#cc0000;padding:10px 14px;background:#fff5f5;border-left:4px solid #cc0000;border-radius:0 8px 8px 0;margin-bottom:14px;display:flex;align-items:center;gap:8px;}
      /* Tables */
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#1a1a1a;color:#fff;padding:10px 12px;text-align:left;font-weight:700;font-size:11px;letter-spacing:.05em;text-transform:uppercase;}
      tr:nth-child(even) td{background:#f9f9f9;}
      tr:hover td{background:#fff0f0;}
      td{padding:9px 12px;border-bottom:1px solid #eee;vertical-align:middle;}
      /* Alert boxes */
      .alert-up{background:#fff5f5;border:1px solid #ffcdd2;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
      .alert-down{background:#f1f8e9;border:1px solid #c5e1a5;border-radius:8px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;}
      .alert-name{font-weight:700;font-size:13px;}
      .alert-detail{font-size:11px;color:#666;margin-top:2px;}
      .alert-pct-up{font-size:18px;font-weight:800;color:#c62828;}
      .alert-pct-down{font-size:18px;font-weight:800;color:#2e7d32;}
      /* Bar chart */
      .bar-wrap{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
      .bar-row{display:flex;align-items:center;gap:10px;}
      .bar-label{font-size:11px;color:#555;min-width:70px;font-weight:600;}
      .bar-bg{flex:1;background:#f0f0f0;border-radius:4px;height:22px;overflow:hidden;}
      .bar-fill{height:100%;background:linear-gradient(90deg,#cc0000,#ff4444);border-radius:4px;display:flex;align-items:center;padding-left:8px;}
      .bar-fill span{font-size:11px;font-weight:700;color:#fff;white-space:nowrap;}
      .bar-val{font-size:11px;font-weight:700;color:#cc0000;min-width:80px;text-align:right;}
      /* Tech table */
      .tech-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;}
      /* Footer */
      .footer{margin-top:36px;padding-top:16px;border-top:2px solid #cc0000;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;}
      .footer-logo{color:#cc0000;font-weight:800;font-size:13px;}
      /* Print */
      @media print{
        .no-print{display:none!important;}
        body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
        .page{padding:16px;}
      }
    </style>
    </head><body>
    <div class="page">

      <div class="no-print" style="padding:12px;background:#f5f5f5;border-radius:8px;margin-bottom:20px;display:flex;gap:10px;align-items:center;">
        <button onclick="window.print()" style="background:#cc0000;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">🖨️ Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="background:#333;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Fechar</button>
        <span style="font-size:11px;color:#666;">Dica: No diálogo de impressão, selecione "Salvar como PDF"</span>
      </div>

      <!-- HEADER -->
      <div class="header">
        <img src="${LOGO_URL}" alt="StockTel" onerror="this.style.display='none'"/>
        <div class="header-info">
          <div class="header-title">RELATÓRIO COMPLETO</div>
          <div class="header-sub">Soluções em Telecomunicações</div>
          <div class="header-date">📅 Gerado em: ${new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"long",year:"numeric"})}</div>
        </div>
      </div>

      <!-- CARDS RESUMO -->
      <div class="cards">
        <div class="card card-blue">
          <div class="card-title">Total de Itens</div>
          <div class="card-value">${fmt2(stock.length)}</div>
          <div class="card-sub">Cadastrados no sistema</div>
        </div>
        <div class="card card-red">
          <div class="card-title">Itens Críticos</div>
          <div class="card-value">${fmt2(crit.length)}</div>
          <div class="card-sub">Abaixo do mínimo</div>
        </div>
        <div class="card card-orange">
          <div class="card-title">Estoque Baixo</div>
          <div class="card-value">${fmt2(low.length-crit.length)}</div>
          <div class="card-sub">Atenção necessária</div>
        </div>
        <div class="card card-green">
          <div class="card-title">Total Investido</div>
          <div class="card-value" style="font-size:18px;">${fmtR(totalGasto)}</div>
          <div class="card-sub">${fmt2(totalNFs)} notas fiscais</div>
        </div>
      </div>

      <!-- ESTOQUE -->
      <div class="section">
        <div class="section-title">📦 Estoque de Materiais</div>
        <table>
          <thead><tr><th>Código</th><th>Material</th><th>Categoria</th><th>Qtd Atual</th><th>Qtd Mínima</th><th>Unidade</th><th>Situação</th></tr></thead>
          <tbody>
            ${stock.map(s=>`<tr>
              <td><code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:11px;">${s.code||"—"}</code></td>
              <td style="font-weight:600;">${s.name}</td>
              <td style="color:#666;">${s.cat}</td>
              <td style="font-weight:700;font-size:15px;color:${s.qty<=s.min*0.6?"#c62828":s.qty<=s.min?"#e65100":"#2e7d32"};">${fmt2(s.qty)}</td>
              <td style="color:#888;">${fmt2(s.min)}</td>
              <td style="color:#888;">${s.unit}</td>
              <td><span style="${statusStyle(s)}">${statusTxt(s)}</span></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <!-- ORDENS DE SERVIÇO -->
      <div class="section">
        <div class="section-title">🔧 Ordens de Serviço (${fmt2(os.length)})</div>
        <table>
          <thead><tr><th>Nº OS</th><th>Técnico</th><th>Cliente</th><th>Data</th><th>Materiais</th><th>Total Itens</th></tr></thead>
          <tbody>
            ${os.map(o=>{const t=users.find(u=>u.id===o.uid);const mats=o.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name.split(" ")[0]}(${it.qty})`:"?";}).join(", ");const tot=o.items.reduce((a,i)=>a+i.qty,0);return`<tr>
              <td style="font-weight:700;color:#cc0000;">${o.os}</td>
              <td style="font-weight:600;">${t?.name||"?"}</td>
              <td>${o.client}</td>
              <td style="color:#888;font-size:11px;">${o.date}</td>
              <td style="font-size:11px;color:#555;">${mats}</td>
              <td style="font-weight:700;text-align:center;">${fmt2(tot)}</td>
            </tr>`;}).join("")}
          </tbody>
        </table>
      </div>

      <!-- TÉCNICOS RANKING -->
      <div class="section">
        <div class="section-title">👷 Desempenho dos Técnicos</div>
        <table>
          <thead><tr><th>#</th><th>Técnico</th><th>OS Realizadas</th><th>Material em Posse</th><th>Mat. Consumido</th><th>Devoluções</th><th>Solicitações</th></tr></thead>
          <tbody>
            ${rankingTec.map((t,i)=>`<tr>
              <td style="font-weight:800;font-size:16px;color:${i===0?"#cc0000":i===1?"#888":"#aaa"};text-align:center;">${i+1}</td>
              <td style="font-weight:700;">${t.name}</td>
              <td style="text-align:center;"><span class="tech-badge" style="background:#fff0f0;color:#cc0000;border:1px solid #ffcdd2;">${fmt2(t.qtdOS)} OS</span></td>
              <td style="text-align:center;font-weight:700;color:#1565c0;">${fmt2(t.matEmPosse)}</td>
              <td style="text-align:center;font-weight:700;color:#cc0000;">${fmt2(t.matUsado)}</td>
              <td style="text-align:center;color:#e65100;">${fmt2(t.devs)}</td>
              <td style="text-align:center;color:#6a1b9a;">${fmt2(t.sols)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>

      <!-- NOTAS FISCAIS -->
      <div class="section">
        <div class="section-title">💰 Notas Fiscais — Histórico de Compras</div>
        <table>
          <thead><tr><th>Nº NF</th><th>Fornecedor</th><th>Data</th><th>Itens</th><th>Valor Total</th></tr></thead>
          <tbody>
            ${nf.map(n=>`<tr>
              <td style="font-weight:700;color:#cc0000;">${n.num}</td>
              <td style="font-weight:600;">${n.supplier}</td>
              <td style="color:#888;font-size:11px;">${n.date}</td>
              <td style="text-align:center;">${n.items?.length||0}</td>
              <td style="font-weight:800;font-size:14px;color:#2e7d32;">${fmtR(n.total)}</td>
            </tr>`).join("")}
            <tr style="background:#fff0f0;">
              <td colspan="4" style="font-weight:800;text-align:right;padding-right:20px;">TOTAL INVESTIDO:</td>
              <td style="font-weight:800;font-size:16px;color:#cc0000;">${fmtR(totalGasto)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- GASTOS POR MÊS -->
      ${gastoPorMes.length>0?`
      <div class="section">
        <div class="section-title">📊 Gastos por Mês</div>
        <div class="bar-wrap">
          ${gastoPorMes.map(m=>`
          <div class="bar-row">
            <div class="bar-label">${m.mes}</div>
            <div class="bar-bg">
              <div class="bar-fill" style="width:${Math.max(5,(m.total/maxMes)*100)}%">
                <span>${m.qtdNF} NF(s)</span>
              </div>
            </div>
            <div class="bar-val">${fmtR(m.total)}</div>
          </div>`).join("")}
        </div>
      </div>`:""}

      <!-- ALERTAS DE PREÇO -->
      ${alertasPreco.length>0?`
      <div class="section">
        <div class="section-title">🔔 Alertas de Variação de Preço</div>
        ${alertasAlta.length>0?`<div style="font-weight:700;color:#c62828;margin-bottom:8px;font-size:12px;">📈 AUMENTO DE PREÇO (${alertasAlta.length})</div>`:""}
        ${alertasAlta.map(a=>`
        <div class="alert-up">
          <div>
            <div class="alert-name">📦 ${a.name} <span style="font-size:10px;color:#888;">(${a.code})</span></div>
            <div class="alert-detail">${a.prevNF}: ${fmtR(a.prevPrice)}/${a.unit} → ${a.currNF}: ${fmtR(a.currPrice)}/${a.unit}</div>
          </div>
          <div class="alert-pct-up">▲ +${a.pct.toFixed(1)}%</div>
        </div>`).join("")}
        ${alertasBaixa.length>0?`<div style="font-weight:700;color:#2e7d32;margin-bottom:8px;margin-top:12px;font-size:12px;">📉 REDUÇÃO DE PREÇO (${alertasBaixa.length})</div>`:""}
        ${alertasBaixa.map(a=>`
        <div class="alert-down">
          <div>
            <div class="alert-name">📦 ${a.name} <span style="font-size:10px;color:#888;">(${a.code})</span></div>
            <div class="alert-detail">${a.prevNF}: ${fmtR(a.prevPrice)}/${a.unit} → ${a.currNF}: ${fmtR(a.currPrice)}/${a.unit}</div>
          </div>
          <div class="alert-pct-down">▼ ${a.pct.toFixed(1)}%</div>
        </div>`).join("")}
      </div>`:""}

      <!-- DEVOLUÇÕES -->
      <div class="section">
        <div class="section-title">↩️ Devoluções (${fmt2(returns.length)})</div>
        <table>
          <thead><tr><th>Técnico</th><th>Data</th><th>Materiais</th><th>Status</th><th>Aprovado por</th></tr></thead>
          <tbody>
            ${returns.map(r=>{const t=users.find(u=>u.id===r.uid);const mats=r.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name.split(" ")[0]}(${it.qty})`:"?";}).join(", ");const stc={pending:"background:#fff3e0;color:#e65100",approved:"background:#e8f5e9;color:#2e7d32",rejected:"background:#ffebee;color:#c62828"};const stl={pending:"⏳ Pendente",approved:"✅ Aprovada",rejected:"❌ Rejeitada"};return`<tr>
              <td style="font-weight:600;">${t?.name||"?"}</td>
              <td style="color:#888;font-size:11px;">${r.date}</td>
              <td style="font-size:11px;">${mats}</td>
              <td><span style="${stc[r.status]||""};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${stl[r.status]||r.status}</span></td>
              <td style="color:#888;">${r.rBy||"—"}</td>
            </tr>`;}).join("")}
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="footer-logo">StockTel — Soluções em Telecomunicações · v1.1</div>
        <div>Relatório gerado em ${new Date().toLocaleString("pt-BR")} · v1.0.0</div>
        <div>© ${new Date().getFullYear()} StockTel — Todos os direitos reservados</div>
      </div>

    </div>
    </body></html>`);
    w.document.close();
  };

  // ── Gera Excel Profissional ──
  const gerarExcel=()=>{
    const wb=XLSX.utils.book_new();
    const fmtR2=(n)=>"R$ "+Number(n||0).toFixed(2).replace(".",",");
    const statusTxt=(s)=>s.qty<=s.min*0.6?"CRÍTICO":s.qty<=s.min?"BAIXO":"OK";

    // Aba 1: Estoque
    const estoqueData=[
      ["STOCKTEL — RELATÓRIO DE ESTOQUE","","","","","",""],
      [`Gerado em: ${new Date().toLocaleString("pt-BR")}`,"","","","","",""],
      [""],
      ["CÓDIGO","MATERIAL","CATEGORIA","UNIDADE","QTD ATUAL","QTD MÍNIMA","SITUAÇÃO"],
      ...stock.map(s=>[s.code||"—",s.name,s.cat,s.unit,s.qty,s.min,statusTxt(s)])
    ];
    const wsEst=XLSX.utils.aoa_to_sheet(estoqueData);
    wsEst["!cols"]=[{wch:12},{wch:35},{wch:20},{wch:8},{wch:12},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb,wsEst,"📦 Estoque");

    // Aba 2: OS
    const osData=[
      ["STOCKTEL — ORDENS DE SERVIÇO","","","","",""],
      [`Total: ${os.length} OS`,"","","","",""],
      [""],
      ["Nº OS","TÉCNICO","CLIENTE","DATA","MATERIAIS","TOTAL ITENS"],
      ...os.map(o=>{const t=users.find(u=>u.id===o.uid);const mats=o.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name}(${it.qty})`:it.sid;}).join("; ");const tot=o.items.reduce((a,i)=>a+i.qty,0);return[o.os,t?.name||"?",o.client,o.date,mats,tot];})
    ];
    const wsOS=XLSX.utils.aoa_to_sheet(osData);
    wsOS["!cols"]=[{wch:18},{wch:20},{wch:25},{wch:18},{wch:50},{wch:12}];
    XLSX.utils.book_append_sheet(wb,wsOS,"🔧 Ordens de Serviço");

    // Aba 3: Técnicos
    const tecData=[
      ["STOCKTEL — DESEMPENHO DOS TÉCNICOS","","","","","",""],
      [""],
      ["#","TÉCNICO","OS REALIZADAS","MAT. EM POSSE","MAT. CONSUMIDO","DEVOLUÇÕES","SOLICITAÇÕES"],
      ...rankingTec.map((t,i)=>[i+1,t.name,t.qtdOS,t.matEmPosse,t.matUsado,t.devs,t.sols])
    ];
    const wsTec=XLSX.utils.aoa_to_sheet(tecData);
    wsTec["!cols"]=[{wch:4},{wch:22},{wch:15},{wch:16},{wch:16},{wch:14},{wch:14}];
    XLSX.utils.book_append_sheet(wb,wsTec,"👷 Técnicos");

    // Aba 4: Financeiro
    const finData=[
      ["STOCKTEL — RELATÓRIO FINANCEIRO","","","",""],
      [`Total Investido: ${fmtR2(totalGasto)}  |  ${totalNFs} Notas Fiscais  |  Média: ${fmtR2(mediaGastoPorNF)}/NF`,"","","",""],
      [""],
      ["Nº NF","FORNECEDOR","DATA","QTD ITENS","VALOR TOTAL"],
      ...nf.map(n=>[n.num,n.supplier,n.date,n.items?.length||0,Number(n.total||0)]),
      [""],
      ["TOTAL","","","",Number(totalGasto)],
      [""],
      ["GASTOS POR MÊS","","","",""],
      ["MÊS","QTD NFs","TOTAL MÊS","",""],
      ...gastoPorMes.map(m=>[m.mes,m.qtdNF,Number(m.total),"",""])
    ];
    const wsFin=XLSX.utils.aoa_to_sheet(finData);
    wsFin["!cols"]=[{wch:16},{wch:25},{wch:14},{wch:12},{wch:16}];
    XLSX.utils.book_append_sheet(wb,wsFin,"💰 Financeiro");

    // Aba 5: Alertas de Preço
    if(alertasPreco.length>0){
      const altData=[
        ["STOCKTEL — ALERTAS DE VARIAÇÃO DE PREÇO","","","","","",""],
        [""],
        ["CÓDIGO","MATERIAL","NF ANTERIOR","PREÇO ANT.","NF ATUAL","PREÇO ATUAL","VARIAÇÃO %"],
        ...alertasPreco.map(a=>[a.code,a.name,a.prevNF,Number(a.prevPrice.toFixed(2)),a.currNF,Number(a.currPrice.toFixed(2)),`${a.up?"+":""}${a.pct.toFixed(1)}%`])
      ];
      const wsAlt=XLSX.utils.aoa_to_sheet(altData);
      wsAlt["!cols"]=[{wch:12},{wch:30},{wch:14},{wch:14},{wch:14},{wch:14},{wch:12}];
      XLSX.utils.book_append_sheet(wb,wsAlt,"🔔 Alertas de Preço");
    }

    // Aba 6: Devoluções
    const devData=[
      ["STOCKTEL — DEVOLUÇÕES","","","",""],
      [""],
      ["TÉCNICO","DATA","MATERIAIS","STATUS","APROVADO POR"],
      ...returns.map(r=>{const t=users.find(u=>u.id===r.uid);const mats=r.items.map(it=>{const s=stock.find(x=>x.id===it.sid);return s?`${s.name}(${it.qty})`:it.sid;}).join("; ");const sl={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};return[t?.name||"?",r.date,mats,sl[r.status]||r.status,r.rBy||"—"];})
    ];
    const wsDev=XLSX.utils.aoa_to_sheet(devData);
    wsDev["!cols"]=[{wch:22},{wch:20},{wch:50},{wch:14},{wch:22}];
    XLSX.utils.book_append_sheet(wb,wsDev,"↩️ Devoluções");

    XLSX.writeFile(wb,`StockTel_Relatorio_${new Date().toISOString().slice(0,10)}.xlsx`);
    setMsg("ok:✅ Excel gerado com 6 abas!");
    setTimeout(()=>setMsg(""),4000);
  };

  // ── Enviar por email ──
  const enviarEmail=()=>{
    const lista=emails.split(/[,;\n]/).map(e=>e.trim()).filter(e=>e.includes("@"));
    if(!lista.length){setMsg("err:Informe ao menos um e-mail válido.");return;}
    const corpo=`StockTel — Relatório Completo\nGerado em: ${new Date().toLocaleString("pt-BR")}\n${"=".repeat(50)}\n\n📦 ESTOQUE: ${stock.length} itens | Críticos: ${stock.filter(s=>s.qty<=s.min*0.6).length} | Baixo: ${stock.filter(s=>s.qty<=s.min&&s.qty>s.min*0.6).length}\n💰 FINANCEIRO: ${totalNFs} NFs | Total: R$ ${totalGasto.toFixed(2)}\n🔧 OS: ${os.length} ordens de serviço\n👷 TÉCNICOS: ${rankingTec.length}\n🔔 ALERTAS DE PREÇO: ${alertasAlta.length} aumentos | ${alertasBaixa.length} reduções\n\n${"=".repeat(50)}\nStockTel v1.0.0 © ${new Date().getFullYear()} StockTel`;
    window.open(`mailto:${lista.join(",")}?subject=${encodeURIComponent("StockTel — Relatório "+new Date().toLocaleDateString("pt-BR"))}&body=${encodeURIComponent(corpo)}`,"_blank");
    setMsg("ok:✅ App de e-mail aberto!");
    setTimeout(()=>setMsg(""),5000);
  };

  const tabs2=[{k:"financeiro",l:"💰 Financeiro"},{k:"tecnicos",l:"👷 Técnicos"},{k:"alertas",l:"🔔 Alertas de Preço"},{k:"email",l:"📧 Enviar"}];

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Relatório Administrativo</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Financeiro · Técnicos · Alertas de Preço · Exportação</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="red" size="sm" onClick={gerarPDF}>🖨️ Gerar PDF</Btn>
        <Btn color="grn" size="sm" onClick={gerarExcel}>📊 Gerar Excel</Btn>
      </div>
    </div>

    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}

    {/* FILTRO DE PERÍODO — destaque */}
    <Card style={{padding:16,border:`2px solid ${C.gold}55`}}>
      <div style={{fontSize:12,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📅 Filtrar Período do Relatório</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[{k:"hoje",l:"Hoje"},{k:"semana",l:"Última Semana"},{k:"mes",l:"Este Mês"},{k:"trimestre",l:"3 Meses"},{k:"tudo",l:"Tudo"}].map(p=>(
          <button key={p.k} onClick={()=>aplicarPeriodo(p.k)} style={{
            padding:"7px 16px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:periodoRapido===p.k?700:400,
            border:`1.5px solid ${periodoRapido===p.k?C.gold:C.bdr2}`,
            background:periodoRapido===p.k?C.gold:"transparent",
            color:periodoRapido===p.k?"#000":C.muted}}>
            {p.l}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10,alignItems:"end"}}>
        <Inp label="Data Início" value={dtInicio} onChange={v=>{setDtInicio(v);setPeriodoRapido("custom");}} type="date"/>
        <Inp label="Data Fim" value={dtFim} onChange={v=>{setDtFim(v);setPeriodoRapido("custom");}} type="date"/>
        <div style={{background:`${C.gold}18`,border:`1px solid ${C.gold}55`,borderRadius:8,padding:"10px 14px"}}>
          <div style={{fontSize:10,color:C.muted,marginBottom:3}}>PERÍODO SELECIONADO</div>
          <div style={{fontSize:13,fontWeight:800,color:C.gold}}>📅 {periodoLabel}</div>
          <div style={{display:"flex",gap:10,marginTop:6}}>
            <span style={{fontSize:10,color:C.grn,fontWeight:700}}>{viewNFAdmin.length} NFs</span>
            <span style={{fontSize:10,color:C.red,fontWeight:700}}>{viewOsAdmin.length} OS</span>
            <span style={{fontSize:10,color:C.ylw,fontWeight:700}}>{viewRetAdmin.length} Dev.</span>
          </div>
        </div>
      </div>
    </Card>

    {/* Cards resumo */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
      {[
        {label:"TOTAL INVESTIDO",value:`R$ ${fmt(Math.round(totalGasto))}`,sub:`${totalNFs} notas fiscais`,icon:"💰",color:C.grn},
        {label:"MÉDIA POR NF",value:`R$ ${fmt(Math.round(mediaGastoPorNF))}`,sub:"valor médio",icon:"📊",color:C.blue},
        {label:"ALERTAS ALTA",value:fmt(alertasAlta.length),sub:"aumentos de preço",icon:"📈",color:C.red},
        {label:"ALERTAS BAIXA",value:fmt(alertasBaixa.length),sub:"reduções de preço",icon:"📉",color:C.grn},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?12:16,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:10,background:`${s.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>{s.icon}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:".06em",marginBottom:2}}>{s.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:18,fontWeight:800,color:s.color,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.sub}</div>
          </div>
        </Card>
      ))}
    </div>

    {/* Filtro de Período */}
    <Card style={{padding:16}}>
      <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📅 Filtrar por Período</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[{k:"hoje",l:"Hoje"},{k:"semana",l:"Última Semana"},{k:"mes",l:"Este Mês"},{k:"trimestre",l:"3 Meses"},{k:"tudo",l:"Tudo"}].map(p=>(
          <button key={p.k} onClick={()=>aplicarPeriodo(p.k)}
            style={{padding:"6px 14px",borderRadius:20,border:`1.5px solid ${periodoRapido===p.k?C.gold:C.bdr2}`,
              background:periodoRapido===p.k?`${C.gold}22`:"transparent",
              color:periodoRapido===p.k?C.gold:C.muted,fontSize:12,
              fontWeight:periodoRapido===p.k?700:400,cursor:"pointer"}}>
            {p.l}
          </button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"200px 200px auto",gap:10,alignItems:"end"}}>
        <Inp label="Data Início" value={dtInicio} onChange={v=>{setDtInicio(v);setPeriodoRapido("custom");}} type="date"/>
        <Inp label="Data Fim" value={dtFim} onChange={v=>{setDtFim(v);setPeriodoRapido("custom");}} type="date"/>
        <div style={{paddingBottom:2}}>
          <div style={{fontSize:11,color:C.muted,marginBottom:4}}>PERÍODO</div>
          <div style={{background:`${C.gold}22`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"9px 14px",fontSize:12,fontWeight:700,color:C.gold,whiteSpace:"nowrap"}}>
            📅 {periodoLabel}
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:12,marginTop:12,flexWrap:"wrap"}}>
        {[
          {label:"NFs",value:viewNFAdmin.length,color:C.grn},
          {label:"OS",value:viewOsAdmin.length,color:C.red},
          {label:"Devoluções",value:viewRetAdmin.length,color:C.ylw},
        ].map((c,i)=>(
          <div key={i} style={{background:C.surf,borderRadius:8,padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:c.color,fontSize:16}}>{c.value}</span>
            <span style={{fontSize:11,color:C.muted}}>{c.label} no período</span>
          </div>
        ))}
      </div>
    </Card>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,overflowX:"auto"}}>
      {tabs2.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>

    {/* FINANCEIRO */}
    {tab==="financeiro"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <Card style={{padding:18}}>
        <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:16}}>📊 Gastos Mensais — {periodoLabel}</div>
        {gastoPorMes.length===0?<div style={{color:C.muted,fontSize:13}}>Nenhuma nota fiscal no período selecionado.</div>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {gastoPorMes.map(m=>(
            <div key={m.mes}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{m.mes} <span style={{fontSize:10,color:C.muted}}>· {m.qtdNF} NF(s)</span></span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:13}}>R$ {fmt(Math.round(m.total))}</span>
              </div>
              <div style={{height:24,background:C.bdr,borderRadius:6,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${Math.max(3,(m.total/maxMes)*100)}%`,background:`linear-gradient(90deg,${C.red},#ff4444)`,borderRadius:6,display:"flex",alignItems:"center",paddingLeft:8}}>
                  <span style={{fontSize:10,fontWeight:700,color:"#fff",whiteSpace:"nowrap"}}>{m.itens} item(s)</span>
                </div>
              </div>
            </div>
          ))}
          <div style={{marginTop:8,padding:"10px 14px",background:C.surf,borderRadius:8,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:C.muted}}>Total geral ({totalNFs} NFs)</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:16}}>R$ {fmt(Math.round(totalGasto))}</span>
          </div>
        </div>}
      </Card>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>📋 Detalhamento por Nota Fiscal</div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["Nº NF","FORNECEDOR","DATA","ITENS","VALOR TOTAL"]}/></thead>
            <tbody>
              {nf.length===0?<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhuma NF registrada.</td></tr>
              :viewNFAdmin.map(n=><TRow key={n.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.gold,fontWeight:700}}>{n.num}</span>,
                <span style={{fontWeight:600,color:C.txt}}>{n.supplier}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{n.date}</span>,
                <span style={{textAlign:"center"}}>{n.items?.length||0}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:14}}>R$ {fmt(Math.round(n.total||0))}</span>
              ]}/>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>}

    {/* TÉCNICOS */}
    {tab==="tecnicos"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,fontSize:14,fontWeight:700,color:C.txt}}>👷 Ranking dos Técnicos</div>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><THead cols={["#","TÉCNICO","OS REALIZADAS","MAT. EM POSSE","MAT. CONSUMIDO","DEVOLUÇÕES","SOLICITAÇÕES"]}/></thead>
          <tbody>
            {rankingTec.length===0?<tr><td colSpan={7} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhum técnico cadastrado.</td></tr>
            :rankingTec.map((t,i)=><TRow key={t.id} cells={[
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,fontSize:18,color:i===0?C.red:i===1?C.muted:"#555"}}>{i+1}</span>,
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${C.red}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>👷</div>
                <span style={{fontWeight:600,color:C.txt}}>{t.name}</span>
              </div>,
              <Bdg color="red">{t.qtdOS} OS</Bdg>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.blue,fontSize:14}}>{fmt(t.matEmPosse)}</span>,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.red,fontSize:14}}>{fmt(t.matUsado)}</span>,
              <span style={{color:C.ylw,fontWeight:600}}>{t.devs}</span>,
              <span style={{color:C.muted}}>{t.sols}</span>
            ]}/>)}
          </tbody>
        </table>
      </div>
    </Card>}

    {/* ALERTAS */}
    {tab==="alertas"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {alertasPreco.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma variação de preço detectada ainda.<br/>Registre ao menos 2 NFs com o mesmo produto.</span></Card>}
      {alertasAlta.length>0&&<div>
        <div style={{fontSize:12,fontWeight:700,color:C.red,marginBottom:8,letterSpacing:".06em",textTransform:"uppercase"}}>📈 Aumento de Preço ({alertasAlta.length})</div>
        {alertasAlta.map((a,i)=>(
          <Card key={i} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C.red}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:4}}>📦 {a.name} <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>({a.code})</span></div>
                <div style={{fontSize:11,color:C.muted}}>
                  <span style={{color:C.txt2}}>{a.prevNF}:</span> R$ {a.prevPrice.toFixed(2)}/{a.unit}
                  <span style={{margin:"0 8px",color:C.muted}}>→</span>
                  <span style={{color:C.txt2}}>{a.currNF}:</span> R$ {a.currPrice.toFixed(2)}/{a.unit}
                </div>
                <div style={{fontSize:11,color:C.muted,marginTop:4}}>Diferença: <strong style={{color:C.red}}>+R$ {Math.abs(a.diff).toFixed(2)}</strong> por {a.unit}</div>
              </div>
              <div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"8px 14px",textAlign:"center",flexShrink:0}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.red,fontSize:22}}>▲ +{a.pct.toFixed(1)}%</div>
                <div style={{fontSize:10,color:C.muted}}>mais caro</div>
              </div>
            </div>
          </Card>
        ))}
      </div>}
      {alertasBaixa.length>0&&<div style={{marginTop:8}}>
        <div style={{fontSize:12,fontWeight:700,color:C.grn,marginBottom:8,letterSpacing:".06em",textTransform:"uppercase"}}>📉 Redução de Preço ({alertasBaixa.length})</div>
        {alertasBaixa.map((a,i)=>(
          <Card key={i} style={{padding:14,marginBottom:8,borderLeft:`3px solid ${C.grn}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:4}}>📦 {a.name} <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>({a.code})</span></div>
                <div style={{fontSize:11,color:C.muted}}>
                  <span style={{color:C.txt2}}>{a.prevNF}:</span> R$ {a.prevPrice.toFixed(2)}/{a.unit}
                  <span style={{margin:"0 8px"}}> → </span>
                  <span style={{color:C.txt2}}>{a.currNF}:</span> R$ {a.currPrice.toFixed(2)}/{a.unit}
                </div>
              </div>
              <div style={{background:C.grnD,border:`1px solid ${C.grn}44`,borderRadius:8,padding:"8px 14px",textAlign:"center",flexShrink:0}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:22}}>▼ {a.pct.toFixed(1)}%</div>
                <div style={{fontSize:10,color:C.muted}}>mais barato</div>
              </div>
            </div>
          </Card>
        ))}
      </div>}
    </div>}

    {/* EMAIL */}
    {tab==="email"&&<Card style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{fontSize:14,fontWeight:700,color:C.txt}}>📧 Enviar Relatório por E-mail</div>
      <div>
        <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:6}}>Destinatários (um por linha ou vírgula)</label>
        <textarea value={emails} onChange={e=>setEmails(e.target.value)} rows={4}
          placeholder={"financeiro@empresa.com\ngerente@empresa.com"}
          style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
      </div>
      <div style={{background:C.surf,borderRadius:8,padding:"12px 14px",border:`1px solid ${C.bdr}`,fontSize:12,color:C.muted,lineHeight:1.6}}>
        💡 Clique em <strong style={{color:C.txt}}>Gerar PDF</strong> ou <strong style={{color:C.txt}}>Gerar Excel</strong> no topo para baixar os arquivos, depois anexe no seu e-mail. Ou clique abaixo para abrir o app de e-mail com resumo no corpo.
      </div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <Btn color="red" onClick={gerarPDF} style={{flex:1}}>🖨️ Gerar PDF Completo</Btn>
        <Btn color="grn" onClick={gerarExcel} style={{flex:1}}>📊 Gerar Excel (6 abas)</Btn>
        <Btn color="gold" onClick={enviarEmail} style={{flex:1}}>📧 Abrir App de E-mail</Btn>
      </div>
    </Card>}
  </div>;
}

export default AdminRelPage;
