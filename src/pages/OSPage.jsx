// src/pages/OSPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function OSPage({os,setOs,tstock,setTstock,stock,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const[modal,setModal]=useState(false);
  const[osNum,setOsNum]=useState("");
  const[client,setClient]=useState("");
  const[notes,setNotes]=useState("");
  const[items,setItems]=useState([]);
  const[err,setErr]=useState("");
  const blank=()=>({id:uid(),sid:"",qty:""});
  const myTstock=tstock.filter(t=>t.uid===currentUser.id);
  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const viewOs=isTec?os.filter(o=>o.uid===currentUser.id):os;
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);
  const myStockOpts=myTstock.map(t=>{const s=stock.find(x=>x.id===t.sid);return s?{...s,qty:t.qty}:null;}).filter(Boolean);

  const save=()=>{
    if(!osNum.trim()){setErr("Informe o número da OS.");return;}
    if(!client.trim()){setErr("Informe o nome do cliente.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 material.");return;}
    let ok=true;
    validItems.forEach(r=>{const ts=myTstock.find(t=>t.sid===r.sid);if(!ts||ts.qty<parseInt(r.qty)){ok=false;setErr("Qtd insuficiente: "+(stock.find(s=>s.id===r.sid)?.name));}});
    if(!ok)return;
    setOs(p=>[{id:uid(),uid:currentUser.id,os:osNum.trim(),client:client.trim(),date:now(),items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty)})),notes},...p]);
    setTstock(p=>p.map(t=>{const it=validItems.find(r=>r.sid===t.sid&&t.uid===currentUser.id);return it?{...t,qty:t.qty-parseInt(it.qty)}:t;}));
    addLog(currentUser.name,"Saída","OS: "+osNum.trim()+" · "+client.trim());
    setModal(false);setErr("");setOsNum("");setClient("");setNotes("");setItems([]);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Ordens de Serviço</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Registro de materiais utilizados por OS</p>
      </div>
      {isTec&&<Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setItems([]);setOsNum("");setClient("");setNotes("");setErr("");setModal(true);}}>+ Nova OS</Btn>}
    </div>

    {viewOs.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted,fontSize:13}}>Nenhuma OS registrada.</span></Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {viewOs.map(o=>{
        const tech=users.find(u=>u.id===o.uid);
        return <Card key={o.id} style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8,marginBottom:12}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:15}}>{o.os}</span>
                <span style={{fontSize:14,fontWeight:700,color:C.txt}}>{o.client}</span>
                {!isTec&&<span style={{fontSize:12,color:C.muted}}>· {tech?.name||"?"}</span>}
              </div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,marginTop:4}}>{o.date}</div>
              {o.notes&&<div style={{fontSize:12,color:C.muted,marginTop:4,fontStyle:"italic"}}>📝 {o.notes}</div>}
            </div>
            <Bdg color="grn">✓ Concluída</Bdg>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",marginBottom:8}}>Materiais Utilizados</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
            {o.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
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
        </Card>;
      })}
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:600,maxHeight:isMobile?"92vh":"88vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🔧 Nova OS</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} material(is) adicionado(s)</div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Inp label="Nº da OS *" value={osNum} onChange={setOsNum} placeholder="OS-20250523001"/>
            <Inp label="Cliente *" value={client} onChange={setClient} placeholder="Nome do cliente"/>
          </div>
          <Inp label="Observação / Tipo de Serviço" value={notes} onChange={setNotes} placeholder="Ex: Instalação FTTH, Manutenção..."/>
          <ItemList
            items={items}
            onAdd={()=>setItems(p=>[...p,blank()])}
            onUpdate={updItem}
            onRemove={remItem}
            stockOptions={myStockOpts}
            isMobile={isMobile}
            label="Materiais Utilizados"
            addLabel="Clique para adicionar o primeiro material utilizado"
          />
          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"flex-end",gap:10}}>
          <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={save} disabled={validItems.length===0}>✅ Confirmar Baixa</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

export default OSPage;
