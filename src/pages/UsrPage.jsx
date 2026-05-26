// src/pages/UsrPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";

function UsrPage({users,setUsers,addLog,currentUser,isMobile}){
  const[modal,setModal]=useState(null);
  const[form,setForm]=useState({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:"",perms:DEFAULT_PERMS["tecnico"],mustChangePassword:true});
  const roles=[{value:"admin",label:"Administrador"},{value:"estoque",label:"Estoque"},{value:"tecnico",label:"Técnico"},{value:"financeiro",label:"Financeiro"},{value:"mecanico",label:"Mecânico"}];
  const isRoot=currentUser?.role==="superadmin";
  const rl={superadmin:"MASTER",admin:"ADM",estoque:"EST",tecnico:"TEC",financeiro:"FIN",mecanico:"MEC"};
  const rc={superadmin:"#ff00ff",admin:C.gold,estoque:C.blue,tecnico:C.grn,financeiro:C.ylw,mecanico:"#888888"};

  const handlePhoto=(e)=>{
    const file=e.target.files[0];
    if(!file)return;
    if(file.size>2*1024*1024){alert("Foto muito grande! Máximo 2MB.");return;}
    const reader=new FileReader();
    reader.onload=(ev)=>setForm(f=>({...f,photo:ev.target.result}));
    reader.readAsDataURL(file);
  };

  const save=()=>{
    if(!form.name.trim()||!form.login.trim()||!form.pass.trim())return;
    const permsToSave=form.perms.length>0?form.perms:DEFAULT_PERMS[form.role]||["dash"];
    if(modal==="new"){
      setUsers(p=>[...p,{id:uid(),...form,perms:permsToSave}]);
      addLog(currentUser.name,"Usuário Criado",form.name+" ("+form.role+")");
    } else {
      // Admin não pode alterar login/senha de outros usuários — só o próprio ou superadmin
      setUsers(p=>p.map(u=>{
        if(u.id!==modal)return u;
        if(isRoot){
          return{...u,...form,perms:permsToSave};
        }
        // Admin pode editar nome, email, telefone, foto, perfil e permissões
        // mas NÃO pode alterar login ou senha de outros
        return{...u,name:form.name,email:form.email,phone:form.phone,cpf:form.cpf,role:form.role,photo:form.photo,perms:permsToSave,mustChangePassword:form.mustChangePassword};
      }));
      addLog(currentUser.name,"Usuário Editado",form.name);
    }
    setModal(null);
  };

  const togglePerm=(k)=>{
    setForm(f=>({...f,perms:f.perms.includes(k)?f.perms.filter(p=>p!==k):[...f.perms,k]}));
  };
  const setRoleAndPerms=(role)=>{
    setForm(f=>({...f,role,perms:DEFAULT_PERMS[role]||["dash"]}));
  };
  const MODULE_GROUPS={geral:"Geral",estoque:"Estoque",operacional:"Operacional",relatorios:"Relatórios",admin:"Administração"};

  const Avatar=({user,size=36})=>(
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,overflow:"hidden",
      background:rc[user.role]+"33",display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.4}}>
      {user.photo
        ?<img src={user.photo} alt={user.name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        :<span>👤</span>}
    </div>
  );

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
      <div><h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>Usuários</h1></div>
      <Btn color="gold" size={isMobile?"sm":"md"} onClick={()=>{setForm({name:"",email:"",phone:"",cpf:"",login:"",pass:"",role:"tecnico",photo:"",perms:DEFAULT_PERMS["tecnico"],mustChangePassword:true});setModal("new");}}>+ Novo</Btn>
    </div>
    {isMobile?(
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {users.filter(u=>isRoot||u.role!=="superadmin").map(u=>(
          <Card key={u.id} style={{padding:14,display:"flex",alignItems:"center",gap:12}}>
            <Avatar user={u} size={44}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:C.txt}}>{u.name}</div>
              <div style={{fontSize:11,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{u.login} · {u.email}</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,flexShrink:0}}>
              <span style={{background:rc[u.role],color:"#000",fontSize:9,fontWeight:800,padding:"2px 6px",borderRadius:3}}>{rl[u.role]}</span>
              <div style={{display:"flex",gap:6}}>
                <Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||"",perms:u.perms||DEFAULT_PERMS[u.role]||["dash"],mustChangePassword:u.mustChangePassword||false});setModal(u.id);}}>Editar</Btn>
                {u.id!==currentUser.id&&isRoot&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm("Remover "+u.name+"?")){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"Usuário Removido",u.name);}}}>✕</Btn>}
              </div>
            </div>
          </Card>
        ))}
      </div>
    ):(
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><THead cols={["FOTO","USUÁRIO","LOGIN","E-MAIL","TELEFONE","MATRÍCULA","PERFIL","AÇÕES"]}/></thead>
            <tbody>{users.filter(u=>isRoot||u.role!=="superadmin").map(u=>{
              if(u.role==="superadmin"&&!isRoot)return null;
              return <TRow key={u.id} cells={[
                <Avatar user={u} size={36}/>,
                <span style={{fontWeight:600,color:C.txt}}>{u.name}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,color:C.gold}}>{u.login}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.email}</span>,
                <span style={{fontSize:12,color:C.muted}}>{u.phone}</span>,
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{u.cpf||"—"}</span>,
                <span style={{background:rc[u.role]||C.gold,color:u.role==="superadmin"?"#fff":"#000",fontSize:10,fontWeight:800,padding:"2px 7px",borderRadius:4}}>{rl[u.role]||u.role}</span>,
                <div style={{display:"flex",gap:6}}>
                  {isRoot&&<Btn size="xs" color="gold" outline onClick={()=>{setForm({name:u.name,email:u.email,phone:u.phone,cpf:u.cpf||"",login:u.login,pass:u.pass,role:u.role,photo:u.photo||"",perms:u.perms||DEFAULT_PERMS[u.role]||["dash"],mustChangePassword:u.mustChangePassword||false});setModal(u.id);}}>Editar</Btn>}
                  {isRoot&&u.role!=="superadmin"&&<Btn size="xs" color="red" outline onClick={()=>{if(window.confirm("Remover "+u.name+"?")){setUsers(p=>p.filter(x=>x.id!==u.id));addLog(currentUser.name,"Usuário Removido",u.name);}}}>✕</Btn>}
                  {!isRoot&&<span style={{fontSize:11,color:C.muted}}>—</span>}
                </div>
              ]}/>;
            })}</tbody>
          </table>
        </div>
      </Card>
    )}
    {modal&&<Modal title={modal==="new"?"Novo Usuário":"Editar Usuário"} onClose={()=>setModal(null)} isMobile={isMobile}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {/* Foto de perfil */}
        <div style={{display:"flex",alignItems:"center",gap:16,padding:14,background:C.surf,borderRadius:10,border:`1px solid ${C.bdr}`}}>
          <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",background:`${C.gold}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,flexShrink:0,border:`2px solid ${C.bdr2}`}}>
            {form.photo?<img src={form.photo} alt="foto" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span>👤</span>}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:600,color:C.txt,marginBottom:6}}>Foto de Perfil</div>
            <div style={{fontSize:11,color:C.muted,marginBottom:10}}>JPG, PNG ou GIF · Máximo 2MB</div>
            <label style={{background:C.gold,color:"#000",padding:"7px 14px",borderRadius:7,cursor:"pointer",fontSize:12,fontWeight:700,display:"inline-block"}}>
              📷 Escolher Foto
              <input type="file" accept="image/*" onChange={handlePhoto} style={{display:"none"}}/>
            </label>
            {form.photo&&<button onClick={()=>setForm(f=>({...f,photo:""}))} style={{background:"transparent",color:C.red,border:"none",cursor:"pointer",fontSize:12,marginLeft:10,fontWeight:600}}>✕ Remover</button>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Nome Completo *" value={form.name} onChange={v=>setForm(f=>({...f,name:v}))}/>
          <Inp label="E-mail" value={form.email} onChange={v=>setForm(f=>({...f,email:v}))} type="email"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>
          <Inp label="Telefone" value={form.phone} onChange={v=>setForm(f=>({...f,phone:v}))} placeholder="(00) 00000-0000"/>
          <Inp label="Matrícula" value={form.cpf||""} onChange={v=>setForm(f=>({...f,cpf:v}))} placeholder="Ex: MAT-001"/>
        </div>
        {/* Perfil e permissões */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:12}}>
          {(isRoot||modal==="new")&&<Inp label="Login *" value={form.login} onChange={v=>setForm(f=>({...f,login:v}))}/>}
          {(isRoot||modal==="new")&&<Inp label="Senha *" value={form.pass} onChange={v=>setForm(f=>({...f,pass:v}))} type="password"/>}
          {!isRoot&&modal!=="new"&&<div style={{gridColumn:"1 / -1",background:C.surf,borderRadius:8,padding:"10px 14px",border:`1px solid ${C.bdr}`,fontSize:12,color:C.muted}}>
            🔒 Login e senha só podem ser alterados pelo próprio usuário em <strong style={{color:C.txt}}>Meu Perfil</strong>
          </div>}
          <div style={{gridColumn:(isRoot||modal==="new")?"auto":"1 / -1"}}>
            <Sel label="Perfil" value={form.role} onChange={setRoleAndPerms} options={roles}/>
          </div>
        </div>

        {/* Trocar senha no primeiro acesso */}
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",background:C.surf,borderRadius:8,border:`1px solid ${C.bdr}`}}>
          <input type="checkbox" id="mustChange" checked={form.mustChangePassword}
            onChange={e=>setForm(f=>({...f,mustChangePassword:e.target.checked}))}
            style={{width:16,height:16,accentColor:C.gold,cursor:"pointer"}}/>
          <label htmlFor="mustChange" style={{fontSize:12,color:C.txt,cursor:"pointer"}}>
            🔐 Exigir troca de senha no primeiro acesso
          </label>
        </div>

        {/* Permissões por módulo */}
        <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase"}}>🔑 Acesso aos Módulos</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setForm(f=>({...f,perms:ALL_MODULES.map(m=>m.k)}))} style={{background:`${C.grn}22`,color:C.grn,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Marcar Tudo</button>
              <button onClick={()=>setForm(f=>({...f,perms:[]}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>Desmarcar</button>
            </div>
          </div>
          {Object.entries(MODULE_GROUPS).map(([group,groupLabel])=>{
            const mods=ALL_MODULES.filter(m=>m.group===group);
            return <div key={group} style={{marginBottom:12}}>
              <div style={{fontSize:10,fontWeight:700,color:C.muted2,letterSpacing:".06em",textTransform:"uppercase",marginBottom:6}}>{groupLabel}</div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:6}}>
                {mods.map(m=>(
                  <div key={m.k} onClick={()=>togglePerm(m.k)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",
                      background:form.perms.includes(m.k)?`${C.gold}18`:C.card,
                      border:`1px solid ${form.perms.includes(m.k)?`${C.gold}55`:C.bdr2}`}}>
                    <div style={{width:16,height:16,borderRadius:4,background:form.perms.includes(m.k)?C.gold:C.bdr2,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {form.perms.includes(m.k)&&<span style={{fontSize:10,color:"#000",fontWeight:800}}>✓</span>}
                    </div>
                    <span style={{fontSize:11,color:form.perms.includes(m.k)?C.txt:C.muted}}>{m.icon} {m.l}</span>
                  </div>
                ))}
              </div>
            </div>;
          })}
        </div>

        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModal(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={save}>Salvar Usuário</Btn>
        </div>
      </div>
    </Modal>}
    <div style={{marginTop:8,padding:"12px 16px",background:C.redD,border:`1px solid ${C.red}33`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <div style={{fontSize:12,fontWeight:700,color:C.red}}>⚠️ Zona de Perigo</div>
        <div style={{fontSize:11,color:C.muted,marginTop:2}}>Apaga todos os dados e volta ao estado inicial.</div>
      </div>
      isRoot
          ?<Btn size="sm" color="red" outline onClick={()=>{if(window.confirm("ATENÇÃO: Apaga TODOS os dados. Confirmar?")){Object.keys(localStorage).filter(k=>k.startsWith("re_")).forEach(k=>localStorage.removeItem(k));window.location.reload();}}}>🗑️ Resetar Todos os Dados</Btn>
          :<span style={{fontSize:12,color:C.muted}}>🔒 Apenas o usuário Root pode resetar o sistema.</span>
    </div>
  </div>;
}

export default UsrPage;
