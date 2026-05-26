// src/pages/ManutencaoPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function ManutencaoPage({manutSols,setManutSols,manutOS,setManutOS,veiculos,users,currentUser,addLog,isMobile}){
  const isMec=currentUser.role==="mecanico";
  const isAdm=currentUser.role==="admin"||currentUser.role==="superadmin";
  const[tab,setTab]=useState("sols");
  const[modalSol,setModalSol]=useState(false);
  const[modalOS,setModalOS]=useState(null);

  const blankSol=()=>({id:uid(),veiculoId:"",solicitanteId:currentUser.id,tipo:"corretiva",urgencia:"normal",descricao:"",status:"aberta",dtSol:now(),obs:""});
  const blankOS=()=>({id:uid(),solicitacaoId:"",veiculoId:"",mecanicoId:currentUser.id,tipo:"corretiva",descricao:"",kmEntrada:"",kmSaida:"",dtEntrada:new Date().toISOString().slice(0,10),dtSaida:"",pecas:[],servicos:"",status:"aberta",obs:""});
  const blankPeca=()=>({id:uid(),nome:"",qtd:"1",valor:""});

  const[formSol,setFormSol]=useState(blankSol());
  const[formOS,setFormOS]=useState(blankOS());
  const[errSol,setErrSol]=useState("");
  const[errOS,setErrOS]=useState("");

  const TYPE_OPTS=["corretiva","preventiva","revisão","elétrica","pneus","outros"];
  const URG_COLOR={normal:C.muted,alta:C.ylw,urgente:C.red};
  const STATUS_SOL_COLOR={aberta:"ylw",em_andamento:"blue",concluida:"grn",cancelada:"red"};
  const STATUS_SOL_LABEL={aberta:"⏳ Aberta",em_andamento:"🔧 Em Andamento",concluida:"✅ Concluída",cancelada:"❌ Cancelada"};
  const STATUS_OS_COLOR={aberta:"ylw",em_andamento:"blue",concluida:"grn"};
  const STATUS_OS_LABEL={aberta:"⏳ Aberta",em_andamento:"🔧 Em Andamento",concluida:"✅ Concluída"};

  const getVeic=(id)=>veiculos.find(v=>v.id===id);
  const getUser=(id)=>users.find(u=>u.id===id);
  const totalPecas=(os)=>os.pecas?.reduce((a,p)=>a+(parseFloat(p.valor)||0)*(parseInt(p.qtd)||1),0)||0;

  const salvarSol=()=>{
    if(!formSol.veiculoId){setErrSol("Selecione o veículo.");return;}
    if(!formSol.descricao.trim()){setErrSol("Descreva o problema.");return;}
    setManutSols(p=>[{...formSol,id:uid()},...p]);
    addLog(currentUser.name,"Manutenção","Solicitação: "+formSol.tipo+" · "+(getVeic(formSol.veiculoId)?.placa||"?"));
    setModalSol(false);setErrSol("");setFormSol(blankSol());
  };

  const salvarOS=()=>{
    if(!formOS.veiculoId){setErrOS("Selecione o veículo.");return;}
    if(!formOS.descricao.trim()){setErrOS("Descreva o serviço.");return;}
    if(modalOS==="new"){
      setManutOS(p=>[{...formOS,id:uid()},...p]);
      addLog(currentUser.name,"OS Mecânica","Aberta: "+(getVeic(formOS.veiculoId)?.placa||"?")+" · "+formOS.tipo);
    } else {
      setManutOS(p=>p.map(o=>o.id===modalOS?{...formOS}:o));
      addLog(currentUser.name,"OS Mecânica","Atualizada: "+(getVeic(formOS.veiculoId)?.placa||"?"));
    }
    setModalOS(null);setErrOS("");
  };

  const concluirOS=(os,kmSaida)=>{
    setManutOS(p=>p.map(o=>o.id===os.id?{...o,status:"concluida",kmSaida,dtSaida:new Date().toISOString().slice(0,10)}:o));
    if(os.solicitacaoId) setManutSols(p=>p.map(s=>s.id===os.solicitacaoId?{...s,status:"concluida"}:s));
    addLog(currentUser.name,"OS Mecânica","Concluída: "+(getVeic(os.veiculoId)?.placa||"?"));
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>🔩 Manutenção</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Solicitações e ordens de serviço</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn color="gold" size="sm" onClick={()=>{setFormSol(blankSol());setModalSol(true);setErrSol("");}}>+ Solicitação</Btn>
        {(isAdm||isMec)&&<Btn color="red" size="sm" onClick={()=>{setFormOS(blankOS());setModalOS("new");setErrOS("");}}>🔧 Nova OS</Btn>}
      </div>
    </div>

    {/* Resumo */}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:10}}>
      {[
        {l:"SOLICITAÇÕES",v:fmt(manutSols.length),i:"📋",c:C.gold},
        {l:"EM ABERTO",v:fmt(manutSols.filter(s=>s.status==="aberta").length),i:"⏳",c:C.ylw},
        {l:"OS ABERTAS",v:fmt(manutOS.filter(o=>o.status!=="concluida").length),i:"🔧",c:C.red},
        {l:"CONCLUÍDAS",v:fmt(manutOS.filter(o=>o.status==="concluida").length),i:"✅",c:C.grn},
      ].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?12:14,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${s.c}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.i}</div>
          <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.l}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:20,fontWeight:800,color:s.c}}>{s.v}</div></div>
        </Card>
      ))}
    </div>

    {/* Tabs */}
    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`}}>
      {[{k:"sols",l:"📋 Solicitações"},{k:"os",l:"🔧 Ordens de Serviço"},{k:"hist",l:"📊 Histórico"}].map(t=>(
        <div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 16px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>
      ))}
    </div>

    {/* Solicitações */}
    {tab==="sols"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {manutSols.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma solicitação ainda. Clique em "+ Solicitação".</span></Card>}
      {manutSols.map(s=>{
        const v=getVeic(s.veiculoId);
        const sol=getUser(s.solicitanteId);
        const osVinc=manutOS.find(o=>o.solicitacaoId===s.id);
        return <Card key={s.id} style={{padding:16,borderLeft:`3px solid ${C[STATUS_SOL_COLOR[s.status]]||C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <Bdg color={STATUS_SOL_COLOR[s.status]||"gold"}>{STATUS_SOL_LABEL[s.status]||s.status}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:12,color:C.txt}}>{v?.modelo||""}</span>
                {s.urgencia==="urgente"&&<Bdg color="red">🔴 URGENTE</Bdg>}
                {s.urgencia==="alta"&&<Bdg color="ylw">🟡 Alta</Bdg>}
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:4}}>🔧 {s.tipo} · {sol?.name||"?"} · {s.dtSol}</div>
              <div style={{fontSize:13,color:C.txt2}}>{s.descricao}</div>
              {osVinc&&<div style={{marginTop:8,background:C.surf,borderRadius:6,padding:"6px 10px",fontSize:11,color:C.muted}}>OS vinculada: <strong style={{color:C.gold}}>#{osVinc.id.slice(-4)}</strong> — {STATUS_OS_LABEL[osVinc.status]}</div>}
            </div>
            {(isAdm||isMec)&&s.status==="aberta"&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
              <Btn size="xs" color="gold" onClick={()=>{setFormOS({...blankOS(),solicitacaoId:s.id,veiculoId:s.veiculoId,tipo:s.tipo,descricao:s.descricao});setModalOS("new");setTab("os");}}>🔧 Criar OS</Btn>
              <Btn size="xs" color="red" outline onClick={()=>setManutSols(p=>p.map(x=>x.id===s.id?{...x,status:"cancelada"}:x))}>Cancelar</Btn>
            </div>}
          </div>
        </Card>;
      })}
    </div>}

    {/* OS */}
    {tab==="os"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {manutOS.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhuma OS. Clique em "🔧 Nova OS".</span></Card>}
      {manutOS.map(os=>{
        const v=getVeic(os.veiculoId);
        const mec=getUser(os.mecanicoId);
        const tp=totalPecas(os);
        return <Card key={os.id} style={{padding:16,borderLeft:`3px solid ${C[STATUS_OS_COLOR[os.status]]||C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
                <Bdg color={STATUS_OS_COLOR[os.status]||"gold"}>{STATUS_OS_LABEL[os.status]||os.status}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:13,color:C.txt}}>{v?.modelo||""}</span>
                <span style={{fontSize:11,color:C.muted}}>🔧 {os.tipo}</span>
              </div>
              <div style={{fontSize:12,color:C.muted,marginBottom:6}}>👨‍🔧 {mec?.name||"?"} · {os.dtEntrada}{os.dtSaida&&` → ${os.dtSaida}`}</div>
              <div style={{fontSize:13,color:C.txt2,marginBottom:6}}>{os.descricao}</div>
              <div style={{display:"flex",gap:14,fontSize:12,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>KM entrada: <strong style={{color:C.txt}}>{fmt(parseInt(os.kmEntrada)||0)}</strong></span>
                {os.kmSaida&&<span style={{fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>KM saída: <strong style={{color:C.txt}}>{fmt(parseInt(os.kmSaida)||0)}</strong></span>}
              </div>
              {os.servicos&&<div style={{fontSize:12,color:C.txt2,marginTop:4}}><strong>Serviços:</strong> {os.servicos}</div>}
              {os.pecas?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
                {os.pecas.map((p,i)=>(
                  <div key={i} style={{background:C.surf,borderRadius:6,padding:"4px 10px",fontSize:11,border:`1px solid ${C.bdr}`}}>{p.nome} ×{p.qtd}{p.valor&&<span style={{color:C.gold}}> R${(parseFloat(p.valor)*parseInt(p.qtd)).toFixed(2)}</span>}</div>
                ))}
                {tp>0&&<div style={{fontSize:12,color:C.grn,fontWeight:700,alignSelf:"center"}}>Total: R${tp.toFixed(2)}</div>}
              </div>}
            </div>
            {os.status!=="concluida"&&(isAdm||isMec)&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
              <Btn size="xs" color="gold" outline onClick={()=>{setFormOS({...os,pecas:os.pecas||[]});setModalOS(os.id);}}>Editar</Btn>
              <Btn size="xs" color="grn" onClick={()=>{const km=prompt("KM de saída:");if(km)concluirOS(os,km);}}>✅ Concluir</Btn>
            </div>}
          </div>
        </Card>;
      })}
    </div>}

    {/* Histórico por veículo */}
    {tab==="hist"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {veiculos.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum veículo cadastrado.</span></Card>}
      {veiculos.map(v=>{
        const osV=manutOS.filter(o=>o.veiculoId===v.id);
        const solV=manutSols.filter(s=>s.veiculoId===v.id);
        if(!osV.length&&!solV.length) return null;
        return <Card key={v.id} style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"12px 16px",background:C.surf,borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v.placa}</span>
              <span style={{fontSize:13,color:C.txt}}>{v.modelo} {v.ano}</span>
            </div>
            <span style={{fontSize:12,color:C.muted}}>{fmt(osV.length)} OS · {fmt(solV.length)} Sol.</span>
          </div>
          {osV.map(os=>(
            <div key={os.id} style={{padding:"10px 16px",borderBottom:`1px solid ${C.bdr}18`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:2}}>
                  <Bdg color={STATUS_OS_COLOR[os.status]||"gold"}>{STATUS_OS_LABEL[os.status]}</Bdg>
                  <span style={{fontSize:12,color:C.txt}}>{os.tipo} — {os.descricao.slice(0,50)}</span>
                </div>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>KM {fmt(parseInt(os.kmEntrada)||0)} → {os.kmSaida?fmt(parseInt(os.kmSaida)):"-"} · {os.dtEntrada}</span>
              </div>
              {totalPecas(os)>0&&<span style={{fontSize:12,color:C.grn,fontWeight:700}}>R${totalPecas(os).toFixed(2)}</span>}
            </div>
          ))}
        </Card>;
      }).filter(Boolean)}
    </div>}

    {/* Modal Solicitação */}
    {modalSol&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,maxHeight:isMobile?"92vh":"85vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>📋 Nova Solicitação</h2>
          <button onClick={()=>setModalSol(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Sel label="Veículo *" value={formSol.veiculoId} onChange={v=>setFormSol(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sel label="Tipo" value={formSol.tipo} onChange={v=>setFormSol(f=>({...f,tipo:v}))} options={TYPE_OPTS.map(t=>({value:t,label:t.charAt(0).toUpperCase()+t.slice(1)}))}/>
            <Sel label="Urgência" value={formSol.urgencia} onChange={v=>setFormSol(f=>({...f,urgencia:v}))} options={[{value:"normal",label:"Normal"},{value:"alta",label:"🟡 Alta"},{value:"urgente",label:"🔴 Urgente"}]}/>
          </div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Descrição *</label><textarea value={formSol.descricao} onChange={e=>setFormSol(f=>({...f,descricao:e.target.value}))} rows={4} placeholder="Descreva o problema..." style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/></div>
          {errSol&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errSol}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalSol(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarSol}>✅ Enviar Solicitação</Btn>
        </div>
      </div>
    </div>}

    {/* Modal OS */}
    {modalOS&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"90vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🔧 {modalOS==="new"?"Nova OS":"Editar OS"}</h2>
          <button onClick={()=>setModalOS(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Sel label="Veículo *" value={formOS.veiculoId} onChange={v=>setFormOS(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Sel label="Tipo" value={formOS.tipo} onChange={v=>setFormOS(f=>({...f,tipo:v}))} options={TYPE_OPTS.map(t=>({value:t,label:t.charAt(0).toUpperCase()+t.slice(1)}))}/>
            <Sel label="Status" value={formOS.status} onChange={v=>setFormOS(f=>({...f,status:v}))} options={Object.entries(STATUS_OS_LABEL).map(([k,l])=>({value:k,label:l}))}/>
          </div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Problema / Descrição *</label><textarea value={formOS.descricao} onChange={e=>setFormOS(f=>({...f,descricao:e.target.value}))} rows={3} style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif",marginBottom:10}}/></div>
          <div><label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Serviços Executados</label><textarea value={formOS.servicos} onChange={e=>setFormOS(f=>({...f,servicos:e.target.value}))} rows={2} placeholder="Ex: Troca de óleo..." style={{width:"100%",background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/></div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr",gap:10}}>
            <Inp label="KM Entrada" value={formOS.kmEntrada} onChange={v=>setFormOS(f=>({...f,kmEntrada:v}))} type="number" placeholder="45000"/>
            <Inp label="KM Saída" value={formOS.kmSaida} onChange={v=>setFormOS(f=>({...f,kmSaida:v}))} type="number" placeholder="45050"/>
            <Inp label="Data Entrada" value={formOS.dtEntrada} onChange={v=>setFormOS(f=>({...f,dtEntrada:v}))} type="date"/>
            <Inp label="Data Saída" value={formOS.dtSaida} onChange={v=>setFormOS(f=>({...f,dtSaida:v}))} type="date"/>
          </div>
          {/* Peças */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase"}}>🔩 Peças Utilizadas</span>
              <Btn size="xs" color="gold" onClick={()=>setFormOS(f=>({...f,pecas:[...f.pecas,blankPeca()]}))}>+ Peça</Btn>
            </div>
            {formOS.pecas?.length===0&&<div style={{color:C.muted,fontSize:12,textAlign:"center",padding:"8px 0"}}>Nenhuma peça</div>}
            {formOS.pecas?.map((p,i)=>(
              <div key={p.id} style={{display:"grid",gridTemplateColumns:"2fr 70px 100px 30px",gap:8,alignItems:"end",marginBottom:8}}>
                <Inp label={i===0?"Nome":"_"} value={p.nome} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,nome:v}:x)}))} placeholder="Nome da peça"/>
                <Inp label={i===0?"Qtd":"_"} value={p.qtd} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,qtd:v}:x)}))} type="number"/>
                <Inp label={i===0?"Valor R$":"_"} value={p.valor} onChange={v=>setFormOS(f=>({...f,pecas:f.pecas.map((x,j)=>j===i?{...x,valor:v}:x)}))} type="number"/>
                <button onClick={()=>setFormOS(f=>({...f,pecas:f.pecas.filter((_,j)=>j!==i)}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,height:36,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:2}}>✕</button>
              </div>
            ))}
            {formOS.pecas?.length>0&&<div style={{textAlign:"right",fontSize:12,color:C.grn,fontWeight:700}}>Total: R${totalPecas(formOS).toFixed(2)}</div>}
          </div>
          <Inp label="Observações" value={formOS.obs} onChange={v=>setFormOS(f=>({...f,obs:v}))} placeholder="Observações"/>
          {errOS&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errOS}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalOS(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarOS}>✅ Salvar OS</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

export default ManutencaoPage;
