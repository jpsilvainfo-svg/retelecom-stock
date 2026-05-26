// src/components/ui/Btn.jsx
import React, { useState, useEffect } from "react";
import { C } from "../../lib/constants";

function Btn({children,onClick,color="gold",size="md",disabled,style:sx={},outline,full}){
  const pal={gold:{bg:C.gold,fg:"#000"},red:{bg:C.red,fg:"#fff"},grn:{bg:C.grn,fg:"#fff"},ghost:{bg:"transparent",fg:C.muted}};
  const p=pal[color]||pal.gold;
  const sz={xs:{padding:"4px 10px",fontSize:11},sm:{padding:"7px 14px",fontSize:12},md:{padding:"10px 20px",fontSize:13},lg:{padding:"13px 24px",fontSize:15}}[size];
  return <button onClick={onClick} disabled={disabled} style={{background:outline?"transparent":p.bg,color:outline?p.bg:p.fg,border:outline?`1.5px solid ${p.bg}`:"none",borderRadius:8,fontWeight:600,opacity:disabled?.4:1,width:full?"100%":"auto",transition:"opacity .15s",...sz,...sx}}>{children}</button>;
}

export default Btn;
