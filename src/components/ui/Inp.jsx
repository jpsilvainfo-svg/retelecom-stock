// src/components/ui/Inp.jsx
import React, { useState, useEffect } from "react";
import { C } from "../../lib/constants";

function Inp({label,value,onChange,type="text",placeholder,style:sx={}}){
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:14,width:"100%",...sx}}/>
  </div>;
}

export default Inp;
