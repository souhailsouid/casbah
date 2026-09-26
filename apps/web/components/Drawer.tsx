"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

/** Panneau latéral générique (réservation, cadeau, devis, carte). */
export default function Drawer({
  id,
  open,
  onClose,
  label,
  titre,
  head,
  wide,
  children,
  foot,
  bodyStyle,
}: {
  id: string;
  open: boolean;
  onClose: () => void;
  label: string;
  titre: string;
  head?: ReactNode;
  wide?: boolean;
  children: ReactNode;
  foot?: ReactNode;
  bodyStyle?: React.CSSProperties;
}) {
  const { t } = useI18n();
  return (
    <div id={id} className={"drawer" + (open ? " open" : "")} role="dialog" aria-modal="true" aria-label={label} aria-hidden={!open}>
      <div className="veil" onClick={onClose} />
      <div className={"panel" + (wide ? " wide" : "")}>
        <div className="r-head">
          <b>{titre}</b>
          {head}
          <button className="r-close" type="button" onClick={onClose} aria-label={t("Fermer")}>
            ×
          </button>
        </div>
        <div className="r-body" style={bodyStyle}>
          {children}
        </div>
        {foot}
      </div>
    </div>
  );
}

export function Steps({ n, current }: { n: number; current: number }) {
  return (
    <div className="r-steps" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <i key={i} className={i <= current ? "on" : ""} />
      ))}
    </div>
  );
}

export function Opt({
  sel,
  onClick,
  nom,
  d,
  p,
  style,
}: {
  sel: boolean;
  onClick: () => void;
  nom: ReactNode;
  d?: ReactNode;
  p?: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button type="button" className={"r-opt" + (sel ? " sel" : "")} onClick={onClick} style={style}>
      <span>
        <span className="n">{nom}</span>
        {d && (
          <>
            <br />
            <span className="d">{d}</span>
          </>
        )}
      </span>
      {p && <span className="p">{p}</span>}
    </button>
  );
}

export function Field({
  id,
  label,
  placeholder,
  type = "text",
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <div className="r-field">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
    </div>
  );
}

export function PayMethods({ sel, onSelect }: { sel: string | null; onSelect: (id: string) => void }) {
  const { b } = useI18n();
  const ids = ["cb", "applepay", "paypal"];
  return (
    <div className="r-opts">
      {ids.map((id, i) => (
        <Opt key={id} sel={sel === id} onClick={() => onSelect(id)} nom={b.payNames[i]} d={b.payDs[i]} />
      ))}
    </div>
  );
}
