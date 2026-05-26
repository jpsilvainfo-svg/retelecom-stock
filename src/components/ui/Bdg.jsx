// src/components/ui/Bdg.jsx
import React, { useState, useEffect } from "react";
import { C } from "../../lib/constants";

function Bdg({children,color="gold"}){
  const p={gold:{bg:C.goldD,fg:C.gold},red:{bg:C.redD,fg:C.red},grn:{bg:C.grnD,fg:C.grn},ylw:{bg:C.ylwD,fg:C.ylw},muted:{bg:"#88888820",fg:C.muted}}[color]||{bg:C.goldD,fg:C.gold};
  return <span style={{background:p.bg,color:p.fg,padding:"3px 10px",borderRadius:5,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",whiteSpace:"nowrap"}}>{children}</span>;
}

export default Bdg;
