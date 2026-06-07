import { useEffect, useState } from "react";

export const useIsMobile=()=>{
  const[m,setM]=useState(()=>window.innerWidth<768);
  useEffect(()=>{
    const h=()=>setM(window.innerWidth<768);
    window.addEventListener("resize",h);
    return()=>window.removeEventListener("resize",h);
  },[]);
  return m;
};
