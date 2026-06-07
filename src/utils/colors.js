export const C={
  bg:"#070707",
  surf:"#101010",
  card:"#171717",
  card2:"#1d1d1f",
  bdr:"#2d2d2d",
  bdr2:"#3a3a3a",
  gold:"#d10000",
  goldD:"#d1000026",
  goldL:"#ff1a1a",
  red:"#d10000",
  redD:"#d1000026",
  grn:"#00c853",
  grnD:"#00c85322",
  ylw:"#ff9800",
  ylwD:"#ff980022",
  blue:"#2196f3",
  blueD:"#2196f322",
  txt:"#ffffff",
  txt2:"#d6d6d6",
  muted:"#9a9a9a",
  muted2:"#666666",
  glass:"rgba(20,20,22,.82)",
  shadow:"0 18px 45px rgba(0,0,0,.45)",
  glow:"0 0 28px rgba(209,0,0,.20)"
};

export const PIE=["#d10000","#ff9800","#ffd54f","#00c853","#2196f3","#9c27b0","#9e9e9e","#607d8b"];

export const catColor=(name,i)=>{
  const n=String(name||"").toLowerCase();
  if(n.includes("equip"))return "#d10000";
  if(n.includes("cabo"))return "#2196f3";
  if(n.includes("conector"))return "#00c853";
  if(n.includes("caixa"))return "#ff9800";
  if(n.includes("acess"))return "#ffd54f";
  if(n.includes("ferrament"))return "#9c27b0";
  if(n.includes("prevent"))return "#00bcd4";
  return PIE[i%PIE.length];
};

export const consumptionColor=(pct)=> pct>=75?"#d10000":pct>=50?"#ff9800":"#00c853";
