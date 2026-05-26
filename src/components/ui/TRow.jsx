// src/components/ui/TRow.jsx
import React, { useState, useEffect } from "react";
import { C } from "../../lib/constants";

function TRow({cells}){
  return <tr style={{borderBottom:`1px solid ${C.bdr}22`}}>
    {cells.map((c,i)=><td key={i} style={{padding:"10px 12px",fontSize:13,color:C.txt2,verticalAlign:"middle"}}>{c}</td>)}
  </tr>;
}

export default TRow;
