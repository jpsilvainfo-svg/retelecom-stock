import React, { useEffect } from "react";
import { C } from "../utils/colors.js";

export class ErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={hasError:false,error:null};}
  static getDerivedStateFromError(e){return{hasError:true,error:e};}
  render(){
    if(this.state.hasError){
      return <div style={{minHeight:"100vh",background:"#161616",color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,padding:24}}>
        <div style={{fontSize:40}}>⚠️</div>
        <div style={{fontSize:18,fontWeight:700,color:"#cc0000"}}>Erro ao carregar o sistema</div>
        <div style={{fontSize:13,color:"#888",maxWidth:500,textAlign:"center"}}>{String(this.state.error?.message||this.state.error)}</div>
        <button onClick={()=>window.location.reload()} style={{background:"#cc0000",color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:8}}>
          🔄 Recarregar
        </button>
      </div>;
    }
    return this.props.children;
  }
}

export function Toast({msg,type="info",onClose}){
  useEffect(()=>{const t=setTimeout(onClose,4000);return()=>clearTimeout(t);},[onClose]);
  const themes={
    success:{bg:C.grnD,border:C.grn,color:C.grn,icon:"✅"},
    error:  {bg:C.redD,border:C.red,color:C.red,icon:"❌"},
    warning:{bg:`${C.ylw}22`,border:C.ylw,color:C.ylw,icon:"⚠️"},
    info:   {bg:`${C.gold}22`,border:C.gold,color:C.gold,icon:"ℹ️"},
  };
  const th=themes[type]||themes.info;
  return <div style={{position:"fixed",top:16,right:16,zIndex:9999,maxWidth:380,minWidth:280,
    background:th.bg,border:`1px solid ${th.border}`,borderRadius:10,padding:"12px 16px",
    display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 24px #00000088",
    animation:"slideLeft 0.3s ease"}}>
    <span style={{fontSize:20,flexShrink:0}}>{th.icon}</span>
    <span style={{fontSize:13,color:th.color,flex:1,fontWeight:500,lineHeight:1.4}}>{msg}</span>
    <button onClick={onClose} style={{background:"transparent",color:th.color,border:"none",
      cursor:"pointer",fontSize:18,padding:"0 2px",lineHeight:1,opacity:0.7}}>✕</button>
  </div>;
}

export function Spinner(){
  return <div style={{position:"fixed",inset:0,background:"#161616ee",zIndex:8000,
    display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
    <div style={{width:48,height:48,border:`4px solid ${C.gold}33`,
      borderTop:`4px solid ${C.gold}`,borderRadius:"50%",
      animation:"spin 0.8s linear infinite"}}/>
    <div style={{fontSize:13,color:C.muted}}>Carregando...</div>
  </div>;
}
