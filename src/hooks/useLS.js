// src/hooks/useLS.js
import { useState, useEffect } from "react";
import { sbGet, sbSet } from "../lib/supabase";

export const useLS = (key, initial) => {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });

  useEffect(() => {
    sbGet(key).then(remote => {
      if (remote !== null) {
        setVal(remote);
        try { localStorage.setItem(key, JSON.stringify(remote)); } catch {}
      }
    }).catch(() => {});
  }, [key]);

  const set = (v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      try { localStorage.setItem(key, JSON.stringify(next)); } catch {}
      sbSet(key, next).catch(() => {});
      return next;
    });
  };

  return [val, set];
};
export default useLS;
