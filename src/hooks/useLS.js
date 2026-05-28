// src/hooks/useLS.js
import { useState, useEffect } from "react";
import { sbGet, sbSet } from "../lib/supabase";

const tsKey = k => `${k}__ts`;

export const useLS = (key, initial) => {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });

  useEffect(() => {
    sbGet(key).then(remote => {
      if (remote !== null && !remote.empty) {
        const localTs = localStorage.getItem(tsKey(key)) || "0";
        const remoteTs = remote.updated_at || "0";
        // só aplica dado remoto se for mais recente que o salvo localmente
        if (remoteTs > localTs) {
          setVal(remote.value);
          try {
            localStorage.setItem(key, JSON.stringify(remote.value));
            localStorage.setItem(tsKey(key), remoteTs);
          } catch {}
        }
      }
    }).catch(() => {});
  }, [key]);

  const set = (v) => {
    setVal(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      const ts = new Date().toISOString();
      try {
        localStorage.setItem(key, JSON.stringify(next));
        localStorage.setItem(tsKey(key), ts);
      } catch {}
      sbSet(key, next).catch(() => {});
      return next;
    });
  };

  return [val, set];
};
export default useLS;
