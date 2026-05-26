// src/pages/DevPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function DevPage({returns,setReturns,tstock,setTstock,stock,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[items,setItems]=useState([]);
  const[notes,setNotes]=useState("");
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const blank=()=>({id:uid(),sid:"",qty:""});
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const viewRet=isTec?returns.filter(r=>r.uid===currentUser.id):returns;
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);

  const submit=()=>{
    if(!validItems.length)return;
    setReturns(p=>[{id:uid(),uid:currentUser.id,date:now(),items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),status:"pending",notes,rDate:null,rBy:null},...p]);
    addLog(currentUser.name,"Devolução Solicitada",currentUser.name+" · "+validItems.length+" item(s)");
    setModal(false);setItems([]);setNotes("");
  };

  const approve=(r)=>{
    setTstock(p=>p.map(t=>{const it=r.items.find(i=>i.sid===t.sid&&t.uid===r.uid);return it?{...t,qty:Math.max(0,t.qty-it.qty)}:t;}));
    setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"approved",rDate:now(),rBy:currentUser.name}:x));
    addLog(currentUser.name,"Devolução Aprovada","Técnico: "+(users.find(u=>u.id===r.uid)?.name));
  };

  const sc={pending:"ylw",approved:"grn",rejected:"red"};
  const sl={pending:"⏳ Pendente",approved:"✅ Aprovada",rejected:"❌ Rejeitada"};

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Devoluções</h1>
      {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setItems([]);setNotes("");setModal(true);}}>↩ Solicitar Devolução</Btn>}
    </div>

    {viewRet.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted,fontSize:13}}>Nenhuma devolução registrada.</span></Card>}
    {viewRet.map(r=>{
      const tech=users.find(u=>u.id===r.uid);
      return <Card key={r.id} style={{padding:16,borderLeft:`3px solid ${r.status==="pending"?C.ylw:r.status==="approved"?C.grn:C.red}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:10}}>
              <Bdg color={sc[r.status]}>{sl[r.status]}</Bdg>
              <span style={{fontSize:13,fontWeight:700,color:C.txt}}>{tech?.name||"?"}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{r.date}</span>
            </div>
            {r.notes&&<div style={{fontSize:12,color:C.muted,marginBottom:8,fontStyle:"italic"}}>"{r.notes}"</div>}
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
              {r.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
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
            {r.rBy&&<div style={{fontSize:11,color:C.muted,marginTop:8}}>{sl[r.status]} por <strong style={{color:C.txt2}}>{r.rBy}</strong> em {r.rDate}</div>}
          </div>
          {!isTec&&r.status==="pending"&&<div style={{display:"flex",flexDirection:"column",gap:8,flexShrink:0}}>
            <Btn size="sm" color="grn" onClick={()=>approve(r)}>✓ Aprovar</Btn>
            <Btn size="sm" color="red" outline onClick={()=>setReturns(p=>p.map(x=>x.id===r.id?{...x,status:"rejected",rDate:now(),rBy:currentUser.name}:x))}>✕ Rejeitar</Btn>
          </div>}
        </div>
      </Card>;
    })}

    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,maxHeight:isMobile?"92vh":"85vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>↩ Solicitar Devolução</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) selecionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <Inp label="Observação" value={notes} onChange={setNotes} placeholder="Ex: Sobrou do serviço, OS-001..."/>
          <ItemList
            items={items}
            onAdd={()=>setItems(p=>[...p,blank()])}
            onUpdate={updItem}
            onRemove={remItem}
            stockOptions={myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{...s,qty:t.qty}:null;}).filter(Boolean)}
            isMobile={isMobile}
            label="Materiais a Devolver"
            addLabel="Clique para adicionar o primeiro material a devolver"
          />
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={submit} disabled={validItems.length===0}>📤 Enviar {validItems.length>0?validItems.length+" item(is)":""}</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

export default DevPage;
