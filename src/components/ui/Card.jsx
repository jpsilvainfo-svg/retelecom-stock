// src/components/ui/Card.jsx
import React, { useState, useEffect } from "react";
import { C } from "../../lib/constants";

function Card({children,style:sx={},onClick}){
  return <div onClick={onClick} style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:12,...sx}}>{children}</div>;
}

export default Card;
