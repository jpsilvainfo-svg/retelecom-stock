// src/pages/EstoquePage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function EstoquePage({stock,setStock,isAdmin,addLog,currentUser,isMobile}){
  const[q,setQ]=useState("");
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({code:"",name:"",cat:"Equipamentos",unit:"un",qty:"",min:""});
  const cats=["Equipamentos","Cabos e Fios","Conectores","Caixas e Acessórios","Acessórios","Ferramentas"];
  const filtered=stock.filter(s=>s.name.toLowerCase().includes(q.toLowerCase())||s.code.toLowerCase().includes(q.toLowerCase()));
  const save=()=>{
    if(!form.name||!form.qty)return;
    if(modal==="new")setStock(p=>[...p,{id:uid(),code:form.code,name:form.name,cat:form.cat,unit:form.unit,qty:parseInt(form.qty)||0,min:parseInt(form.min)||0}]);
    else setStock(p=>p.map(s=>s.id===modal?{...s,...form,qty:parseInt(form.qty)||0,min:parseInt(form.min)||0}:s));
    addLog(currentUser.name,modal==="new"?"Entrada":"Edição",form.name);
    setModal(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Estoque Base</h1></div>
      <div style={{display:"flex",gap:8,width:isMobile?"100%":"auto"}}>
        <Inp value={q} onChange={setQ} placeholder="🔍 Buscar..." style={{flex:1}}/>
        {isAdmin&&<Btn onClick={()=>{setForm({code:"",name:"",cat:"Equipamentos",unit:"un",qty:"",min:""});setModal("new");}} size="sm">+ Novo</Btn>}
      </div>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return(
          <Card key={s.id} style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:600,color:C.txt,marginBottom:2}}>{s.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{s.code} · {s.cat} · {s.unit}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0,marginLeft:10}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:crit?C.red:low?C.ylw:C.txt,fontSize:22}}>{fmt(s.qty)}</span>
                {crit?<Bdg color="red">Crítico</Bdg>:low?<Bdg color="ylw">Baixo</Bdg>:<Bdg color="grn">OK</Bdg>}
                {isAdmin&&<Btn size="xs" color="gold" outline onClick={()=>{setForm({code:s.code,name:s.name,cat:s.cat,unit:s.unit,qty:String(s.qty),min:String(s.min)});setModal(s.id);}}>Editar</Btn>}
              </div>
            </div>
            <div style={{marginTop:8,height:4,background:C.bdr,borderRadius:2}}>
              <div style={{height:"100%",width:`${Math.min(100,(s.qty/Math.max(s.min,1))*100)}%`,background:crit?C.red:low?C.ylw:C.grn,borderRadius:2}}/>
            </div>
            <div style={{fontSize:10,color:C.muted,marginTop:4}}>Mínimo: {s.min} {s.unit}</div>
          </Card>
        );})}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","DESCRIÇÃO","CATEGORIA","UNID.","QTD ATUAL","QTD MÍN.","SITUAÇÃO",isAdmin?"AÇÕES":""]}/></thead>
            <tbody>
              {filtered.map(s=>{const crit=s.qty<=s.min*0.6;const low=s.qty<=s.min;return <TRow key={s.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.code}</span>,
                <span style={{fontWeight:500,color:C.txt}}>{s.name}</span>,
                <span style={{fontSize:12,color:C.muted}}>{s.cat}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{s.unit}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:crit?C.red:low?C.ylw:C.txt,fontSize:14}}>{fmt(s.qty)}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{fmt(s.min)}</span>,
                crit?<Bdg color="red">▲ Crítico</Bdg>:low?<Bdg color="ylw">● Baixo</Bdg>:<Bdg color="grn">✓ OK</Bdg>,
                isAdmin?<div style={{display:"flex",gap:6}}>
                  <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:s.code,name:s.name,cat:s.cat,unit:s.unit,qty:String(s.qty),min:String(s.min)});setModal(s.id);}}>Editar</Btn>
                  <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${s.name}"?`)){setStock(p=>p.filter(x=>x.id!==s.id));addLog(currentUser.name,"Remoção",s.name);}}}>✕</Btn>
                </div>:<span/>
              ]}/>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
    )}
    {modal&&<Modal title={modal==="new"?"Novo Item":"Editar Item"} onClose={()=>setModal(null)} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Código" value={form.code} onChange={v=>setForm(f=>({...f,code:v}))} placeholder="ONU-001"/>
          <Sel label="Categoria" value={form.cat} onChange={v=>setForm(f=>({...f,cat:v}))} options={cats.map(c=>({value:c,label:c}))}/>
        </div>
        <Inp label="Nome do Material *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <Inp label="Unidade" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))}/>
          <Inp label="Quantidade *" value={form.qty} onChange={v=>setForm(f=>({...f,qty:v}))} type="number"/>
          <Inp label="Qtd Mínima" value={form.min} onChange={v=>setForm(f=>({...f,min:v}))} type="number"/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

export default EstoquePage;
