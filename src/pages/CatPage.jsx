// src/pages/CatPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function CatPage({cats,setCats,isMobile}){
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({name:"",icon:"📦"});
  const[editId,setEditId]=useState(null);
  const icons=["📦","🔌","🔧","📡","🛠️","💡","🔩","🗃️","📋","⚙️","🔗","🏷️"];
  const save=()=>{
    if(!form.name.trim())return;
    if(editId){setCats(p=>p.map(c=>c.id===editId?{...c,...form}:c));}
    else{setCats(p=>[...p,{id:uid(),name:form.name.trim(),icon:form.icon}]);}
    setModal(false);setForm({name:"",icon:"📦"});setEditId(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Categorias</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Gerencie as categorias de materiais</p></div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setForm({name:"",icon:"📦"});setEditId(null);setModal(true);}}>+ Nova Categoria</Btn>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
      {cats.map(c=>(
        <Card key={c.id} style={{padding:16,display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:44,height:44,borderRadius:10,background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>{c.icon}</div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:14,fontWeight:600,color:C.txt,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</div>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Categoria ativa</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:4,flexShrink:0}}>
            <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:c.name,icon:c.icon});setEditId(c.id);setModal(true);}}>✏️</Btn>
            <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${c.name}"?`))setCats(p=>p.filter(x=>x.id!==c.id));}}>✕</Btn>
          </div>
        </Card>
      ))}
    </div>
    {modal&&<Modal title={editId?"Editar Categoria":"Nova Categoria"} onClose={()=>{setModal(false);setEditId(null);}} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Inp label="Nome da Categoria *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Ex: Equipamentos"/>
        <div>
          <label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",display:"block",marginBottom:8}}>Ícone</label>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {icons.map(ic=>(
              <div key={ic} onClick={()=>setForm(f=>({...f,icon:ic}))}
                style={{width:40,height:40,borderRadius:8,background:form.icon===ic?`${C.gold}33`:C.surf,border:`2px solid ${form.icon===ic?C.gold:C.bdr}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,cursor:"pointer"}}>
                {ic}
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>{setModal(false);setEditId(null);}}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

export default CatPage;
