// src/pages/RelPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as XLSX from "xlsx";

function RelPage({stock,os,returns,users,nf,isMobile,currentUser}){
  const isTec=currentUser?.role==="tecnico";
  const[tab,setTab]=useState("estoque");

  // ── Filtro de período ──
  const hoje=new Date().toISOString().slice(0,10);
  const primeiroDiaMes=new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString().slice(0,10);
  const[dtInicio,setDtInicio]=useState(primeiroDiaMes);
  const[dtFim,setDtFim]=useState(hoje);
  const[periodoRapido,setPeriodoRapido]=useState("mes");

  const aplicarPeriodo=(p)=>{
    setPeriodoRapido(p);
    const hoje2=new Date();
    if(p==="hoje"){
      const d=hoje2.toISOString().slice(0,10);
      setDtInicio(d);setDtFim(d);
    } else if(p==="semana"){
      const ini=new Date(hoje2);ini.setDate(hoje2.getDate()-7);
      setDtInicio(ini.toISOString().slice(0,10));setDtFim(hoje2.toISOString().slice(0,10));
    } else if(p==="mes"){
      setDtInicio(new Date(hoje2.getFullYear(),hoje2.getMonth(),1).toISOString().slice(0,10));
      setDtFim(hoje2.toISOString().slice(0,10));
    } else if(p==="trimestre"){
      const ini=new Date(hoje2);ini.setMonth(hoje2.getMonth()-3);
      setDtInicio(ini.toISOString().slice(0,10));setDtFim(hoje2.toISOString().slice(0,10));
    } else if(p==="tudo"){
      setDtInicio("2020-01-01");setDtFim("2099-12-31");
    }
  };

  // ── Filtragem por data ──
  const parseDateBR=(dateStr)=>{
    if(!dateStr)return null;
    // formato DD/MM/YYYY HH:MM ou DD/MM/YYYY
    const parts=dateStr.split(" ")[0].split("/");
    if(parts.length===3)return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    // formato YYYY-MM-DD
    return new Date(dateStr);
  };
  const inRange=(dateStr)=>{
    const d=parseDateBR(dateStr);
    if(!d)return true;
    const ini=new Date(dtInicio+"T00:00:00");
    const fim=new Date(dtFim+"T23:59:59");
    return d>=ini&&d<=fim;
  };

  const viewOs=useMemo(()=>{
    const base=isTec?os.filter(o=>o.uid===currentUser.id):os;
    return base.filter(o=>inRange(o.date));
  },[os,dtInicio,dtFim,isTec,currentUser]);

  const viewRet=useMemo(()=>{
    const base=isTec?returns.filter(r=>r.uid===currentUser.id):returns;
    return base.filter(r=>inRange(r.date));
  },[returns,dtInicio,dtFim,isTec,currentUser]);

  const viewNF=useMemo(()=>nf.filter(n=>inRange(n.date)),[nf,dtInicio,dtFim]);

  const catData=useMemo(()=>{const m={};stock.forEach(s=>{m[s.cat]=(m[s.cat]||0)+s.qty;});return Object.entries(m).map(([name,value])=>({name,value}));},[stock]);
  const matData=useMemo(()=>{const m={};viewOs.forEach(o=>o.items.forEach(it=>{m[it.sid]=(m[it.sid]||0)+it.qty;}));return Object.entries(m).map(([sid,value])=>{const s=stock.find(x=>x.id===sid);return{name:s?.name?.split(" ").slice(0,2).join(" ")||sid,value};}).sort((a,b)=>b.value-a.value);},[viewOs,stock]);
  const techData=useMemo(()=>{const m={};viewOs.forEach(o=>{const u=users.find(x=>x.id===o.uid);const nm=u?.name.split(" ")[0]||"?";const tot=o.items.reduce((a,i)=>a+i.qty,0);m[nm]=(m[nm]||0)+tot;});return Object.entries(m).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);},[viewOs,users]);
  const maxT=techData[0]?.value||1;

  const totalNFGasto=viewNF.reduce((a,n)=>a+(n.total||0),0);
  const LOGO_URL=window.location.origin+"/logo-stocktel.png";
  const periodoLabel=dtInicio===dtFim?`${dtInicio.split("-").reverse().join("/")}`:
    `${dtInicio.split("-").reverse().join("/")} a ${dtFim.split("-").reverse().join("/")}`;

  // ── Gera PDF Profissional ──
  const gerarPDF=()=>{
    const w=window.open("","_blank","width=1100,height=800");
    const fmt2=(n)=>new Intl.NumberFormat("pt-BR").format(n??0);
    const fmtR=(n)=>"R$ "+new Intl.NumberFormat("pt-BR",{minimumFractionDigits:2}).format(n??0);
    const statusStyle=(s)=>{
      if(s.qty<=s.min*0.6)return"background:#ffebee;color:#c62828;border:1px solid #ef9a9a;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
      if(s.qty<=s.min)return"background:#fff3e0;color:#e65100;border:1px solid #ffcc80;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
      return"background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px;";
    };
    const statusTxt=(s)=>s.qty<=s.min*0.6?"▲ CRÍTICO":s.qty<=s.min?"● BAIXO":"✓ OK";

    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head>
    <meta charset="UTF-8"/>
    <title>StockTel — Relatório ${periodoLabel}</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;color:#222;background:#fff;font-size:13px;}
      .page{max-width:960px;margin:0 auto;padding:32px;}
      .header{background:linear-gradient(135deg,#1a1a1a 0%,#2d0000 50%,#cc0000 100%);color:#fff;padding:28px 32px;border-radius:12px;display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;}
      .header img{height:70px;filter:drop-shadow(0 2px 8px rgba(0,0,0,.5));}
      .header-info{text-align:right;}
      .header-title{font-size:22px;font-weight:800;letter-spacing:.04em;}
      .header-sub{font-size:12px;opacity:.8;margin-top:4px;}
      .header-period{font-size:13px;font-weight:700;margin-top:8px;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;display:inline-block;}
      .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;}
      .card{border-radius:10px;padding:16px;text-align:center;border:1px solid;}
      .card-title{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;}
      .card-value{font-size:26px;font-weight:800;line-height:1;}
      .card-sub{font-size:10px;margin-top:4px;opacity:.7;}
      .card-red{background:#ffebee;border-color:#ef9a9a;color:#c62828;}
      .card-orange{background:#fff3e0;border-color:#ffcc80;color:#e65100;}
      .card-green{background:#e8f5e9;border-color:#a5d6a7;color:#2e7d32;}
      .card-blue{background:#e3f2fd;border-color:#90caf9;color:#1565c0;}
      .section{margin-bottom:28px;}
      .section-title{font-size:15px;font-weight:800;color:#cc0000;padding:10px 14px;background:#fff5f5;border-left:4px solid #cc0000;border-radius:0 8px 8px 0;margin-bottom:14px;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#1a1a1a;color:#fff;padding:10px 12px;text-align:left;font-weight:700;font-size:11px;letter-spacing:.05em;text-transform:uppercase;}
      tr:nth-child(even) td{background:#f9f9f9;}
      td{padding:9px 12px;border-bottom:1px solid #eee;vertical-align:middle;}
      .footer{margin-top:36px;padding-top:16px;border-top:2px solid #cc0000;display:flex;justify-content:space-between;align-items:center;font-size:10px;color:#888;}
      .footer-logo{color:#cc0000;font-weight:800;font-size:13px;}
      @media print{.no-print{display:none!important;}body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{padding:16px;}}
    </style></head><body>
    <div class="page">
      <div class="no-print" style="padding:12px;background:#f5f5f5;border-radius:8px;margin-bottom:20px;display:flex;gap:10px;align-items:center;">
        <button onclick="window.print()" style="background:#cc0000;color:#fff;border:none;padding:10px 20px;border-radius:6px;font-weight:700;cursor:pointer;font-size:13px;">🖨️ Imprimir / Salvar PDF</button>
        <button onclick="window.close()" style="background:#333;color:#fff;border:none;padding:10px 16px;border-radius:6px;cursor:pointer;font-size:13px;">✕ Fechar</button>
        <span style="font-size:11px;color:#666;">Selecione "Salvar como PDF" no diálogo de impressão</span>
      </div>
      <div class="header">
        <img src="${LOGO_URL}" alt="StockTel" onerror="this.style.display='none'"/>
        <div class="header-info">
          <div class="header-title">RELATÓRIO ${isTec?"DO TÉCNICO":"OPERACIONAL"}</div>
          <div class="header-sub">Soluções em Telecomunicações</div>
          <div class="header-period">📅 Período: ${periodoLabel}</div>
        </div>
      </div>
      <div class="cards">
        <div class="card card-blue"><div class="card-title">Itens em Estoque</div><div class="card-value">${fmt2(stock.length)}</div><div class="card-sub">Total cadastrado</div></div>
        <div class="card card-red"><div class="card-title">OS no Período</div><div class="card-value">${fmt2(viewOs.length)}</div><div class="card-sub">${periodoLabel}</div></div>
        <div class="card card-orange"><div class="card-title">Devoluções</div><div class="card-value">${fmt2(viewRet.length)}</div><div class="card-sub">No período</div></div>
        <div class="card card-green"><div class="card-title">NFs / Gasto</div><div class="card-value" style="font-size:16px;">${fmtR(totalNFGasto)}</div><div class="card-sub">${viewNF.length} notas no período</div></div>
      </div>
      <div class="section">
        <div class="section-title">📦 Estoque de Materiais</div>
        <table><thead><tr><th>Código</th><th>Material</th><th>Categoria</th><th>Qtd Atual</th><th>Qtd Mínima</th><th>Situação</th></tr></thead>
        <tbody>${stock.map(s=>`<tr><td><code style="background:#f5f5f5;padding:2px 6px;border-radius:3px;font-size:11px;">${s.code||"—"}</code></td><td style="font-weight:600;">${s.name}</td><td style="color:#666;">${s.cat}</td><td style="font-weight:700;font-size:15px;color:${s.qty<=s.min*0.6?"#c62828":s.qty<=s.min?"#e65100":"#2e7d32"};">${fmt2(s.qty)}</td><td style="color:#888;">${fmt2(s.min)}</td><td><span style="${statusStyle(s)}">${statusTxt(s)}</span></td></tr>`).join("")}</tbody></table>
      </div>
      <div class="section">
        <div class="section-title">🔧 Ordens de Serviço — ${periodoLabel} (${viewOs.length})</div>
        ${viewOs.length===0?'<p style="color:#888;padding:12px;">Nenhuma OS no período selecionado.</p>':`<table><thead><tr><th>Nº OS</th><th>Técnico</th><th>Cliente</th><th>Data</th><th>Total Itens</th></tr></thead>
        <tbody>${viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);const tot=o.items.reduce((a,i)=>a+i.qty,0);return`<tr><td style="font-weight:700;color:#cc0000;">${o.os}</td><td style="font-weight:600;">${t?.name||"?"}</td><td>${o.client}</td><td style="color:#888;font-size:11px;">${o.date}</td><td style="text-align:center;font-weight:700;">${fmt2(tot)}</td></tr>`;}).join("")}</tbody></table>`}
      </div>
      <div class="section">
        <div class="section-title">↩️ Devoluções — ${periodoLabel} (${viewRet.length})</div>
        ${viewRet.length===0?'<p style="color:#888;padding:12px;">Nenhuma devolução no período.</p>':`<table><thead><tr><th>Técnico</th><th>Data</th><th>Status</th><th>Aprovado por</th></tr></thead>
        <tbody>${viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);const stc={pending:"background:#fff3e0;color:#e65100",approved:"background:#e8f5e9;color:#2e7d32",rejected:"background:#ffebee;color:#c62828"};const stl={pending:"⏳ Pendente",approved:"✅ Aprovada",rejected:"❌ Rejeitada"};return`<tr><td style="font-weight:600;">${t?.name||"?"}</td><td style="color:#888;font-size:11px;">${r.date}</td><td><span style="${stc[r.status]||""};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;">${stl[r.status]||r.status}</span></td><td style="color:#888;">${r.rBy||"—"}</td></tr>`;}).join("")}</tbody></table>`}
      </div>
      ${viewNF.length>0?`<div class="section"><div class="section-title">💰 Notas Fiscais — ${periodoLabel} (${viewNF.length})</div>
        <table><thead><tr><th>Nº NF</th><th>Fornecedor</th><th>Data</th><th>Itens</th><th>Valor</th></tr></thead>
        <tbody>${viewNF.map(n=>`<tr><td style="font-weight:700;color:#cc0000;">${n.num}</td><td style="font-weight:600;">${n.supplier}</td><td style="color:#888;font-size:11px;">${n.date}</td><td style="text-align:center;">${n.items?.length||0}</td><td style="font-weight:800;color:#2e7d32;">${fmtR(n.total)}</td></tr>`).join("")}
        <tr style="background:#fff0f0;"><td colspan="4" style="font-weight:800;text-align:right;padding-right:20px;">TOTAL DO PERÍODO:</td><td style="font-weight:800;font-size:16px;color:#cc0000;">${fmtR(totalNFGasto)}</td></tr></tbody></table></div>`:""}
      <div class="footer">
        <div class="footer-logo">StockTel — Soluções em Telecomunicações</div>
        <div>Gerado em ${new Date().toLocaleString("pt-BR")} · v1.0.0</div>
        <div>© ${new Date().getFullYear()} StockTel</div>
      </div>
    </div></body></html>`);
    w.document.close();
  };

  // ── Gera Excel por Período ──
  const gerarExcel=()=>{
    const wb=XLSX.utils.book_new();
    const statusTxt=(s)=>s.qty<=s.min*0.6?"CRÍTICO":s.qty<=s.min?"BAIXO":"OK";

    const estoqueData=[
      [`STOCKTEL — RELATÓRIO DE ESTOQUE — ${periodoLabel}`,"","","","",""],[""],
      ["CÓDIGO","MATERIAL","CATEGORIA","UNIDADE","QTD ATUAL","QTD MÍNIMA","SITUAÇÃO"],
      ...stock.map(s=>[s.code||"—",s.name,s.cat,s.unit,s.qty,s.min,statusTxt(s)])
    ];
    const ws1=XLSX.utils.aoa_to_sheet(estoqueData);
    ws1["!cols"]=[{wch:12},{wch:35},{wch:20},{wch:8},{wch:12},{wch:12},{wch:10}];
    XLSX.utils.book_append_sheet(wb,ws1,"📦 Estoque");

    const osData=[
      [`STOCKTEL — ORDENS DE SERVIÇO — ${periodoLabel}`,"","","",""],[""],
      ["Nº OS","TÉCNICO","CLIENTE","DATA","TOTAL ITENS"],
      ...viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);return[o.os,t?.name||"?",o.client,o.date,o.items.reduce((a,i)=>a+i.qty,0)];})
    ];
    const ws2=XLSX.utils.aoa_to_sheet(osData);
    ws2["!cols"]=[{wch:18},{wch:22},{wch:25},{wch:20},{wch:14}];
    XLSX.utils.book_append_sheet(wb,ws2,"🔧 Ordens de Serviço");

    const retData=[
      [`STOCKTEL — DEVOLUÇÕES — ${periodoLabel}`,"","",""],[""],
      ["TÉCNICO","DATA","STATUS","APROVADO POR"],
      ...viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);const sl={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};return[t?.name||"?",r.date,sl[r.status]||r.status,r.rBy||"—"];})
    ];
    const ws3=XLSX.utils.aoa_to_sheet(retData);
    ws3["!cols"]=[{wch:22},{wch:20},{wch:14},{wch:22}];
    XLSX.utils.book_append_sheet(wb,ws3,"↩️ Devoluções");

    if(!isTec){
      const nfData=[
        [`STOCKTEL — NOTAS FISCAIS — ${periodoLabel}`,"","",""],[""],
        ["Nº NF","FORNECEDOR","DATA","ITENS","VALOR TOTAL"],
        ...viewNF.map(n=>[n.num,n.supplier,n.date,n.items?.length||0,Number(n.total||0)]),
        [""],["TOTAL DO PERÍODO","","",viewNF.length,Number(totalNFGasto)]
      ];
      const ws4=XLSX.utils.aoa_to_sheet(nfData);
      ws4["!cols"]=[{wch:16},{wch:25},{wch:14},{wch:10},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws4,"💰 Notas Fiscais");

      const tecData=[
        [`STOCKTEL — TÉCNICOS — ${periodoLabel}`,"","","",""],[""],
        ["TÉCNICO","OS NO PERÍODO","MAT. CONSUMIDO"],
        ...techData.map((t,i)=>[t.name,viewOs.filter(o=>users.find(u=>u.id===o.uid)?.name.split(" ")[0]===t.name).length,t.value])
      ];
      const ws5=XLSX.utils.aoa_to_sheet(tecData);
      ws5["!cols"]=[{wch:22},{wch:16},{wch:16}];
      XLSX.utils.book_append_sheet(wb,ws5,"👷 Técnicos");
    }

    XLSX.writeFile(wb,`StockTel_${periodoLabel.replace(/\//g,"-")}.xlsx`);
  };

  const tabs=[{k:"estoque",l:"📦 Estoque"},{k:"os",l:"🔧 OS"},{k:"tecnicos",l:"👷 Técnicos"},{k:"dev",l:"↩️ Devoluções"}];
  const sc2={pending:"ylw",approved:"grn",rejected:"red"};
  const sl2={pending:"Pendente",approved:"Aprovada",rejected:"Rejeitada"};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>

    {/* Header com título e botões */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>{isTec?"Meus Relatórios":"Relatórios"}</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Filtre por período e exporte em PDF ou Excel</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="red" size="sm" onClick={gerarPDF}>🖨️ PDF</Btn>
        <Btn color="grn" size="sm" onClick={gerarExcel}>📊 Excel</Btn>
      </div>
    </div>



    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`,overflowX:"auto"}}>
      {tabs.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>

    {/* ESTOQUE */}
    {tab==="estoque"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!isMobile&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Por Categoria</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {catData.map((_,i)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}
            </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
          </ResponsiveContainer>
        </Card>
        <Card style={{padding:16}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Mais Consumidos no Período</div>
          {matData.length===0?<div style={{color:C.muted,fontSize:12}}>Nenhuma OS no período.</div>
          :<ResponsiveContainer width="100%" height={200}>
            <BarChart data={matData.slice(0,6)} layout="vertical">
              <XAxis type="number" tick={{fill:C.muted,fontSize:10}}/><YAxis type="category" dataKey="name" tick={{fill:C.muted,fontSize:9}} width={110}/>
              <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/><Bar dataKey="value" fill={C.gold} radius={[0,4,4,0]}/>
            </BarChart>
          </ResponsiveContainer>}
        </Card>
      </div>}
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","MATERIAL","CATEGORIA","QTD ATUAL","QTD MÍN.","SITUAÇÃO"]}/></thead>
            <tbody>{stock.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return<TRow key={s.id} cells={[
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
              s.name,s.cat,
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:low?C.ylw:C.txt}}>{fmt(s.qty)}</span>,
              fmt(s.min),
              crit?<Bdg color="red">▲ Crítico</Bdg>:low?<Bdg color="ylw">● Baixo</Bdg>:<Bdg color="grn">✓ OK</Bdg>
            ]}/>;})}</tbody>
          </table>
        </div>
      </Card>
    </div>}

    {/* OS */}
    {tab==="os"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>{viewOs.length} OS no período: {periodoLabel}</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><THead cols={["OS","TÉCNICO","CLIENTE","DATA","ITENS"]}/></thead>
        <tbody>
          {viewOs.length===0?<tr><td colSpan={5} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhuma OS no período selecionado.</td></tr>
          :viewOs.map(o=>{const t=users.find(u=>u.id===o.uid);return<TRow key={o.id} cells={[
            <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.gold,fontSize:12,fontWeight:700}}>{o.os}</span>,
            t?.name||"?",o.client,
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{o.date}</span>,
            <span style={{color:C.gold,fontWeight:700}}>{o.items.reduce((a,i)=>a+i.qty,0)}</span>
          ]}/>;})}</tbody>
      </table></div>
    </Card>}

    {/* TÉCNICOS */}
    {tab==="tecnicos"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      {!isMobile&&techData.length>0&&<Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>Consumo no Período</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart><Pie data={techData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
            {techData.map((_,i)=><Cell key={i} fill={i===0?C.gold:PIE[i%PIE.length]}/>)}
          </Pie><Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/></PieChart>
        </ResponsiveContainer>
      </Card>}
      <Card style={{padding:16}}>
        <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:14}}>Ranking — {periodoLabel}</div>
        {techData.length===0?<div style={{color:C.muted,fontSize:12}}>Nenhuma OS no período.</div>
        :techData.map((t,i)=>(
          <div key={t.name} style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,minWidth:20}}>{i+1}</span>
                <span style={{fontSize:14,color:C.txt,fontWeight:500}}>{t.name}</span>
              </div>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:13,color:C.gold,fontWeight:700}}>{fmt(t.value)}</span>
            </div>
            <div style={{height:8,background:C.bdr,borderRadius:4}}>
              <div style={{height:"100%",width:`${(t.value/maxT)*100}%`,background:i===0?C.gold:"#555",borderRadius:4}}/>
            </div>
          </div>
        ))}
      </Card>
    </div>}

    {/* DEVOLUÇÕES */}
    {tab==="dev"&&<Card style={{padding:0,overflow:"hidden"}}>
      <div style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>{viewRet.length} devoluções no período: {periodoLabel}</div>
      <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><THead cols={["TÉCNICO","DATA SOLICITAÇÃO","STATUS","APROVADO POR"]}/></thead>
        <tbody>
          {viewRet.length===0?<tr><td colSpan={4} style={{padding:20,textAlign:"center",color:C.muted}}>Nenhuma devolução no período.</td></tr>
          :viewRet.map(r=>{const t=users.find(u=>u.id===r.uid);return<TRow key={r.id} cells={[
            t?.name||"?",
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{r.date}</span>,
            <Bdg color={sc2[r.status]}>{sl2[r.status]}</Bdg>,
            r.rBy||"—"
          ]}/>;})}</tbody>
      </table></div>
    </Card>}
  </div>;
}

export default RelPage;
