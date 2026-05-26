// src/components/shared/ItemList.jsx
import React from "react";
import { C } from "../../lib/constants";
import { Btn, Inp, Sel } from "../ui";

function ItemList({items,onAdd,onUpdate,onRemove,stockOptions,isMobile,label,addLabel,showObs,showVal}){
  return <div style={{display:"flex",flexDirection:"column",gap:6}}>
    {label&&<div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:2}}>{label} <span style={{background:`${C.gold}22`,color:C.gold,fontSize:11,fontWeight:800,padding:"2px 8px",borderRadius:4,marginLeft:6}}>{items.filter(r=>r.sid&&parseInt(r.qty)>0).length} item(s)</span></div>}
    {items.map((it,idx)=>{
      const s=it.sid?stockOptions.find(x=>x.id===it.sid):null;
      return <div key={it.id} style={{display:"flex",alignItems:"flex-start",gap:8,background:it.sid?`${C.gold}08`:C.surf,borderRadius:10,padding:"10px 12px",border:`1px solid ${it.sid?`${C.gold}44`:C.bdr2}`}}>
        <div style={{width:24,height:24,borderRadius:"50%",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.gold,flexShrink:0,marginTop:2}}>{idx+1}</div>
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:6}}>
          <select value={it.sid} onChange={e=>onUpdate(it.id,"sid",e.target.value)}
            style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"9px 10px",color:it.sid?C.txt:C.muted,fontSize:13}}>
            <option value="">— Selecionar material —</option>
            {stockOptions.map(s=><option key={s.id} value={s.id}>[{s.code||"—"}] {s.name} ({s.qty} {s.unit})</option>)}
          </select>
          {s&&<div style={{fontSize:10,color:C.grn}}>✓ {s.name} · Disponível: <strong>{s.qty}</strong> {s.unit}</div>}
          <div style={{display:"flex",gap:6,flexWrap:isMobile?"wrap":"nowrap"}}>
            <input type="number" value={it.qty} onChange={e=>onUpdate(it.id,"qty",e.target.value)}
              placeholder="Quantidade" min="0"
              style={{width:isMobile?"100%":110,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:14,fontWeight:700,textAlign:"center",flex:isMobile?1:"none"}}/>
            {showVal&&<input type="number" value={it.val||""} onChange={e=>onUpdate(it.id,"val",e.target.value)}
              placeholder="Valor R$" min="0"
              style={{width:isMobile?"100%":120,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:13,flex:isMobile?1:"none"}}/>}
            {showObs&&<input type="text" value={it.obs||""} onChange={e=>onUpdate(it.id,"obs",e.target.value)}
              placeholder="Obs (opcional)"
              style={{flex:1,background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:7,padding:"8px 10px",color:C.txt,fontSize:13}}/>}
          </div>
        </div>
        <button onClick={()=>onRemove(it.id)} style={{background:C.redD,color:C.red,border:"none",borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:2}}>✕</button>
      </div>;
    })}
    <button onClick={onAdd} style={{
      width:"100%",padding:"13px",
      background:items.length===0?`${C.gold}18`:"transparent",
      border:`2px dashed ${C.gold}`,
      borderRadius:10,color:C.gold,
      cursor:"pointer",fontSize:13,fontWeight:700,
      display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
      <span style={{fontSize:20,lineHeight:1}}>+</span>
      {items.length===0?(addLabel||"Clique para adicionar o primeiro material"):"Adicionar mais um material"}
    </button>
    {items.length===0&&<div style={{textAlign:"center",fontSize:11,color:C.muted2,marginTop:-4}}>Adicione os materiais e envie tudo junto no final</div>}
  </div>;
}

export default ItemList;
