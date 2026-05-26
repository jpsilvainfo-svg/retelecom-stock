// src/pages/SolicitacaoPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function SolicitacaoPage({solicitacoes,setSolicitacoes,stock,setStock,tstock,setTstock,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[items,setItems]=useState([]);
  const[urgencia,setUrgencia]=useState("normal");
  const[notes,setNotes]=useState("");
  const[msg,setMsg]=useState("");

  const viewSol=isTec?solicitacoes.filter(s=>s.uid===currentUser.id):solicitacoes;
  const pendentes=solicitacoes.filter(s=>s.status==="pending");

  const abrirModal=()=>{setItems([]);setUrgencia("normal");setNotes("");setModal(true);};

  const addItem=()=>setItems(p=>[...p,{id:uid(),sid:"",qty:""}]);
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));

  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);

  const enviar=()=>{
    if(!validItems.length){setMsg("err:Adicione ao menos 1 material.");return;}
    setSolicitacoes(p=>[{id:uid(),uid:currentUser.id,date:now(),
      items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),
      status:"pending",urgencia,notes,rDate:null,rBy:null},...p]);
    addLog(currentUser.name,"Solicitação",currentUser.name+" solicitou "+validItems.length+" item(s)");
    setModal(false);
    setMsg("ok:Solicitação enviada!");
    setTimeout(()=>setMsg(""),4000);
  };

  const confirmar=(sol)=>{
    let ok=true;
    sol.items.forEach(it=>{const s=stock.find(x=>x.id===it.sid);if(!s||s.qty<it.qty){ok=false;alert("Estoque insuficiente: "+(s?.name||it.sid));}});
    if(!ok)return;
    setStock(p=>p.map(s=>{const it=sol.items.find(i=>i.sid===s.id);return it?{...s,qty:s.qty-it.qty}:s;}));
    setTstock(p=>{let n=[...p];sol.items.forEach(it=>{const ex=n.find(t=>t.uid===sol.uid&&t.sid===it.sid);if(ex)n=n.map(t=>t.id===ex.id?{...t,qty:t.qty+it.qty}:t);else n.push({id:uid(),uid:sol.uid,sid:it.sid,qty:it.qty});});return n;});
    setSolicitacoes(p=>p.map(s=>s.id===sol.id?{...s,status:"confirmed",rDate:now(),rBy:currentUser.name}:s));
    addLog(currentUser.name,"Saída","Solicitação confirmada · "+(users.find(u=>u.id===sol.uid)?.name));
  };

  const rejeitar=(sol)=>{
    setSolicitacoes(p=>p.map(s=>s.id===sol.id?{...s,status:"rejected",rDate:now(),rBy:currentUser.name}:s));
    addLog(currentUser.name,"Solicitação Rejeitada","Técnico: "+(users.find(u=>u.id===sol.uid)?.name));
  };

  const sc={pending:"ylw",confirmed:"grn",rejected:"red"};
  const sl={pending:"⏳ Aguardando",confirmed:"✅ Confirmada",rejected:"❌ Rejeitada"};
  const urg={normal:{label:"Normal",color:C.muted},alta:{label:"🟡 Alta",color:C.ylw},urgente:{label:"🔴 Urgente",color:C.red}};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Solicitações de Material</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>{isTec?"Solicite materiais ao estoque":"Gerencie pedidos dos técnicos"}</p>
      </div>
      <div style={{display:"flex",gap:10,alignItems:"center"}}>
        {!isTec&&pendentes.length>0&&<Bdg color="ylw">🔔 {pendentes.length} pendente{pendentes.length>1?"s":""}</Bdg>}
        {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={abrirModal}>📋 Nova Solicitação</Btn>}
      </div>
    </div>

    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}

    {viewSol.length===0&&<Card style={{padding:40,textAlign:"center"}}>
      <div style={{fontSize:32,marginBottom:10}}>📋</div>
      <div style={{fontSize:14,color:C.muted}}>{isTec?"Nenhuma solicitação ainda. Clique em Nova Solicitação!":"Nenhuma solicitação recebida."}</div>
    </Card>}

    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {viewSol.map(sol=>{
        const tech=users.find(u=>u.id===sol.uid);
        const isUrg=sol.urgencia==="urgente";
        return <Card key={sol.id} style={{padding:16,borderLeft:`3px solid ${sol.status==="pending"?isUrg?C.red:C.ylw:sol.status==="confirmed"?C.grn:C.red}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:10}}>
                <Bdg color={sc[sol.status]}>{sl[sol.status]}</Bdg>
                {sol.urgencia!=="normal"&&<span style={{fontSize:11,fontWeight:700,color:urg[sol.urgencia]?.color}}>{urg[sol.urgencia]?.label}</span>}
                <span style={{fontSize:13,fontWeight:700,color:C.txt}}>👷 {tech?.name||"?"}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{sol.date}</span>
              </div>
              {sol.notes&&<div style={{fontSize:12,color:C.muted,marginBottom:10,fontStyle:"italic"}}>"{sol.notes}"</div>}
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
                {sol.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
                  <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"—"}</div>
                    <div style={{fontSize:12,fontWeight:600,color:C.txt,lineHeight:1.3,marginTop:2}}>{s?.name||"?"}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                      <span style={{fontSize:10,color:C.muted}}>{s?.unit||""}</span>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>{fmt(it.qty)}</span>
                    </div>
                  </div>
                );})}
              </div>
              {sol.rBy&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>Resolvido por <strong style={{color:C.txt2}}>{sol.rBy}</strong> em {sol.rDate}</div>}
            </div>
            {!isTec&&sol.status==="pending"&&<div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
              <Btn size="sm" color="grn" onClick={()=>confirmar(sol)}>✓ Confirmar</Btn>
              <Btn size="sm" color="red" outline onClick={()=>rejeitar(sol)}>✕ Rejeitar</Btn>
            </div>}
          </div>
        </Card>;
      })}
    </div>

    {/* Modal — layout limpo com botão adicionar */}
    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,
        borderRadius:isMobile?"16px 16px 0 0":12,
        width:"100%",maxWidth:600,
        height:isMobile?"95vh":"auto",
        maxHeight:isMobile?"95vh":"88vh",
        display:"flex",flexDirection:"column",
        position:isMobile?"absolute":"relative",
        bottom:isMobile?0:"auto"}}>

        {/* Header */}
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>📋 Nova Solicitação</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) adicionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        {/* Body scroll */}
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>

          {/* Urgência e obs */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="Urgência" value={urgencia} onChange={setUrgencia} options={[{value:"normal",label:"Normal"},{value:"alta",label:"🟡 Alta Prioridade"},{value:"urgente",label:"🔴 Urgente"}]}/>
            <Inp label="Observação" value={notes} onChange={setNotes} placeholder="Ex: Para OS de amanhã..."/>
          </div>

          {/* Lista de materiais adicionados */}
          {items.length>0&&<div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:4}}>
              Materiais da Solicitação
            </div>
            {items.map((it,idx)=>{
              const s=it.sid?stock.find(x=>x.id===it.sid):null;
              return <div key={it.id} style={{
                display:"flex",alignItems:"center",gap:8,
                background:it.sid?`${C.gold}08`:C.surf,
                borderRadius:10,padding:"10px 12px",
                border:`1px solid ${it.sid?`${C.gold}44`:C.bdr2}`}}>
                {/* Número */}
                <div style={{width:24,height:24,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold,flexShrink:0}}>{idx+1}</div>
                {/* Select material */}
                <div style={{flex:1,minWidth:0}}>
                  <select value={it.sid} onChange={e=>updItem(it.id,"sid",e.target.value)}
                    style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
                    <option value="">— Selecionar material —</option>
                    {stock.map(s=><option key={s.id} value={s.id}>[{s.code||"—"}] {s.name} ({s.qty} {s.unit})</option>)}
                  </select>
                  {s&&<div style={{fontSize:10,color:C.grn,marginTop:3}}>✓ Disponível: {s.qty} {s.unit}</div>}
                </div>
                {/* Qtd */}
                <input type="number" value={it.qty} onChange={e=>updItem(it.id,"qty",e.target.value)}
                  placeholder="Qtd" min="0"
                  style={{width:70,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:14,fontWeight:700,textAlign:"center",flexShrink:0}}/>
                {/* Remover */}
                <button onClick={()=>remItem(it.id)}
                  style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:32,height:32,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              </div>;
            })}
          </div>}

          {/* Botão adicionar material — bem destacado */}
          <button onClick={addItem} style={{
            width:"100%",padding:"14px",
            background:items.length===0?`${C.gold}22`:"transparent",
            border:`2px dashed ${C.gold}`,
            borderRadius:10,color:C.gold,
            cursor:"pointer",fontSize:14,fontWeight:700,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
            transition:"all .2s"}}>
            <span style={{fontSize:22,lineHeight:1}}>+</span>
            {items.length===0?"Clique aqui para adicionar o primeiro material":"Adicionar mais um material"}
          </button>

          {items.length===0&&<div style={{textAlign:"center",fontSize:12,color:C.muted2,marginTop:-4}}>
            Adicione os materiais um por um e envie tudo junto no final
          </div>}

        </div>

        {/* Footer fixo */}
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div style={{fontSize:13,color:C.muted}}>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:18}}>{validItems.length}</span> material(is)
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={enviar} disabled={validItems.length===0}>📤 Enviar Solicitação</Btn>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

export default SolicitacaoPage;
