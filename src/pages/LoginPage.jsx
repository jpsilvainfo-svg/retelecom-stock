// src/pages/LoginPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function LoginPage({users,onLogin}){
  const[login,setLogin]=useState("");
  const[pass,setPass]=useState("");
  const[err,setErr]=useState("");
  const isMobile=useIsMobile();
  const[toast,setToast]=useState(null);
  const showToast=(msg,type="info")=>setToast({msg,type,id:Date.now()});
  const go=()=>{const u=users.find(u=>u.login===login&&u.pass===pass);if(u)onLogin(u);else setErr("Login ou senha inválidos.");};
  const handleKey=e=>{if(e.key==="Enter")go();};
  return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:isMobile?"16px":"20px"}}>
    <style>{CSS}</style>
    <div style={{position:"fixed",inset:0,backgroundImage:`radial-gradient(ellipse at 50% 0%,${C.gold}18 0%,transparent 60%)`,pointerEvents:"none"}}/>
    <div className="fi" style={{width:"100%",maxWidth:400,position:"relative",zIndex:1}}>
      <div style={{textAlign:"center",marginBottom:32}}>
        <img src="/logo-stocktel.png" alt="StockTel" style={{width:"100%",maxWidth:isMobile?260:320,objectFit:"contain",marginBottom:12}}/>
        <div style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".12em",textTransform:"uppercase"}}>Soluções em Telecomunicações</div>
      </div>
      <Card style={{padding:isMobile?20:28,display:"flex",flexDirection:"column",gap:16,borderRadius:16}}>
        <Inp label="Login" value={login} onChange={setLogin} placeholder="Seu usuário"/>
        <Inp label="Senha" value={pass} onChange={setPass} type="password" placeholder="Sua senha" style={{}} />
        {err&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {err}</div>}
        <Btn onClick={go} color="gold" size="lg" style={{width:"100%",borderRadius:10,marginTop:4}}>Entrar</Btn>
      </Card>
      <div style={{marginTop:14,textAlign:"center",fontSize:11,color:C.muted2}}>StockTel v1.0.0</div>
    </div>
  </div>;
}

export default LoginPage;
