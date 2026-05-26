// src/pages/DistPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function DistPage({stock,setStock,tstock,setTstock,users,addLog,currentUser,isMobile}){
  const techs=users.filter(u=>u.role==="tecnico");
  const[techId,setTechId]=useState(techs[0]?.id||"");
  const[items,setItems]=useState([]);
  const[msg,setMsg]=useState("");
  const blank=()=>({id:uid(),sid:"",qty:""});
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);

  const send=()=>{
    if(!validItems.length){setMsg("err:Adicione ao menos 1 material.");return;}
    let ok=true;
    validItems.forEach(r=>{const si=stock.find(s=>s.id===r.sid);if(!si||si.qty<parseInt(r.qty)){ok=false;alert("Estoque insuficiente: "+(si?.name||r.sid));}});
    if(!ok)return;
    setStock(p=>p.map(s=>{const it=validItems.find(r=>r.sid===s.id);return it?{...s,qty:s.qty-parseInt(it.qty)}:s;}));
    setTstock(p=>{let n=[...p];validItems.forEach(r=>{const ex=n.find(t=>t.uid===techId&&t.sid===r.sid);if(ex)n=n.map(t=>t.id===ex.id?{...t,qty:t.qty+parseInt(r.qty)}:t);else n.push({id:uid(),uid:techId,sid:r.sid,qty:parseInt(r.qty)});});return n;});
    const tech=users.find(u=>u.id===techId);
    addLog(currentUser.name,"Saída","Liberação · "+tech?.name+" · "+validItems.length+" item(s)");
    setMsg("ok:✅ Liberado para "+tech?.name+"!");
    setItems([]);
    setTimeout(()=>setMsg(""),4000);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Saída / Liberação de Materiais</h1>
    {msg&&<div style={{background:msg.startsWith("ok:")?C.grnD:C.redD,border:`1px solid ${msg.startsWith("ok:")?C.grn:C.red}44`,borderRadius:8,padding:"12px 14px",color:msg.startsWith("ok:")?C.grn:C.red,fontSize:13}}>{msg.replace(/^(ok|err):/,"")}</div>}
    <Card style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <Sel label="Técnico Destinatário" value={techId} onChange={setTechId} options={techs.map(t=>({value:t.id,label:t.name}))}/>
      <ItemList
        items={items}
        onAdd={()=>setItems(p=>[...p,blank()])}
        onUpdate={updItem}
        onRemove={remItem}
        stockOptions={stock}
        isMobile={isMobile}
        label="Materiais a Liberar"
        addLabel="Clique para adicionar o primeiro material a liberar"
      />
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn color="gold" onClick={send} disabled={validItems.length===0}>🚀 Liberar {validItems.length>0?validItems.length+" material(is)":""}</Btn>
      </div>
    </Card>
  </div>;
}

export default DistPage;
