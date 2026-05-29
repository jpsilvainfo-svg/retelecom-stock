// src/components/layout/Sidebar.jsx
import React, { useState, useEffect } from "react";
import { C, ALL_MODULES, DEFAULT_PERMS } from "../../lib/constants";
import { Btn, Bdg } from "../ui";

function Sidebar({ user, page, setPage, onLogout, customization = {} }) {
  const perms = user.perms || DEFAULT_PERMS[user.role] || ["dash"];

  // Aplica ordem e visibilidade customizadas
  const menuOrder = customization.menuOrder || ALL_MODULES.map(m => m.k);
  const menuHidden = customization.menuHidden || [];
  const menuLabels = customization.menuLabels || {};
  const menuIcons = customization.menuIcons || {};
  const accentColor = customization.accentColor || C.gold;
  const sidebarBg = customization.sidebarBg || C.surf;
  const companyName = customization.companyName || "StockTel";
  const companySlogan = customization.companySlogan || "Soluções em Telecomunicações";
  const logoUrl = customization.logoUrl || null;

  // Monta nav na ordem customizada, respeitando perms e visibilidade
  const nav = menuOrder
    .map(k => ALL_MODULES.find(m => m.k === k))
    .filter(m => m && perms.includes(m.k) && !menuHidden.includes(m.k))
    .map(m => ({
      k: m.k,
      icon: menuIcons[m.k] || m.icon,
      label: menuLabels[m.k] || m.l,
    }));

  const roleBadge = user.role === "superadmin" ? "ROOT" : user.role === "admin" ? "ADM" : user.role === "estoque" ? "EST" : user.role === "financeiro" ? "FIN" : user.role === "mecanico" ? "MEC" : "TEC";

  return (
    <div style={{ width: 220, minWidth: 220, background: sidebarBg, borderRight: `1px solid ${C.bdr}`, display: "flex", flexDirection: "column", height: "100vh", flexShrink: 0 }}>
      {/* Logo / Nome */}
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.bdr}33`, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 64 }}>
        {logoUrl
          ? <img src={logoUrl} alt={companyName} style={{ maxWidth: "100%", maxHeight: 48, objectFit: "contain" }} />
          : <span style={{ fontSize: 15, fontWeight: 800, color: accentColor, letterSpacing: ".02em" }}>{companyName}</span>
        }
      </div>
      <div style={{ padding: "6px 16px 8px", borderBottom: `1px solid ${C.bdr}22` }}>
        <div style={{ fontSize: 10, color: C.muted2, lineHeight: 1.4 }}>{companySlogan}</div>
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: "8px", overflowY: "auto" }}>
        {nav.map(n => (
          <div key={n.k} onClick={() => setPage(n.k)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
              background: page === n.k ? `${accentColor}22` : "transparent",
              borderLeft: page === n.k ? `3px solid ${accentColor}` : "3px solid transparent",
              color: page === n.k ? accentColor : C.muted,
              fontWeight: page === n.k ? 600 : 400, fontSize: 13,
              transition: "all .15s",
            }}>
            <span style={{ fontSize: 15 }}>{n.icon}</span>
            <span>{n.label}</span>
          </div>
        ))}
      </nav>

      {/* Usuário logado */}
      <div style={{ padding: "10px", borderTop: `1px solid ${C.bdr}33` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px", background: C.card, borderRadius: 8, marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${accentColor}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, overflow: "hidden" }}>
            {user.photo ? <img src={user.photo} alt={user.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>👤</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: C.txt, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</div>
            <div style={{ fontSize: 9, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
          </div>
          <span style={{ background: accentColor, color: "#000", fontSize: 8, fontWeight: 800, padding: "1px 4px", borderRadius: 3, flexShrink: 0, letterSpacing: ".03em" }}>{roleBadge}</span>
        </div>
        <div onClick={() => window.dispatchEvent(new CustomEvent("openPerfil"))} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", color: C.muted, fontSize: 12, borderRadius: 6 }}>
          <span>⚙️</span>Meu Perfil
        </div>
        <div onClick={onLogout} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer", color: C.muted, fontSize: 12, borderRadius: 6 }}>
          <span>🚪</span>Sair
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
