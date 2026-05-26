// src/pages/FrotaPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../lib/constants";
import { uid, now, fmt } from "../lib/utils";
import { Btn, Inp, Sel, Card, Bdg, THead, TRow, Modal } from "../components/ui";
import { useToast } from "../hooks/useToast";
import ItemList from "../components/shared/ItemList";

function FrotaPage({veiculos,setVeiculos,abastecimentos,setAbastecimentos,checkouts,setCheckouts,users,currentUser,addLog,isMobile}){
  const isTec=currentUser.role==="tecnico";
  const isAdm=currentUser.role==="admin";
  const[tab,setTab]=useState(isTec?"check":"veic");
  const[modalVeic,setModalVeic]=useState(null);
  const[modalAbast,setModalAbast]=useState(false);
  const[modalCheck,setModalCheck]=useState(null);
  const[modalFotos,setModalFotos]=useState(null);
  const[modalDoc,setModalDoc]=useState(null);
  const techs=users.filter(u=>u.role==="tecnico");

  const FOTOS_LABELS=["Frente","Lado Esquerdo","Lado Direito","Traseira"];
  const FOTOS_ICONS=["⬆️","⬅️","➡️","⬇️"];
  const STATUS_OPTS=["ativo","manutenção","inativo"];
  const STATUS_COLOR={ativo:C.grn,manutenção:C.ylw,inativo:C.red};
  const COMB_OPTS=["gasolina","etanol","diesel","flex","gnv"];
  const COMB_NÍVEL=["reserva","1/4","1/2","3/4","cheio"];
  const COMB_COLOR={reserva:C.red,"1/4":C.ylw,"1/2":C.ylw,"3/4":C.grn,cheio:C.grn};
  const PNEU_OPTS=["ok","baixo","problema"];
  const PNEU_COLOR={ok:C.grn,baixo:C.ylw,problema:C.red};
  const PNEU_ICON={ok:"✅","baixo":"⚠️",problema:"❌"};

  const blankVeic=()=>({id:uid(),placa:"",modelo:"",ano:"",cor:"",tecnicoId:"",dtAquisicao:"",kmCadastro:"",status:"ativo",obs:"",fotos:["","","",""],docPDF:""});
  const blankAbast=()=>({id:uid(),veiculoId:"",tecnicoId:currentUser.id,dtAbast:new Date().toISOString().slice(0,10),odometro:"",litros:"",valor:"",combustivel:"gasolina",posto:"",foto:"",obs:""});
  const blankCheck=(tipo)=>({
    id:uid(),veiculoId:"",tecnicoId:currentUser.id,tipo:tipo||"retirada",
    dtCheck:new Date().toISOString().slice(0,10),km:"",
    combustivel:"cheio",
    pneus:{diant_esq:"ok",diant_dir:"ok",tras_esq:"ok",tras_dir:"ok"},
    avarias:false,descAvarias:"",
    fotoOdometro:"",fotosAvarias:["","",""],
    obs:"",registradoEm:now()
  });

  const[formVeic,setFormVeic]=useState(blankVeic());
  const[formAbast,setFormAbast]=useState(blankAbast());
  const[formCheck,setFormCheck]=useState(blankCheck("retirada"));
  const[errVeic,setErrVeic]=useState("");
  const[errAbast,setErrAbast]=useState("");
  const[errCheck,setErrCheck]=useState("");

  const viewAbast=isTec?abastecimentos.filter(a=>a.tecnicoId===currentUser.id):abastecimentos;
  const viewCheck=isTec?checkouts.filter(c=>c.tecnicoId===currentUser.id):checkouts;

  const getKmAtual=(veicId)=>{
    const regs=abastecimentos.filter(a=>a.veiculoId===veicId&&parseInt(a.odometro)>0);
    const regsCheck=checkouts.filter(c=>c.veiculoId===veicId&&parseInt(c.km)>0);
    const allKms=[...regs.map(a=>parseInt(a.odometro)||0),...regsCheck.map(c=>parseInt(c.km)||0)];
    if(!allKms.length){const v=veiculos.find(x=>x.id===veicId);return parseInt(v?.kmCadastro)||0;}
    return Math.max(...allKms);
  };

  const getAlertaOleo=(veic)=>{
    const kmAtual=getKmAtual(veic.id);
    const kmBase=parseInt(veic.kmCadastro)||0;
    const proxima=Math.ceil((kmAtual-kmBase+1)/10000)*10000+kmBase;
    const faltam=proxima-kmAtual;
    return{kmAtual,faltam,urgente:faltam<=500,alerta:faltam<=2000};
  };

  const handleFotoVeic=(idx,e)=>{const file=e.target.files[0];if(!file)return;if(file.size>3*1024*1024){alert("Máx 3MB.");return;}const r=new FileReader();r.onload=(ev)=>setFormVeic(f=>({...f,fotos:f.fotos.map((ft,i)=>i===idx?ev.target.result:ft)}));r.readAsDataURL(file);};
  const handleDocPDF=(e)=>{const file=e.target.files[0];if(!file)return;if(file.size>5*1024*1024){alert("Máx 5MB.");return;}const r=new FileReader();r.onload=(ev)=>setFormVeic(f=>({...f,docPDF:ev.target.result}));r.readAsDataURL(file);};
  const handleFotoAbast=(e)=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=(ev)=>setFormAbast(f=>({...f,foto:ev.target.result}));r.readAsDataURL(file);};
  const handleFotoOdo=(e)=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=(ev)=>setFormCheck(f=>({...f,fotoOdometro:ev.target.result}));r.readAsDataURL(file);};
  const handleFotoAvaria=(idx,e)=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=(ev)=>setFormCheck(f=>({...f,fotosAvarias:f.fotosAvarias.map((ft,i)=>i===idx?ev.target.result:ft)}));r.readAsDataURL(file);};

  const salvarVeic=()=>{
    if(!formVeic.placa.trim()){setErrVeic("Informe a placa.");return;}
    if(!formVeic.modelo.trim()){setErrVeic("Informe o modelo.");return;}
    const data={...formVeic,placa:formVeic.placa.toUpperCase().trim(),fotos:formVeic.fotos||["","","",""]};
    if(modalVeic==="new"){setVeiculos(p=>[{...data,id:uid()},...p]);addLog(currentUser.name,"Frota","Cadastrado: "+data.placa);}
    else{setVeiculos(p=>p.map(v=>v.id===modalVeic?data:v));addLog(currentUser.name,"Frota","Editado: "+data.placa);}
    setModalVeic(null);setErrVeic("");
  };

  const salvarAbast=()=>{
    if(!formAbast.veiculoId){setErrAbast("Selecione o veículo.");return;}
    if(!formAbast.odometro){setErrAbast("Informe o odômetro.");return;}
    if(!formAbast.litros){setErrAbast("Informe os litros.");return;}
    if(!formAbast.valor){setErrAbast("Informe o valor.");return;}
    const veic=veiculos.find(v=>v.id===formAbast.veiculoId);
    setAbastecimentos(p=>[{...formAbast,id:uid(),registradoEm:now()},...p]);
    addLog(currentUser.name,"Abastecimento",`${veic?.placa||"?"} · ${formAbast.litros}L · R$${formAbast.valor}`);
    setModalAbast(false);setErrAbast("");setFormAbast(blankAbast());
  };

  const salvarCheck=()=>{
    if(!formCheck.veiculoId){setErrCheck("Selecione o veículo.");return;}
    if(!formCheck.km){setErrCheck("Informe a quilometragem.");return;}
    const veic=veiculos.find(v=>v.id===formCheck.veiculoId);
    setCheckouts(p=>[{...formCheck,id:uid(),registradoEm:now()},...p]);
    addLog(currentUser.name,formCheck.tipo==="retirada"?"Retirada de Veículo":"Devolução de Veículo",`${veic?.placa||"?"} · ${formCheck.km} km · ${currentUser.name}`);
    setModalCheck(null);setErrCheck("");
  };

  const totalGasto=viewAbast.reduce((a,x)=>a+(parseFloat(x.valor)||0),0);
  const totalLitros=viewAbast.reduce((a,x)=>a+(parseFloat(x.litros)||0),0);

  const tabList=isAdm
    ?[{k:"veic",l:"🚗 Veículos"},{k:"abast",l:"⛽ Abastecimento"},{k:"check",l:"📋 Checklist Retirada"}]
    :[{k:"check",l:"📋 Meu Checklist"},{k:"abast",l:"⛽ Meus Abastecimentos"}];

  // ── Botão para preencher checklist
  const renderCheckBtn=(veic)=>(
    <Btn size="xs" color="gold" onClick={()=>{setFormCheck({...blankCheck("retirada"),veiculoId:veic.id,km:String(getKmAtual(veic.id))});setModalCheck("new");}}>📋 Checklist</Btn>
  );

  return <div className="fi" style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
      <div>
        <h1 style={{fontSize:isMobile?17:20,fontWeight:700,color:C.txt}}>🚗 Frota</h1>
        <p style={{fontSize:12,color:C.muted,marginTop:2}}>Veículos, abastecimento e checklist de retirada</p>
      </div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {isAdm&&tab==="veic"&&<Btn color="gold" size="sm" onClick={()=>{setFormVeic(blankVeic());setModalVeic("new");setErrVeic("");}}>+ Cadastrar Veículo</Btn>}
        {tab==="abast"&&<Btn color="gold" size="sm" onClick={()=>{setFormAbast(blankAbast());setModalAbast(true);setErrAbast("");}}>⛽ Abastecimento</Btn>}
        {tab==="check"&&<div style={{display:"flex",gap:8}}>
          <Btn color="gold" size="sm" onClick={()=>{setFormCheck(blankCheck("retirada"));setModalCheck("new");}}>📋 Retirada</Btn>
          <Btn color="ghost" outline size="sm" onClick={()=>{setFormCheck(blankCheck("devolucao"));setModalCheck("new");}}>↩️ Devolução</Btn>
        </div>}
      </div>
    </div>

    {tab==="abast"&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
      {[{label:"ABASTECIMENTOS",value:fmt(viewAbast.length),icon:"⛽",color:C.gold},{label:"LITROS TOTAL",value:fmt(Math.round(totalLitros)),icon:"🛢️",color:C.blue},{label:"GASTO TOTAL",value:`R$ ${fmt(Math.round(totalGasto))}`,icon:"💰",color:C.grn}].map((s,i)=>(
        <Card key={i} style={{padding:isMobile?12:14,display:"flex",gap:10,alignItems:"center"}}>
          <div style={{width:36,height:36,borderRadius:10,background:`${s.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{s.icon}</div>
          <div><div style={{fontSize:9,fontWeight:700,color:C.muted}}>{s.label}</div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:isMobile?16:20,fontWeight:800,color:s.color}}>{s.value}</div></div>
        </Card>
      ))}
    </div>}

    <div style={{display:"flex",borderBottom:`1px solid ${C.bdr}`}}>
      {tabList.map(t=><div key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 18px",cursor:"pointer",fontSize:13,fontWeight:600,borderBottom:`2px solid ${tab===t.k?C.gold:"transparent"}`,color:tab===t.k?C.gold:C.muted,whiteSpace:"nowrap"}}>{t.l}</div>)}
    </div>

    {/* ── VEÍCULOS ── */}
    {tab==="veic"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {veiculos.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum veículo cadastrado.</span></Card>}
      {veiculos.map(v=>{
        const tech=users.find(u=>u.id===v.tecnicoId);
        const oleo=getAlertaOleo(v);
        const temFoto=v.fotos?.some(f=>f);
        return <Card key={v.id} style={{padding:16,borderLeft:`3px solid ${STATUS_COLOR[v.status]||C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>{v.placa}</span>
                <span style={{fontSize:14,fontWeight:700,color:C.txt}}>{v.modelo} {v.ano}</span>
                <Bdg color={v.status==="ativo"?"grn":v.status==="manutenção"?"ylw":"red"}>{v.status}</Bdg>
                {oleo.urgente&&<Bdg color="red">🔴 Óleo URGENTE!</Bdg>}
                {!oleo.urgente&&oleo.alerta&&<Bdg color="ylw">🟡 Óleo em breve</Bdg>}
                {v.docPDF&&<Bdg color="muted">📄 Doc. Anexado</Bdg>}
              </div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:12,color:C.muted,marginBottom:8}}>
                {v.cor&&<span>🎨 {v.cor}</span>}
                <span>👷 {tech?.name||"—"}</span>
                {v.dtAquisicao&&<span>📅 {v.dtAquisicao}</span>}
                <span style={{fontFamily:"'JetBrains Mono',monospace",color:C.blue}}>🛣️ {fmt(oleo.kmAtual)} km</span>
                {oleo.alerta&&<span style={{color:oleo.urgente?C.red:C.ylw,fontWeight:700}}>⚙️ Faltam {fmt(oleo.faltam)} km</span>}
              </div>
              {v.obs&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic",marginBottom:8}}>{v.obs}</div>}
              {temFoto&&<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {v.fotos?.map((foto,i)=>foto?(
                  <div key={i} style={{position:"relative",cursor:"pointer"}} onClick={()=>setModalFotos(v)}>
                    <img src={foto} alt={FOTOS_LABELS[i]} style={{width:64,height:52,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bdr2}`}}/>
                    <div style={{position:"absolute",bottom:2,left:2,background:"#000000bb",color:"#fff",fontSize:8,padding:"1px 4px",borderRadius:3}}>{FOTOS_ICONS[i]}</div>
                  </div>
                ):null)}
              </div>}
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,flexShrink:0}}>
              {renderCheckBtn(v)}
              {v.docPDF&&<Btn size="xs" color="ghost" outline onClick={()=>setModalDoc(v)}>📄 Documento</Btn>}
              {isAdm&&<>
                {temFoto&&<Btn size="xs" color="ghost" outline onClick={()=>setModalFotos(v)}>🖼️</Btn>}
                <Btn size="xs" color="gold" outline onClick={()=>{setFormVeic({...v,fotos:v.fotos||["","","",""],docPDF:v.docPDF||""});setModalVeic(v.id);setErrVeic("");}}>Editar</Btn>
                <Btn size="xs" color="red" outline onClick={()=>{if(window.confirm(`Excluir ${v.placa}?`)){setVeiculos(p=>p.filter(x=>x.id!==v.id));addLog(currentUser.name,"Frota","Excluído: "+v.placa);}}}>✕</Btn>
              </>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* ── ABASTECIMENTO ── */}
    {tab==="abast"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {viewAbast.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum abastecimento registrado.</span></Card>}
      {viewAbast.map(a=>{
        const v=veiculos.find(x=>x.id===a.veiculoId);
        const tech=users.find(u=>u.id===a.tecnicoId);
        return <Card key={a.id} style={{padding:14,borderLeft:`3px solid ${C.gold}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:4}}>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:12,color:C.txt}}>{v?.modelo||""}</span>
                <Bdg color="gold">{a.combustivel}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:10,color:C.muted}}>{a.dtAbast}</span>
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:12}}>
                <span style={{color:C.grn,fontWeight:700}}>R$ {(parseFloat(a.valor)||0).toFixed(2)}</span>
                <span style={{color:C.muted}}>{a.litros}L</span>
                <span style={{color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>🛣️ {fmt(parseInt(a.odometro)||0)} km</span>
                {a.litros&&a.valor&&parseFloat(a.litros)>0&&<span style={{color:C.muted}}>R$ {(parseFloat(a.valor)/parseFloat(a.litros)).toFixed(2)}/L</span>}
                {a.posto&&<span style={{color:C.muted}}>📍 {a.posto}</span>}
              </div>
              {!isTec&&<div style={{fontSize:10,color:C.muted,marginTop:3}}>👷 {tech?.name||"?"}</div>}
            </div>
            {a.foto&&<img src={a.foto} alt="nota" style={{width:56,height:56,objectFit:"cover",borderRadius:8,border:`1px solid ${C.bdr2}`,cursor:"pointer",flexShrink:0}} onClick={()=>window.open(a.foto,"_blank")}/>}
          </div>
        </Card>;
      })}
    </div>}

    {/* ── CHECKLIST ── */}
    {tab==="check"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {viewCheck.length===0&&<Card style={{padding:30,textAlign:"center"}}><span style={{color:C.muted}}>Nenhum checklist registrado. Clique em "📋 Retirada" para iniciar.</span></Card>}
      {viewCheck.map(c=>{
        const v=veiculos.find(x=>x.id===c.veiculoId);
        const tech=users.find(u=>u.id===c.tecnicoId);
        const pneuProb=Object.values(c.pneus||{}).some(p=>p==="problema");
        const pneuBaixo=Object.values(c.pneus||{}).some(p=>p==="baixo");
        return <Card key={c.id} style={{padding:16,borderLeft:`3px solid ${c.tipo==="retirada"?C.gold:C.grn}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:8}}>
                <Bdg color={c.tipo==="retirada"?"gold":"grn"}>{c.tipo==="retirada"?"🚗 Retirada":"↩️ Devolução"}</Bdg>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:14}}>{v?.placa||"?"}</span>
                <span style={{fontSize:13,color:C.txt}}>{v?.modelo||""}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted}}>{c.dtCheck}</span>
                {!isTec&&<span style={{fontSize:11,color:C.muted}}>· {tech?.name||"?"}</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginBottom:8}}>
                <div style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:2}}>QUILOMETRAGEM</div>
                  <div style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.blue,fontSize:14}}>{fmt(parseInt(c.km)||0)} km</div>
                </div>
                <div style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:2}}>COMBUSTÍVEL</div>
                  <div style={{fontWeight:700,color:COMB_COLOR[c.combustivel]||C.gold,fontSize:13}}>⛽ {c.combustivel}</div>
                </div>
                <div style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:2}}>PNEUS</div>
                  <div style={{fontWeight:700,color:pneuProb?C.red:pneuBaixo?C.ylw:C.grn,fontSize:13}}>{pneuProb?"❌ Problema":pneuBaixo?"⚠️ Baixo":"✅ OK"}</div>
                </div>
                <div style={{background:C.surf,borderRadius:8,padding:"8px 10px",border:`1px solid ${C.bdr}`}}>
                  <div style={{fontSize:10,color:C.muted,marginBottom:2}}>AVARIAS</div>
                  <div style={{fontWeight:700,color:c.avarias?C.red:C.grn,fontSize:13}}>{c.avarias?"⚠️ Sim":"✅ Não"}</div>
                </div>
              </div>
              {c.avarias&&c.descAvarias&&<div style={{fontSize:12,color:C.ylw,marginBottom:6}}>⚠️ {c.descAvarias}</div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {c.fotoOdometro&&<img src={c.fotoOdometro} alt="odômetro" style={{width:60,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.bdr2}`,cursor:"pointer"}} onClick={()=>window.open(c.fotoOdometro,"_blank")}/>}
                {c.fotosAvarias?.filter(f=>f).map((foto,i)=><img key={i} src={foto} alt={`avaria ${i+1}`} style={{width:60,height:50,objectFit:"cover",borderRadius:6,border:`1px solid ${C.red}44`,cursor:"pointer"}} onClick={()=>window.open(foto,"_blank")}/>)}
              </div>
              {c.obs&&<div style={{fontSize:11,color:C.muted,fontStyle:"italic",marginTop:6}}>{c.obs}</div>}
            </div>
          </div>
        </Card>;
      })}
    </div>}

    {/* ── MODAL DOCUMENTO ── */}
    {modalDoc&&<div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:700,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:C.txt}}>📄 Documento — {modalDoc.placa} {modalDoc.modelo}</span>
          <div style={{display:"flex",gap:8}}>
            <Btn size="sm" color="gold" onClick={()=>window.open(modalDoc.docPDF,"_blank")}>⬇️ Abrir PDF</Btn>
            <button onClick={()=>setModalDoc(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,padding:20,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <iframe src={modalDoc.docPDF} title="Documento" style={{width:"100%",height:"60vh",border:"none",borderRadius:8,background:"#fff"}}/>
        </div>
      </div>
    </div>}

    {/* ── MODAL FOTOS ── */}
    {modalFotos&&<div style={{position:"fixed",inset:0,background:"#000000ee",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:12,width:"100%",maxWidth:700,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <span style={{fontSize:15,fontWeight:700,color:C.txt}}>🖼️ Fotos — {modalFotos.placa} {modalFotos.modelo}</span>
          <button onClick={()=>setModalFotos(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr",gap:12}}>
            {FOTOS_LABELS.map((label,i)=>(
              <div key={i} style={{borderRadius:10,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
                <div style={{background:C.surf,padding:"7px 12px",fontSize:11,fontWeight:700,color:C.gold}}>{FOTOS_ICONS[i]} {label}</div>
                {modalFotos.fotos?.[i]?<img src={modalFotos.fotos[i]} alt={label} style={{width:"100%",height:180,objectFit:"cover",cursor:"pointer"}} onClick={()=>window.open(modalFotos.fotos[i],"_blank")}/>:<div style={{height:180,background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13}}>Sem foto</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>}

    {/* ── MODAL CADASTRO VEÍCULO ── */}
    {modalVeic&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:660,height:isMobile?"95vh":"92vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>🚗 {modalVeic==="new"?"Cadastrar":"Editar"} Veículo</h2>
          <button onClick={()=>setModalVeic(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          {/* Dados */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📋 DADOS DO VEÍCULO</div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
              <Inp label="Placa *" value={formVeic.placa} onChange={v=>setFormVeic(f=>({...f,placa:v.toUpperCase()}))} placeholder="ABC-1234"/>
              <Inp label="Modelo *" value={formVeic.modelo} onChange={v=>setFormVeic(f=>({...f,modelo:v}))} placeholder="Ex: Fiat Toro"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Ano" value={formVeic.ano} onChange={v=>setFormVeic(f=>({...f,ano:v}))} type="number" placeholder="2024"/>
              <Inp label="Cor" value={formVeic.cor} onChange={v=>setFormVeic(f=>({...f,cor:v}))} placeholder="Branco"/>
              <Inp label="KM no Cadastro" value={formVeic.kmCadastro} onChange={v=>setFormVeic(f=>({...f,kmCadastro:v}))} type="number" placeholder="45000"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Inp label="Data de Aquisição" value={formVeic.dtAquisicao} onChange={v=>setFormVeic(f=>({...f,dtAquisicao:v}))} type="date"/>
              <Sel label="Técnico Responsável" value={formVeic.tecnicoId} onChange={v=>setFormVeic(f=>({...f,tecnicoId:v}))} options={[{value:"",label:"— Sem responsável —"},...techs.map(t=>({value:t.id,label:t.name}))]}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10,marginTop:10}}>
              <Sel label="Status" value={formVeic.status} onChange={v=>setFormVeic(f=>({...f,status:v}))} options={STATUS_OPTS.map(s=>({value:s,label:s.charAt(0).toUpperCase()+s.slice(1)}))}/>
              <Inp label="Observações" value={formVeic.obs} onChange={v=>setFormVeic(f=>({...f,obs:v}))} placeholder="Obs opcionais"/>
            </div>
          </div>
          {/* Documento PDF */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:10}}>📄 DOCUMENTO DO VEÍCULO (PDF)</div>
            {formVeic.docPDF?(
              <div style={{display:"flex",alignItems:"center",gap:12,background:C.card,borderRadius:8,padding:"12px 14px",border:`1px solid ${C.bdr2}`}}>
                <span style={{fontSize:28}}>📄</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600,color:C.grn}}>✓ Documento anexado</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>Clique para visualizar</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn size="xs" color="gold" onClick={()=>window.open(formVeic.docPDF,"_blank")}>Ver PDF</Btn>
                  <button onClick={()=>setFormVeic(f=>({...f,docPDF:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600}}>✕</button>
                </div>
              </div>
            ):(
              <label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:C.card,border:`2px dashed ${C.bdr2}`,borderRadius:8,padding:"14px 18px"}}>
                <span style={{fontSize:28}}>📄</span>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:C.txt}}>Anexar documento do veículo</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:2}}>PDF · Máx 5MB (CRVL, licenciamento, seguro...)</div>
                </div>
                <input type="file" accept=".pdf,application/pdf" onChange={handleDocPDF} style={{display:"none"}}/>
              </label>
            )}
          </div>
          {/* Upload 4 fotos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,letterSpacing:".06em",textTransform:"uppercase",marginBottom:12}}>📸 FOTOS DO VEÍCULO</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {FOTOS_LABELS.map((label,i)=>(
                <div key={i} style={{borderRadius:8,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
                  <div style={{background:C.card,padding:"6px 10px",fontSize:11,fontWeight:700,color:C.muted}}>{FOTOS_ICONS[i]} {label}</div>
                  {formVeic.fotos?.[i]?(
                    <div style={{position:"relative"}}>
                      <img src={formVeic.fotos[i]} alt={label} style={{width:"100%",height:110,objectFit:"cover"}}/>
                      <button onClick={()=>setFormVeic(f=>({...f,fotos:f.fotos.map((ft,j)=>j===i?"":ft)}))} style={{position:"absolute",top:4,right:4,background:"#000000bb",color:"#fff",border:"none",borderRadius:4,width:22,height:22,cursor:"pointer",fontSize:12,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                  ):(
                    <label style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:110,cursor:"pointer",background:C.bg,gap:4}}>
                      <span style={{fontSize:22}}>📷</span>
                      <span style={{fontSize:10,color:C.muted}}>Adicionar foto</span>
                      <input type="file" accept="image/*" capture="environment" onChange={e=>handleFotoVeic(i,e)} style={{display:"none"}}/>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
          {errVeic&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errVeic}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalVeic(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarVeic}>✅ Salvar Veículo</Btn>
        </div>
      </div>
    </div>}

    {/* ── MODAL ABASTECIMENTO ── */}
    {modalAbast&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:560,height:isMobile?"95vh":"90vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>⛽ Registrar Abastecimento</h2>
          <button onClick={()=>setModalAbast(false)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="Veículo *" value={formAbast.veiculoId} onChange={v=>setFormAbast(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar veículo —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
            <Inp label="Data *" value={formAbast.dtAbast} onChange={v=>setFormAbast(f=>({...f,dtAbast:v}))} type="date"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr",gap:10}}>
            <Sel label="Combustível" value={formAbast.combustivel} onChange={v=>setFormAbast(f=>({...f,combustivel:v}))} options={COMB_OPTS.map(c=>({value:c,label:c.charAt(0).toUpperCase()+c.slice(1)}))}/>
            <Inp label="Litros *" value={formAbast.litros} onChange={v=>setFormAbast(f=>({...f,litros:v}))} type="number" placeholder="0,00"/>
            <Inp label="Valor R$ *" value={formAbast.valor} onChange={v=>setFormAbast(f=>({...f,valor:v}))} type="number" placeholder="0,00"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Inp label="Odômetro (Km) *" value={formAbast.odometro} onChange={v=>setFormAbast(f=>({...f,odometro:v}))} type="number" placeholder="Ex: 45320"/>
            <Inp label="Posto / Local" value={formAbast.posto} onChange={v=>setFormAbast(f=>({...f,posto:v}))} placeholder="Nome do posto"/>
          </div>
          {formAbast.litros&&formAbast.valor&&parseFloat(formAbast.litros)>0&&<div style={{background:`${C.gold}15`,border:`1px solid ${C.gold}44`,borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:12,color:C.muted}}>Preço por litro:</span>
            <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:800,color:C.gold,fontSize:16}}>R$ {(parseFloat(formAbast.valor)/parseFloat(formAbast.litros)).toFixed(2)}/L</span>
          </div>}
          <div style={{background:C.surf,border:`1px solid ${C.bdr}`,borderRadius:10,padding:14}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",marginBottom:10}}>📸 Foto da Nota Fiscal</div>
            {formAbast.foto?(<div style={{display:"flex",alignItems:"center",gap:12}}><img src={formAbast.foto} alt="nota" style={{width:80,height:80,objectFit:"cover",borderRadius:8,border:`2px solid ${C.gold}55`}}/><button onClick={()=>setFormAbast(f=>({...f,foto:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>✕ Remover</button></div>
            ):(<label style={{display:"flex",alignItems:"center",gap:12,cursor:"pointer",background:C.card,border:`2px dashed ${C.bdr2}`,borderRadius:8,padding:"12px 16px"}}><span style={{fontSize:24}}>📷</span><div><div style={{fontSize:13,fontWeight:600,color:C.txt}}>Tirar foto da nota</div><div style={{fontSize:11,color:C.muted}}>JPG, PNG · Máx 3MB</div></div><input type="file" accept="image/*" capture="environment" onChange={handleFotoAbast} style={{display:"none"}}/></label>)}
          </div>
          {errAbast&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errAbast}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalAbast(false)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarAbast}>✅ Registrar Abastecimento</Btn>
        </div>
      </div>
    </div>}

    {/* ── MODAL CHECKLIST RETIRADA/DEVOLUÇÃO ── */}
    {modalCheck&&<div style={{position:"fixed",inset:0,background:"#000000cc",zIndex:1000,display:"flex",alignItems:isMobile?"flex-end":"center",justifyContent:"center",padding:isMobile?0:16}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:isMobile?"16px 16px 0 0":12,width:"100%",maxWidth:640,height:isMobile?"95vh":"92vh",display:"flex",flexDirection:"column",position:isMobile?"absolute":"relative",bottom:isMobile?0:"auto"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.bdr}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <div>
            <h2 style={{fontSize:15,fontWeight:700,color:C.txt}}>{formCheck.tipo==="retirada"?"🚗 Checklist de Retirada":"↩️ Checklist de Devolução"}</h2>
            <div style={{fontSize:11,color:C.muted,marginTop:2}}>Registre as condições do veículo</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <div style={{display:"flex",borderRadius:8,overflow:"hidden",border:`1px solid ${C.bdr2}`}}>
              {["retirada","devolucao"].map(t=>(
                <div key={t} onClick={()=>setFormCheck(f=>({...f,tipo:t}))} style={{padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:600,background:formCheck.tipo===t?C.gold:"transparent",color:formCheck.tipo===t?"#000":C.muted}}>
                  {t==="retirada"?"🚗 Retirada":"↩️ Devolução"}
                </div>
              ))}
            </div>
            <button onClick={()=>setModalCheck(null)} style={{background:C.surf,color:C.muted,width:32,height:32,borderRadius:8,fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 20px",display:"flex",flexDirection:"column",gap:14}}>
          {/* Veículo e data */}
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>
            <Sel label="Veículo *" value={formCheck.veiculoId} onChange={v=>setFormCheck(f=>({...f,veiculoId:v}))} options={[{value:"",label:"— Selecionar veículo —"},...veiculos.map(v=>({value:v.id,label:`${v.placa} — ${v.modelo}`}))]}/>
            <Inp label="Data" value={formCheck.dtCheck} onChange={v=>setFormCheck(f=>({...f,dtCheck:v}))} type="date"/>
          </div>

          {/* Quilometragem */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:10}}>🛣️ QUILOMETRAGEM *</div>
            <Inp label="KM Atual" value={formCheck.km} onChange={v=>setFormCheck(f=>({...f,km:v}))} type="number" placeholder="Ex: 45320"/>
          </div>

          {/* Nível de combustível */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>⛽ NÍVEL DE COMBUSTÍVEL</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {COMB_NÍVEL.map(n=>(
                <div key={n} onClick={()=>setFormCheck(f=>({...f,combustivel:n}))}
                  style={{padding:"10px 16px",borderRadius:8,cursor:"pointer",border:`2px solid ${formCheck.combustivel===n?COMB_COLOR[n]:C.bdr2}`,background:formCheck.combustivel===n?`${COMB_COLOR[n]}22`:"transparent",flex:1,textAlign:"center"}}>
                  <div style={{fontSize:16,marginBottom:4}}>⛽</div>
                  <div style={{fontSize:12,fontWeight:700,color:formCheck.combustivel===n?COMB_COLOR[n]:C.muted}}>{n.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pneus */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>🔄 CONDIÇÃO DOS PNEUS</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[["diant_esq","Diant. Esquerdo","↙️"],["diant_dir","Diant. Direito","↘️"],["tras_esq","Tras. Esquerdo","↖️"],["tras_dir","Tras. Direito","↗️"]].map(([key,label,icon])=>(
                <div key={key} style={{background:C.card,borderRadius:8,padding:"10px 12px",border:`1px solid ${C.bdr2}`}}>
                  <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{icon} {label}</div>
                  <div style={{display:"flex",gap:6}}>
                    {PNEU_OPTS.map(p=>(
                      <div key={p} onClick={()=>setFormCheck(f=>({...f,pneus:{...f.pneus,[key]:p}}))}
                        style={{flex:1,textAlign:"center",padding:"6px 4px",borderRadius:6,cursor:"pointer",border:`2px solid ${formCheck.pneus?.[key]===p?PNEU_COLOR[p]:C.bdr2}`,background:formCheck.pneus?.[key]===p?`${PNEU_COLOR[p]}22`:"transparent",fontSize:10,fontWeight:700,color:formCheck.pneus?.[key]===p?PNEU_COLOR[p]:C.muted}}>
                        {PNEU_ICON[p]}<br/>{p}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Avarias */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${formCheck.avarias?`${C.ylw}55`:C.bdr}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:formCheck.avarias?12:0}}>
              <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",flex:1}}>⚠️ AVARIAS VISÍVEIS</div>
              <div style={{display:"flex",gap:8}}>
                {[{v:false,l:"✅ Sem avarias"},{v:true,l:"⚠️ Com avarias"}].map(opt=>(
                  <div key={String(opt.v)} onClick={()=>setFormCheck(f=>({...f,avarias:opt.v}))}
                    style={{padding:"7px 14px",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600,border:`2px solid ${formCheck.avarias===opt.v?(opt.v?C.ylw:C.grn):C.bdr2}`,background:formCheck.avarias===opt.v?`${opt.v?C.ylw:C.grn}22`:"transparent",color:formCheck.avarias===opt.v?(opt.v?C.ylw:C.grn):C.muted}}>
                    {opt.l}
                  </div>
                ))}
              </div>
            </div>
            {formCheck.avarias&&<div>
              <label style={{fontSize:11,fontWeight:600,color:C.muted,textTransform:"uppercase",display:"block",marginBottom:6}}>Descrição das avarias</label>
              <textarea value={formCheck.descAvarias} onChange={e=>setFormCheck(f=>({...f,descAvarias:e.target.value}))} rows={3} placeholder="Descreva as avarias encontradas..."
                style={{width:"100%",background:C.card,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"10px 14px",color:C.txt,fontSize:13,resize:"vertical",fontFamily:"'Inter',sans-serif"}}/>
            </div>}
          </div>

          {/* Fotos */}
          <div style={{background:C.surf,borderRadius:10,padding:14,border:`1px solid ${C.bdr}`}}>
            <div style={{fontSize:11,fontWeight:700,color:C.gold,textTransform:"uppercase",letterSpacing:".06em",marginBottom:12}}>📸 FOTOS</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {/* Foto odômetro */}
              <div>
                <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>📟 Foto do Odômetro</div>
                {formCheck.fotoOdometro?(
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <img src={formCheck.fotoOdometro} alt="odômetro" style={{width:80,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.gold}55`}}/>
                    <button onClick={()=>setFormCheck(f=>({...f,fotoOdometro:""}))} style={{background:C.redD,color:C.red,border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontSize:12}}>✕ Remover</button>
                  </div>
                ):(
                  <label style={{display:"inline-flex",alignItems:"center",gap:8,cursor:"pointer",background:C.card,border:`1.5px dashed ${C.bdr2}`,borderRadius:8,padding:"10px 16px"}}>
                    <span style={{fontSize:20}}>📷</span><span style={{fontSize:12,color:C.muted}}>Fotografar odômetro</span>
                    <input type="file" accept="image/*" capture="environment" onChange={handleFotoOdo} style={{display:"none"}}/>
                  </label>
                )}
              </div>
              {/* Fotos avarias */}
              {formCheck.avarias&&<div>
                <div style={{fontSize:11,color:C.muted,marginBottom:6,fontWeight:600}}>⚠️ Fotos das Avarias (até 3)</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {formCheck.fotosAvarias.map((foto,i)=>foto?(
                    <div key={i} style={{position:"relative"}}>
                      <img src={foto} alt={`avaria ${i+1}`} style={{width:80,height:70,objectFit:"cover",borderRadius:8,border:`2px solid ${C.ylw}55`}}/>
                      <button onClick={()=>setFormCheck(f=>({...f,fotosAvarias:f.fotosAvarias.map((ft,j)=>j===i?"":ft)}))} style={{position:"absolute",top:2,right:2,background:"#000000bb",color:"#fff",border:"none",borderRadius:4,width:18,height:18,cursor:"pointer",fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
                    </div>
                  ):(
                    <label key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:80,height:70,cursor:"pointer",background:C.card,border:`1.5px dashed ${C.bdr2}`,borderRadius:8,gap:3}}>
                      <span style={{fontSize:18}}>📷</span><span style={{fontSize:9,color:C.muted}}>Avaria {i+1}</span>
                      <input type="file" accept="image/*" capture="environment" onChange={e=>handleFotoAvaria(i,e)} style={{display:"none"}}/>
                    </label>
                  ))}
                </div>
              </div>}
            </div>
          </div>

          <Inp label="Observações" value={formCheck.obs} onChange={v=>setFormCheck(f=>({...f,obs:v}))} placeholder="Observações adicionais"/>
          {errCheck&&<div style={{background:C.redD,border:`1px solid ${C.red}44`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:13}}>⚠️ {errCheck}</div>}
        </div>
        <div style={{padding:"14px 20px",borderTop:`1px solid ${C.bdr}`,background:C.surf,flexShrink:0,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn color="ghost" outline onClick={()=>setModalCheck(null)}>Cancelar</Btn>
          <Btn color="gold" onClick={salvarCheck}>✅ Registrar {formCheck.tipo==="retirada"?"Retirada":"Devolução"}</Btn>
        </div>
      </div>
    </div>}
  </div>;
}

export default FrotaPage;
