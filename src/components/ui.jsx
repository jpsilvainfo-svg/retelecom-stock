import { C } from "../utils/colors.js";

export function Btn({children,onClick,color="gold",size="md",disabled,style:sx={},outline,full}){
  const pal={
    gold:{bg:`linear-gradient(135deg,${C.gold},${C.goldL})`,solid:C.gold,fg:"#fff"},
    red:{bg:`linear-gradient(135deg,${C.red},${C.goldL})`,solid:C.red,fg:"#fff"},
    grn:{bg:`linear-gradient(135deg,${C.grn},#0fdc68)`,solid:C.grn,fg:"#061107"},
    ghost:{bg:"transparent",solid:C.bdr2,fg:C.muted}
  };
  const p=pal[color]||pal.gold;
  const sz={xs:{padding:"5px 11px",fontSize:11},sm:{padding:"8px 15px",fontSize:12},md:{padding:"11px 21px",fontSize:13},lg:{padding:"14px 25px",fontSize:15}}[size];
  return <button onClick={onClick} disabled={disabled} style={{
    background:outline?"rgba(255,255,255,.02)":p.bg,
    color:outline?p.solid:p.fg,
    border:outline?`1px solid ${p.solid}`:"1px solid rgba(255,255,255,.06)",
    borderRadius:12,
    fontWeight:800,
    opacity:disabled?.45:1,
    width:full?"100%":"auto",
    transition:"all .22s ease",
    boxShadow:outline?"none":`0 10px 22px ${color==="ghost"?"rgba(0,0,0,.22)":"rgba(209,0,0,.22)"}`,
    letterSpacing:".01em",
    ...sz,
    ...sx
  }}>{children}</button>;
}

export function Inp({label,value,onChange,type="text",placeholder,style:sx={}}){
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>{label}</label>}
    <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:14,width:"100%",...sx}}/>
  </div>;
}

export function Sel({label,value,onChange,options,style:sx={}}){
  return <div style={{display:"flex",flexDirection:"column",gap:5}}>
    {label&&<label style={{fontSize:11,fontWeight:600,color:C.muted,letterSpacing:".06em",textTransform:"uppercase"}}>{label}</label>}
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{background:C.surf,border:`1px solid ${C.bdr2}`,borderRadius:8,padding:"11px 14px",color:C.txt,fontSize:14,width:"100%",...sx}}>
      {options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}
    </select>
  </div>;
}

export function Card({children,style:sx={},onClick}){
  return <div onClick={onClick} style={{
    background:`linear-gradient(180deg,rgba(255,255,255,.045),rgba(255,255,255,.012)),${C.card}`,
    border:`1px solid ${C.bdr}`,
    borderTop:`1px solid rgba(255,255,255,.08)`,
    borderRadius:18,
    boxShadow:C.shadow,
    backdropFilter:"blur(10px)",
    position:"relative",
    overflow:"hidden",
    transition:"transform .22s ease, box-shadow .22s ease, border-color .22s ease",
    ...sx
  }}>{children}</div>;
}

export function Bdg({children,color="gold"}){
  const p={gold:{bg:C.goldD,fg:C.gold},red:{bg:C.redD,fg:C.red},grn:{bg:C.grnD,fg:C.grn},ylw:{bg:C.ylwD,fg:C.ylw},muted:{bg:"#88888820",fg:C.muted}}[color]||{bg:C.goldD,fg:C.gold};
  return <span style={{background:p.bg,color:p.fg,padding:"3px 10px",borderRadius:5,fontSize:11,fontWeight:700,display:"inline-flex",alignItems:"center",whiteSpace:"nowrap"}}>{children}</span>;
}

export function Modal({title,children,onClose,isMobile}){
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

export function THead({cols}){
  return <tr>{cols.map((c,i)=><th key={i} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:700,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",background:C.surf,borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{c}</th>)}</tr>;
}

export function TRow({cells}){
  return <tr style={{borderBottom:`1px solid ${C.bdr}22`}}>
    {cells.map((c,i)=><td key={i} style={{padding:"10px 12px",fontSize:13,color:C.txt2,verticalAlign:"middle"}}>{c}</td>)}
  </tr>;
}
