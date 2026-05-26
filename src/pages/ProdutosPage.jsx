// src/pages/ProdutosPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function ProdutosPage({produtos,setProdutos,cats,isMobile}){
  const[q,setQ]=useState("");
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({code:"",name:"",cat:"",unit:"un",desc:""});
  const filtered=produtos.filter(p=>p.name.toLowerCase().includes(q.toLowerCase())||p.code.toLowerCase().includes(q.toLowerCase()));
  const save=()=>{
    if(!form.name.trim())return;
    if(modal==="new")setProdutos(p=>[...p,{id:uid(),...form,name:form.name.trim()}]);
    else setProdutos(p=>p.map(x=>x.id===modal?{...x,...form,name:form.name.trim()}:x));
    setModal(null);
  };
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Produtos</h1><p style={{fontSize:12,color:C.muted,marginTop:2}}>Cadastro de produtos e materiais</p></div>
      <div style={{display:"flex",gap:8,width:isMobile?"100%":"auto"}}>
        <Inp value={q} onChange={setQ} placeholder="🔍 Buscar produto..." style={{flex:1}}/>
        <Btn size="sm" color="gold" onClick={()=>{setForm({code:"",name:"",cat:cats[0]?.name||"",unit:"un",desc:""});setModal("new");}}>+ Novo</Btn>
      </div>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(p=>(
          <Card key={p.id} style={{padding:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:700,color:C.txt,marginBottom:2}}>{p.name}</div>
                <div style={{fontSize:11,color:C.muted}}>{p.code} · {p.cat} · {p.unit}</div>
                {p.desc&&<div style={{fontSize:11,color:C.muted2,marginTop:4}}>{p.desc}</div>}
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:10}}>
                <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:p.code,name:p.name,cat:p.cat,unit:p.unit,desc:p.desc||""});setModal(p.id);}}>✏️</Btn>
                <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${p.name}"?`))setProdutos(x=>x.filter(i=>i.id!==p.id));}}>✕</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["CÓDIGO","NOME DO PRODUTO","CATEGORIA","UNIDADE","DESCRIÇÃO","AÇÕES"]}/></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={6} style={{padding:30,textAlign:"center",color:C.muted}}>Nenhum produto cadastrado.</td></tr>
              :filtered.map(p=>(
                <TRow key={p.id} cells={[
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{p.code}</span>,
                  <span style={{fontWeight:600,color:C.txt}}>{p.name}</span>,
                  <Bdg color="muted">{p.cat}</Bdg>,
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{p.unit}</span>,
                  <span style={{fontSize:11,color:C.muted}}>{p.desc||"—"}</span>,
                  <div style={{display:"flex",gap:6}}>
                    <Btn size="xs" color="gold" outline onClick={()=>{setForm({code:p.code,name:p.name,cat:p.cat,unit:p.unit,desc:p.desc||""});setModal(p.id);}}>Editar</Btn>
                    <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Remover "${p.name}"?`))setProdutos(x=>x.filter(i=>i.id!==p.id));}}>✕</Btn>
                  </div>
                ]}/>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    )}
    {modal&&<Modal title={modal==="new"?"Novo Produto":"Editar Produto"} onClose={()=>setModal(null)} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Código" value={form.code} onChange={v=>setForm(f=>({...f,code:v}))} placeholder="ONU-001"/>
          <Inp label="Nome do Produto *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))} placeholder="Ex: ONU Huawei HG8145V5"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Sel label="Categoria" value={form.cat} onChange={v=>setForm(f=>({...f,cat:v}))} options={cats.map(c=>({value:c.name,label:`${c.icon} ${c.name}`}))}/>
          <Inp label="Unidade" value={form.unit} onChange={v=>setForm(f=>({...f,unit:v}))} placeholder="un, m, rolo, pç..."/>
        </div>
        <Inp label="Descrição" value={form.desc} onChange={v=>setForm(f=>({...f,desc:v}))} placeholder="Descrição opcional do produto"/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar Produto</Btn>
        </div>
      </div>
    </Modal>}
  </div>;
}

export default ProdutosPage;
