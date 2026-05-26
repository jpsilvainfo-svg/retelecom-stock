// src/components/ui/Modal.jsx
import React, { useState, useEffect } from "react";
import { C } from "../../lib/constants";

function Modal({title,children,onClose,isMobile}){
  return <div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:"16px"}}>
    <div className={isMobile?"su":"fi"} style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,padding:isMobile?"20px 16px 32px":28,width:"100%",maxWidth:isMobile?"100%":680,maxHeight:isMobile?"90vh":"85vh",overflowY:"auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,paddingBottom:14,borderBottom:`1px solid ${C.bdr}`}}>
        <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>{title}</h2>
        <button onClick={onClose} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}

export default Modal;
