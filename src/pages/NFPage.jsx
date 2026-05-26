// src/pages/NFPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function NFPage({nf,setNf,stock,setStock,addLog,currentUser,isMobile}){
  const CATS=["Equipamentos","Cabos e Fios","Conectores","Caixas e Acessórios","Acessórios","Ferramentas"];
  const blank=()=>({id:uid(),sid:"",qty:"",val:""});
  const[modal,setModal]=useState(false);
  const[form,setForm]=useState({num:"",supplier:"",date:"",obs:""});
  const[items,setItems]=useState([]);
  const[novoMat,setNovoMat]=useState(null);
  const[formNM,setFormNM]=useState({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});
  const[err,setErr]=useState("");

  const updItem=(id,k,v)=>setItems(p=>p.map(r=>r.id===id?{...r,[k]:v}:r));
  const remItem=(id)=>setItems(p=>p.filter(r=>r.id!==id));
  const validItems=items.filter(r=>r.sid&&parseInt(r.qty)>0);
  const totalPreview=items.reduce((a,r)=>a+(parseFloat(r.val)||0),0);

  const salvarNM=()=>{
    if(!formNM.name.trim())return;
    const nm={id:uid(),code:formNM.code,name:formNM.name.trim(),cat:formNM.cat,unit:formNM.unit,qty:0,min:parseInt(formNM.min)||0};
    setStock(p=>[...p,nm]);
    updItem(novoMat,"sid",nm.id);
    addLog(currentUser.name,"Novo Material","Via NF: "+nm.name);
    setNovoMat(null);
    setFormNM({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});
  };

  const abrirModal=()=>{setForm({num:"",supplier:"",date:"",obs:""});setItems([]);setErr("");setNovoMat(null);setModal(true);};

  const save=()=>{
    if(!form.num.trim()){setErr("Informe o número da NF.");return;}
    if(!form.supplier.trim()){setErr("Informe o fornecedor.");return;}
    if(!validItems.length){setErr("Adicione ao menos 1 item com material e quantidade.");return;}
    const total=validItems.reduce((a,r)=>a+(parseFloat(r.val)||0),0);
    setNf(p=>[{id:uid(),num:form.num.trim(),supplier:form.supplier.trim(),date:form.date,obs:form.obs,
      items:validItems.map(r=>({sid:r.sid,qty:parseInt(r.qty),val:parseFloat(r.val)||0})),
      total,registeredBy:currentUser.name,registeredAt:now()},...p]);
    setStock(p=>p.map(s=>{const it=validItems.find(r=>r.sid===s.id);return it?{...s,qty:s.qty+parseInt(it.qty)}:s;}));
    addLog(currentUser.name,"Entrada","NF: "+form.num.trim()+" · "+form.supplier.trim()+" · "+validItems.length+" item(s)");
    setModal(false);
  };

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Entrada de Materiais</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Registro de notas fiscais com entrada automática no estoque</p>
      </div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={abrirModal}>+ Nova NF</Btn>
    </div>

    {nf.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{fontSize:13,color:C.muted}}>Nenhuma nota fiscal registrada ainda.</span></Card>}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {nf.map(n=>(
        <Card key={n.id} style={{padding:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:10}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:15}}>{n.num}</span>
                <span style={{fontSize:13,color:C.txt,fontWeight:600}}>{n.supplier}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{n.date}</span>
                {n.registeredBy&&<span style={{fontSize:11,color:C.muted}}>· {n.registeredBy}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6,marginBottom:6}}>
                {n.items.map((it,i)=>{const s=stock.find(x=>x.id===it.sid);return(
                  <div key={i} style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                    <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{s?.code||"—"}</div>
                    <div style={{fontSize:12,fontWeight:600,color:C.txt,lineHeight:1.3,marginTop:2}}>{s?.name||"?"}</div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:4}}>
                      <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:C.grn,fontSize:13}}>+{fmt(it.qty)} {s?.unit||""}</span>
                      {it.val>0&&<span style={{fontSize:10,color:C.muted}}>R${fmt(it.val)}</span>}
                    </div>
                  </div>
                );})}
              </div>
              {n.obs&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>📝 {n.obs}</div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:10,color:C.muted}}>TOTAL</div>
              <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:22,fontWeight:800,color:C.grn}}>R$ {fmt(n.total)}</div>
              <div style={{fontSize:10,color:C.muted}}>{n.items.length} item(s)</div>
            </div>
          </div>
        </Card>
      ))}
    </div>

    {modal&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"90vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>📥 Nova Nota Fiscal</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>{validItems.length} item(s) · Total: <span style={{color:C.grn,fontWeight:700}}>R$ {fmt(totalPreview)}</span></div>
          </div>
          <button onClick={()=>setModal(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".08em",marginBottom:10}}>📄 DADOS DA NOTA FISCAL</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <Inp label="Número da NF *" value={form.num} onChange={v=>setForm(f=>({...f,num:v}))} placeholder="Ex: NF-1259"/>
              <Inp label="Fornecedor / Empresa *" value={form.supplier} onChange={v=>setForm(f=>({...f,supplier:v}))} placeholder="Nome do fornecedor"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Data da Compra" value={form.date} onChange={v=>setForm(f=>({...f,date:v}))} type="date"/>
              <Inp label="Observação" value={form.obs} onChange={v=>setForm(f=>({...f,obs:v}))} placeholder="Opcional"/>
            </div>
          </div>

          {/* Itens usando ItemList + botão novo material inline */}
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:2}}>
              Itens da Nota <span style={{background:`${C.gold}22`,color:C.gold,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:6}}>{validItems.length} item(s)</span>
            </div>
            {items.map((it,idx)=>{
              const s=it.sid?stock.find(x=>x.id===it.sid):null;
              return <div key={it.id} style={{display:"flex",alignItems:"flex-start",gap:8,background:it.sid?`${C.gold}08`:C.surf,borderRadius:10,padding:"10px 12px",border:`1px solid ${it.sid?`${C.gold}44`:C.bdr2}`}}>
                <div style={{width:24,height:24,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold,flexShrink:0,marginTop:2}}>{idx+1}</div>
                <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <select value={it.sid} onChange={e=>updItem(it.id,"sid",e.target.value)}
                      style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"9px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
                      <option value="">— Selecionar material —</option>
                      {stock.map(s=><option key={s.id} value={s.id}>[{s.code||"—"}] {s.name} ({s.qty} {s.unit})</option>)}
                    </select>
                    <button onClick={()=>{setNovoMat(it.id);setFormNM({code:"",name:"",cat:"Equipamentos",unit:"un",min:"0"});}}
                      title="Novo material" style={{background:`${C.gold}22`,color:C.gold,border:`1px solid ${C.gold}55`,borderRadius:7,width:32,height:36,cursor:"pointer",fontWeight:800,fontSize:16,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                  </div>
                  {s&&<div style={{fontSize:10,color:C.grn}}>✓ {s.name} · Estoque: {s.qty} {s.unit}</div>}
                  {novoMat===it.id&&<div style={{background:`${C.gold}11`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:10}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.gold,marginBottom:8}}>✨ Cadastrar Novo Material</div>
                    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8,marginBottom:8}}>
                      <Inp label="Código" value={formNM.code} onChange={v=>setFormNM(f=>({...f,code:v}))} placeholder="ONU-010"/>
                      <Inp label="Nome *" value={formNM.name} onChange={v=>setFormNM(f=>({...f,name:v}))} placeholder="Nome completo"/>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                      <Sel label="Categoria" value={formNM.cat} onChange={v=>setFormNM(f=>({...f,cat:v}))} options={CATS.map(c=>({value:c,label:c}))}/>
                      <Inp label="Unidade" value={formNM.unit} onChange={v=>setFormNM(f=>({...f,unit:v}))} placeholder="un, m..."/>
                      <Inp label="Qtd Mín." value={formNM.min} onChange={v=>setFormNM(f=>({...f,min:v}))} type="number"/>
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <Btn size="sm" color="ghost" outline onClick={()=>setNovoMat(null)}>Cancelar</Btn>
                      <Btn size="sm" color="gold" onClick={salvarNM}>✓ Cadastrar e Selecionar</Btn>
                    </div>
                  </div>}
                  <div style={{display:"flex",gap:6}}>
                    <input type="number" value={it.qty} onChange={e=>updItem(it.id,"qty",e.target.value)} placeholder="Quantidade" min="0"
                      style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:14,fontWeight:700,textAlign:"center"}}/>
                    <input type="number" value={it.val||""} onChange={e=>updItem(it.id,"val",e.target.value)} placeholder="Valor R$" min="0"
                      style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:13}}/>
                  </div>
                </div>
                <button onClick={()=>remItem(it.id)} style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>✕</button>
              </div>;
            })}
            <button onClick={()=>setItems(p=>[...p,blank()])} style={{width:"100%",padding:"13px",background:items.length===0?`${C.gold}18`:"transparent",border:`2px dashed ${C.gold}`,borderRadius:10,color:C.gold,cursor:"pointer",fontSize:13,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              <span style={{fontSize:20,lineHeight:1}}>+</span>
              {items.length===0?"Clique para adicionar o primeiro item da nota":"Adicionar mais um item"}
            </button>
            {items.length===0&&<div style={{textAlign:"center",fontSize:11,color:C.muted2,marginTop:-4}}>Adicione todos os itens da nota e registre no final</div>}
          </div>

          {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        </div>

        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.grn,fontSize:18}}>R$ {fmt(totalPreview)}</span>
            <span style={{fontSize:12,color:C.muted,marginLeft:8}}>{validItems.length} item(s)</span>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn color="ghost" outline onClick={()=>setModal(false)}>Cancelar</Btn>
            <Btn color="gold" onClick={save} disabled={validItems.length===0}>✅ Registrar Nota Fiscal</Btn>
          </div>
        </div>
      </div>
    </div>}
  </div>;
}

export default NFPage;
