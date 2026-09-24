"use client";

import { useEffect, useState } from "react";

/** Écran d'ouverture : la porte se dessine, puis le nom apparaît lettre par lettre. */
export default function Loader() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finish = () => {
      setDone(true);
      document.getElementById("h1")?.classList.add("in");
    };
    if (reduced) {
      finish();
      return;
    }
    const id = setTimeout(finish, 2500);
    return () => clearTimeout(id);
  }, []);

  const lettres = ["L", "A", " ", "C", "A", "S", "B", "A", "H"];

  return (
    <div id="loader" className={done ? "done" : ""} aria-hidden="true">
      <svg width="216" height="187" viewBox="0 0 120 104" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect className="knob" x="55.8" y="2" width="8.4" height="8" rx="1.4" fill="#C9A45C" />
        <path className="porte" d="M32 104 V14 H88 V104" stroke="#C9A45C" strokeWidth="2.4" />
        <path className="porte" d="M39 104 V21 H81 V104" stroke="#C9A45C" strokeWidth="1" />
        <path className="etoile" d="M16 43 C17.5 49.4 17.5 49.4 23.5 51 C17.5 52.6 17.5 52.6 16 59 C14.5 52.6 14.5 52.6 8.5 51 C14.5 49.4 14.5 49.4 16 43 Z" fill="#C9A45C" />
        <path className="etoile" d="M104 43 C105.5 49.4 105.5 49.4 111.5 51 C105.5 52.6 105.5 52.6 104 59 C102.5 52.6 102.5 52.6 96.5 51 C102.5 49.4 102.5 49.4 104 43 Z" fill="#C9A45C" />
      </svg>
      <div className="name">
        {lettres.map((l, i) => (
          <span key={i} style={{ animationDelay: `${0.35 + i * 0.06}s` }}>
            {l}
          </span>
        ))}
      </div>
      <div className="lsub">HAMMAM · SPA</div>
      <div className="ldiv">
        <i />
        <svg width="13" height="13" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z" fill="#C9A45C" />
        </svg>
        <i />
      </div>
      <em className="lrest">Restaurant</em>
    </div>
  );
}
