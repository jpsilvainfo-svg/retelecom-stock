// src/components/ui/THead.jsx
import React, { useState, useEffect } from "react";
import { C } from "../../lib/constants";

function THead({cols}){
  return <tr>{cols.map((c,i)=><th key={i} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",background:C.surf,borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{c}</th>)}</tr>;
}

export default THead;
