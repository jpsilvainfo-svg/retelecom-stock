// src/pages/Dashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

function Dashboard({stock,tstock,users,os,returns,logs,setPage,isMobile,currentUser,pendSol,veiculos=[],abastecimentos=[]}){
  const isTec=currentUser?.role==="tecnico";
  const totalQty=stock.reduce((a,s)=>a+s.qty,0);
  const myTstock=tstock.filter(t=>t.uid===currentUser?.id);
  const myTstockQty=myTstock.reduce((a,t)=>a+t.qty,0);
  const techQty=tstock.reduce((a,t)=>a+t.qty,0);
  const pendRet=returns.filter(r=>r.status==="pending").length;
  const myPendRet=returns.filter(r=>r.uid===currentUser?.id&&r.status==="pending").length;
  const low=stock.filter(s=>s.qty<=s.min);
  const myOs=os.filter(o=>o.uid===currentUser?.id);
  const catData=useMemo(()=>{const m={};stock.forEach(s=>{m[s.cat]=(m[s.cat]||0)+s.qty;});return Object.entries(m).map(([name,value])=>({name,value}));},[stock]);
  const techUsage=useMemo(()=>{const m={};os.forEach(o=>{const u=users.find(x=>x.id===o.uid);const nm=u?.name.split(" ")[0]||"?";const tot=o.items.reduce((a,i)=>a+i.qty,0);if(!m[o.uid])m[o.uid]={name:nm,value:0};m[o.uid].value+=tot;});return Object.values(m).sort((a,b)=>b.value-a.value);},[os,users]);
  const maxU=techUsage[0]?.value||1;
  const lc={saida:C.gold,entrada:C.grn,dev:C.ylw,aprovada:C.grn};
  const li={saida:"→",entrada:"↓",dev:"↺",aprovada:"✓"};

  // ── DASHBOARD DO TÉCNICO ──
  if(isTec) return <div className="fi" style={{display:"flex",flexDirection:"column",gap:isMobile?14:20}}>
    {/* Cards do técnico */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:isMobile?10:16}}>
      {[
        {label:"MEU KIT",value:fmt(myTstockQty),sub:"Materiais em posse",icon:"🎒",color:C.gold},
        {label:"MINHAS OS",value:fmt(myOs.length),sub:"Ordens abertas",icon:"🔧",color:C.blue},
        {label:"DEVOLUÇÕES",value:fmt(myPendRet),sub:"Aguardando",icon:"↩️",color:myPendRet>0?C.ylw:C.gold},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?"12px":"18px",display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:isMobile?36:48,height:isMobile?36:48,borderRadius:10,background:`${s.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:22,flexShrink:0}}>{s.icon}</div>
          <div>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:".06em",marginBottom:2}}>{s.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?20:26,fontWeight:800,color:C.txt,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.sub}</div>
          </div>
        </Card>
      ))}
    </div>

    {/* Kit do técnico resumo */}
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`}}>
        <span style={{fontSize:13,fontWeight:700,color:C.txt}}>🎒 Meu Kit — Materiais em Posse</span>
        <Btn size="xs" color="gold" outline onClick={()=>setPage("kit")}>Ver tudo</Btn>
      </div>
      {myTstock.length===0
        ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Nenhum material no seu kit ainda.</div>
        :myTstock.slice(0,5).map(t=>{const s=stock.find(x=>x.id===t.sid);return s?
          <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`}}>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.txt}}>{s.name}</div>
              <div style={{fontSize:10,color:C.muted}}>{s.code} · {s.unit}</div>
            </div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:18}}>{fmt(t.qty)}</span>
          </div>:null;
        })
      }
    </Card>

    {/* Últimas OS do técnico */}
    <Card style={{padding:0,overflow:"hidden"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 16px",borderBottom:`1px solid ${C.bdr}`}}>
        <span style={{fontSize:13,fontWeight:700,color:C.txt}}>🔧 Minhas Últimas OS</span>
        <Btn size="xs" color="gold" outline onClick={()=>setPage("os")}>Ver todas</Btn>
      </div>
      {myOs.length===0
        ?<div style={{padding:24,textAlign:"center",color:C.muted,fontSize:13}}>Nenhuma OS registrada ainda.</div>
        :myOs.slice(0,3).map(o=>(
          <div key={o.id} style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold,fontWeight:700}}>{o.os}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{o.date}</span>
            </div>
            <div style={{fontSize:12,color:C.txt2,marginTop:2}}>{o.client}</div>
          </div>
        ))
      }
    </Card>

    {/* Ações rápidas técnico */}
    <Card style={{padding:16}}>
      <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Ações Rápidas</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {[
          {icon:"🔧",label:"Nova OS",p:"os"},
          {icon:"📋",label:"Solicitar Material",p:"sol"},
          {icon:"↩️",label:"Solicitar Devolução",p:"dev"},
          {icon:"🎒",label:"Meu Kit",p:"kit"},
        ].map((a,i)=>(
          <div key={i} onClick={()=>setPage(a.p)} style={{display:"flex",alignItems:"center",gap:10,padding:"14px",background:C.surf,borderRadius:10,cursor:"pointer",border:`1px solid ${C.bdr}`}}>
            <span style={{fontSize:24}}>{a.icon}</span>
            <span style={{fontSize:13,color:C.txt2,fontWeight:500}}>{a.label}</span>
          </div>
        ))}
      </div>
    </Card>
  </div>;

  // ── DASHBOARD ADMIN/ESTOQUE ──
  const alertasOleo=useMemo(()=>{
    if(!veiculos||veiculos.length===0)return[];
    return veiculos.filter(v=>v.status==="ativo").map(v=>{
      const regs=abastecimentos.filter(a=>a.veiculoId===v.id&&parseInt(a.odometro)>0);
      const kmAtual=regs.length>0?Math.max(...regs.map(a=>parseInt(a.odometro)||0)):parseInt(v.kmCadastro)||0;
      const kmBase=parseInt(v.kmCadastro)||0;
      const proxima=Math.ceil((kmAtual-kmBase+1)/10000)*10000+kmBase;
      const faltam=proxima-kmAtual;
      return{...v,kmAtual,faltam,urgente:faltam<=500,alerta:faltam<=2000};
    }).filter(v=>v.alerta).sort((a,b)=>a.faltam-b.faltam);
  },[veiculos,abastecimentos]);
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:isMobile?14:20}}>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:isMobile?10:16}}>
      {[
        {label:"TOTAL DE ITENS",value:fmt(stock.length),sub:"Itens cadastrados",icon:"📦"},
        {label:"ESTOQUE TOTAL",value:fmt(totalQty),sub:"Unidades disponíveis",icon:"🗄️"},
        {label:"MATERIAIS EM USO",value:fmt(techQty),sub:"Com técnicos",icon:"👷"},
        {label:"DEVOLUÇÕES PEND.",value:fmt(pendRet),sub:"Aguardando aprovação",icon:"↩️"},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?"12px":"18px",display:"flex",gap:isMobile?10:14,alignItems:"center"}}>
          <div style={{width:isMobile?36:48,height:isMobile?36:48,borderRadius:10,background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?18:22,flexShrink:0}}>{s.icon}</div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:9,fontWeight:700,color:C.muted,letterSpacing:".06em",marginBottom:2}}>{s.label}</div>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?20:26,fontWeight:800,color:C.txt,lineHeight:1}}>{s.value}</div>
            <div style={{fontSize:10,color:C.muted,marginTop:2}}>{s.sub}</div>
          </div>
        </Card>
      ))}
    </div>

    {isMobile?(
      <>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:`1px solid ${C.bdr}`}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>Movimentações Recentes</span>
            <Btn size="xs" color="ghost" outline onClick={()=>setPage("log")} style={{fontSize:10}}>Ver todas</Btn>
          </div>
          {logs.slice(0,3).map(l=>(
            <div key={l.id} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:`${lc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,flexShrink:0,color:lc[l.tipo]||C.gold,fontWeight:700}}>{li[l.tipo]||"·"}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:700,color:lc[l.tipo]||C.gold}}>{l.action}</div>
                <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.detail}</div>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted2,marginTop:2}}>{l.date}</div>
              </div>
            </div>
          ))}
        </Card>
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px",borderBottom:`1px solid ${C.bdr}`}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>Itens com Baixo Nível</span>
            <Btn size="xs" color="ghost" outline onClick={()=>setPage("estoque")} style={{fontSize:10}}>Ver todos</Btn>
          </div>
          {low.slice(0,4).map(s=>{const crit=s.qty<=s.min*0.6;return(
            <div key={s.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.name}</div>
                <div style={{fontSize:10,color:C.muted}}>{s.code} · mín: {s.min}</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:crit?C.red:C.ylw,fontSize:16}}>{s.qty}</span>
                {crit?<Bdg color="red">Crítico</Bdg>:<Bdg color="ylw">Baixo</Bdg>}
              </div>
            </div>
          );})}
        </Card>
        {alertasOleo.length>0&&<Card style={{padding:0,overflow:"hidden",borderLeft:`3px solid ${alertasOleo.some(a=>a.urgente)?C.red:C.ylw}`}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>⚙️ Alertas de Troca de Óleo</span>
            <Btn size="xs" color="gold" outline onClick={()=>setPage("frota")} style={{fontSize:10}}>Ver Frota</Btn>
          </div>
          {alertasOleo.map(v=>(
            <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",borderBottom:`1px solid ${C.bdr}18`}}>
              <div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.gold,fontSize:13}}>{v.placa}</span>
                <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{v.modelo}</span>
              </div>
              {v.urgente?<Bdg color="red">🔴 URGENTE: {fmt(v.faltam)} km</Bdg>:<Bdg color="ylw">🟡 {fmt(v.faltam)} km</Bdg>}
            </div>
          ))}
        </Card>}
        <Card style={{padding:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:12}}>Ações Rápidas</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[{icon:"📥",label:"Nova Entrada (NF)",p:"nf"},{icon:"🚀",label:"Liberar Material",p:"dist"},{icon:"↩️",label:"Devoluções",p:"dev"},{icon:"🔧",label:"Nova OS",p:"os"},{icon:"📦",label:"Ver Estoque",p:"estoque"},{icon:"📊",label:"Relatórios",p:"rel"}].map((a,i)=>(
              <div key={i} onClick={()=>setPage(a.p)} style={{display:"flex",alignItems:"center",gap:10,padding:"12px",background:C.surf,borderRadius:10,cursor:"pointer",border:`1px solid ${C.bdr}`}}>
                <span style={{fontSize:22}}>{a.icon}</span>
                <span style={{fontSize:12,color:C.txt2,lineHeight:1.3,fontWeight:500}}>{a.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </>
    ):(
      <>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr",gap:16}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
              <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Movimentações Recentes</span>
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("log")} style={{fontSize:11}}>Ver todas</Btn>
            </div>
            {logs.slice(0,4).map(l=>(
              <div key={l.id} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"10px 18px",borderBottom:`1px solid ${C.bdr}18`}}>
                <div style={{width:28,height:28,borderRadius:"50%",background:`${lc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,color:lc[l.tipo]||C.gold,fontWeight:700}}>{li[l.tipo]||"·"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                    <span style={{fontSize:12,fontWeight:700,color:lc[l.tipo]||C.gold}}>{l.action.toUpperCase()}</span>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,flexShrink:0}}>{l.date}</span>
                  </div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.detail}</div>
                </div>
              </div>
            ))}
          </Card>
          <Card style={{padding:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Estoque por Categoria</span>
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("rel")} style={{fontSize:11}}>Relatório</Btn>
            </div>
            <div style={{position:"relative"}}>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={catData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {catData.map((_,i)=><Cell key={i} fill={PIE[i%PIE.length]}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",textAlign:"center",pointerEvents:"none"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:18,fontWeight:800,color:C.txt}}>{fmt(totalQty)}</div>
                <div style={{fontSize:10,color:C.muted}}>Total</div>
              </div>
            </div>
            {catData.map((d,i)=>(
              <div key={d.name} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginTop:5}}>
                <div style={{display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:7,height:7,borderRadius:"50%",background:PIE[i%PIE.length]}}/>
                  <span style={{color:C.txt2}}>{d.name}</span>
                </div>
                <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{Math.round(d.value/totalQty*100)}%</span>
              </div>
            ))}
          </Card>
          <Card style={{padding:18}}>
            <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Técnicos - Consumo</div>
            {techUsage.map((t,i)=>(
              <div key={t.name} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,minWidth:16}}>{i+1}</span>
                    <span style={{fontSize:13,color:C.txt,fontWeight:500}}>{t.name}</span>
                  </div>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold,fontWeight:700}}>{fmt(t.value)}</span>
                </div>
                <div style={{height:6,background:C.bdr,borderRadius:3}}>
                  <div style={{height:"100%",width:`${(t.value/maxU)*100}%`,background:i===0?C.gold:"#555",borderRadius:3}}/>
                </div>
              </div>
            ))}
          </Card>
        </div>
        {alertasOleo.length>0&&<Card style={{padding:0,overflow:"hidden",borderLeft:`3px solid ${alertasOleo.some(a=>a.urgente)?C.red:C.ylw}`}}>
          <div style={{padding:"12px 18px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700,color:C.txt}}>⚙️ Alertas de Troca de Óleo</span>
            <Btn size="xs" color="gold" outline onClick={()=>setPage("frota")} style={{fontSize:11}}>Ver Frota</Btn>
          </div>
          <div style={{display:"flex",gap:0,flexWrap:"wrap"}}>
            {alertasOleo.map(v=>(
              <div key={v.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 18px",borderRight:`1px solid ${C.bdr}`,flex:"1 1 300px",minWidth:280}}>
                <div>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v.placa}</span>
                  <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{v.modelo}</span>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>🛣️ {fmt(v.kmAtual)} km atual</div>
                </div>
                {v.urgente?<Bdg color="red">🔴 URGENTE: faltam {fmt(v.faltam)} km</Bdg>:<Bdg color="ylw">🟡 Faltam {fmt(v.faltam)} km</Bdg>}
              </div>
            ))}
          </div>
        </Card>}
        <div style={{display:"grid",gridTemplateColumns:"1.6fr 1fr",gap:16}}>
          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",borderBottom:`1px solid ${C.bdr}`}}>
              <span style={{fontSize:14,fontWeight:700,color:C.txt}}>Itens com Baixo Nível</span>
              <Btn size="xs" color="ghost" outline onClick={()=>setPage("estoque")} style={{fontSize:11}}>Ver todos</Btn>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><THead cols={["CÓDIGO","DESCRIÇÃO","CATEGORIA","ESTOQUE","MÍNIMO","SITUAÇÃO"]}/></thead>
                <tbody>
                  {low.slice(0,5).map(s=>{const crit=s.qty<=s.min*0.6;return <TRow key={s.id} cells={[
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
                    <span style={{fontWeight:500,color:C.txt,fontSize:12}}>{s.name}</span>,
                    <span style={{fontSize:11,color:C.muted}}>{s.cat}</span>,
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:C.ylw,fontSize:13}}>{fmt(s.qty)}</span>,
                    <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{fmt(s.min)}</span>,
                    crit?<Bdg color="red">▲ Crítico</Bdg>:<Bdg color="ylw">● Baixo</Bdg>
                  ]}/>;
                  })}
                </tbody>
              </table>
            </div>
          </Card>
          <Card style={{padding:18}}>
            <div style={{fontSize:14,fontWeight:700,color:C.txt,marginBottom:14}}>Ações Rápidas</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[{icon:"📥",label:"Nova Entrada",p:"nf"},{icon:"🚀",label:"Liberar Material",p:"dist"},{icon:"↩️",label:"Devolução",p:"dev"},{icon:"🔧",label:"Nova OS",p:"os"},{icon:"📦",label:"Estoque Base",p:"estoque"},{icon:"📊",label:"Relatórios",p:"rel"}].map((a,i)=>(
                <div key={i} onClick={()=>setPage(a.p)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,padding:"12px 6px",background:C.surf,borderRadius:8,cursor:"pointer",border:`1px solid ${C.bdr}`,textAlign:"center"}}>
                  <span style={{fontSize:20}}>{a.icon}</span>
                  <span style={{fontSize:10,color:C.muted2,lineHeight:1.3}}>{a.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </>
    )}
  </div>;
}

export default Dashboard;
