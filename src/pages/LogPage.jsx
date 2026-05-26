// src/pages/LogPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function LogPage({logs,isMobile}){
  const tc={saida:C.gold,entrada:C.grn,dev:C.ylw,aprovada:C.grn};
  const ic={saida:"→",entrada:"↓",dev:"↺",aprovada:"✓"};
  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Logs do Sistema</h1>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {logs.map(l=>(
          <Card key={l.id} style={{padding:14,borderLeft:`3px solid ${tc[l.tipo]||C.gold}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8,marginBottom:4}}>
              <span style={{fontSize:12,fontWeight:700,color:tc[l.tipo]||C.gold}}>{l.action}</span>
              <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted,flexShrink:0}}>{l.date}</span>
            </div>
            <div style={{fontSize:12,fontWeight:600,color:C.txt,marginBottom:2}}>{l.user}</div>
            <div style={{fontSize:11,color:C.muted}}>{l.detail}</div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["DATA/HORA","USUÁRIO","AÇÃO","DETALHE"]}/></thead>
            <tbody>{logs.map(l=>(
              <TRow key={l.id} cells={[
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,whiteSpace:"nowrap"}}>{l.date}</span>,
                <span style={{fontSize:12,fontWeight:600,color:C.txt}}>{l.user}</span>,
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:22,height:22,borderRadius:"50%",background:`${tc[l.tipo]||C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:tc[l.tipo]||C.gold,fontWeight:700}}>{ic[l.tipo]||"·"}</div>
                  <span style={{fontSize:12,fontWeight:600,color:tc[l.tipo]||C.gold}}>{l.action}</span>
                </div>,
                <span style={{fontSize:12,color:C.muted}}>{l.detail}</span>
              ]}/>
            ))}</tbody>
          </table>
        </div>
      </Card>
    )}
  </div>;
}

export default LogPage;
