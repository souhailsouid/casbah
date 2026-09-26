"use client";

import { useEffect } from "react";

/**
 * Effets globaux non liés à un composant :
 * curseur personnalisé, halo, boutons magnétiques, vapeur du hero,
 * apparitions au défilement, compteurs, barre de progression, parallaxe, fond vert sur « La Table ».
 */
export default function Effects() {
  useEffect(() => {
    const body = document.body;
    body.classList.add("js");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    const cleanups: (() => void)[] = [];

    /* ---------- apparitions ---------- */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll("[data-rv]").forEach((el) => io.observe(el));
    cleanups.push(() => io.disconnect());

    /* ---------- compteurs ---------- */
    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          cio.unobserve(e.target);
          const el = e.target as HTMLElement;
          const target = +(el.getAttribute("data-count") || 0);
          if (reduced) {
            el.textContent = String(target);
            return;
          }
          let t0: number | null = null;
          const step = (t: number) => {
            if (t0 === null) t0 = t;
            const p = Math.min((t - t0) / 1200, 1);
            el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
            if (p < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        });
      },
      { threshold: 0.5 },
    );
    document.querySelectorAll("[data-count]").forEach((el) => cio.observe(el));
    cleanups.push(() => cio.disconnect());

    /* ---------- progression + parallaxe ---------- */
    const progress = document.getElementById("progress");
    const arch = document.querySelector<HTMLElement>(".hero-arch");
    const onScroll = () => {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - innerHeight;
      if (progress) progress.style.transform = "scaleX(" + (max > 0 ? y / max : 0) + ")";
      if (!reduced && arch && y < innerHeight * 1.5) {
        arch.style.transform = "translateX(-50%) translateY(" + y * 0.18 + "px)";
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onScroll));

    /* ---------- fond vert sur le chapitre Table ---------- */
    const table = document.getElementById("table");
    if (table) {
      const tio = new IntersectionObserver(
        (entries) => entries.forEach((e) => body.classList.toggle("mode-vert", e.isIntersecting)),
        { rootMargin: "-42% 0px -42% 0px" },
      );
      tio.observe(table);
      cleanups.push(() => tio.disconnect());
    }

    /* ---------- vapeur ---------- */
    const cv = document.getElementById("steam") as HTMLCanvasElement | null;
    if (cv && !reduced) {
      const ctx = cv.getContext("2d")!;
      let W = 0;
      let H = 0;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const resize = () => {
        W = cv.offsetWidth;
        H = cv.offsetHeight;
        cv.width = W * dpr;
        cv.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      };
      resize();
      window.addEventListener("resize", resize);
      const parts = Array.from({ length: 34 }, () => ({
        x: Math.random(),
        y: Math.random(),
        r: 40 + Math.random() * 110,
        s: 0.12 + Math.random() * 0.25,
        o: 0.02 + Math.random() * 0.05,
        w: Math.random() * Math.PI * 2,
        ws: 0.002 + Math.random() * 0.004,
      }));
      let heroVisible = true;
      const hio = new IntersectionObserver((es) => (heroVisible = es[0].isIntersecting));
      hio.observe(cv);
      let raf = 0;
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!heroVisible) return;
        ctx.clearRect(0, 0, W, H);
        for (const p of parts) {
          p.y -= p.s / H * 2;
          p.w += p.ws;
          if (p.y < -0.2) {
            p.y = 1.2;
            p.x = Math.random();
          }
          const x = p.x * W + Math.sin(p.w) * 40;
          const y = p.y * H;
          const g = ctx.createRadialGradient(x, y, 0, x, y, p.r);
          g.addColorStop(0, `rgba(231,203,133,${p.o})`);
          g.addColorStop(1, "rgba(231,203,133,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      tick();
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        hio.disconnect();
        window.removeEventListener("resize", resize);
      });
    }

    /* ---------- curseur + halo (délégation : fonctionne aussi dans les tiroirs) ---------- */
    if (fine && !reduced) {
      const cur = document.getElementById("cur");
      const halo = document.getElementById("halo");
      let mx = -100;
      let my = -100;
      let hx = -100;
      let hy = -100;
      const onMove = (e: MouseEvent) => {
        mx = e.clientX;
        my = e.clientY;
      };
      document.addEventListener("mousemove", onMove);
      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        hx += (mx - hx) * 0.14;
        hy += (my - hy) * 0.14;
        if (cur) cur.style.transform = `translate(${mx}px,${my}px)`;
        if (halo) halo.style.transform = `translate(${hx}px,${hy}px)`;
      };
      loop();
      const over = (e: MouseEvent) => {
        if ((e.target as Element).closest?.("[data-cur]")) body.classList.add("halo-big");
      };
      const out = (e: MouseEvent) => {
        const from = (e.target as Element).closest?.("[data-cur]");
        const to = (e.relatedTarget as Element | null)?.closest?.("[data-cur]");
        if (from && from !== to) body.classList.remove("halo-big");
      };
      document.addEventListener("mouseover", over);
      document.addEventListener("mouseout", out);
      cleanups.push(() => {
        cancelAnimationFrame(raf);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseover", over);
        document.removeEventListener("mouseout", out);
      });

      /* ---------- boutons magnétiques ---------- */
      const magMove = (e: MouseEvent) => {
        const el = (e.target as Element).closest?.("[data-mag]") as HTMLElement | null;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const dx = e.clientX - r.left - r.width / 2;
        const dy = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${dx * 0.18}px,${dy * 0.3}px)`;
      };
      const magOut = (e: MouseEvent) => {
        const el = (e.target as Element).closest?.("[data-mag]") as HTMLElement | null;
        if (!el) return;
        const to = (e.relatedTarget as Element | null)?.closest?.("[data-mag]");
        if (to === el) return;
        el.style.transition = "transform .5s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 500);
      };
      document.addEventListener("mousemove", magMove);
      document.addEventListener("mouseout", magOut);
      cleanups.push(() => {
        document.removeEventListener("mousemove", magMove);
        document.removeEventListener("mouseout", magOut);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <>
      <div id="progress" aria-hidden="true" />
      <div id="cur" aria-hidden="true" />
      <div id="halo" aria-hidden="true" />
    </>
  );
}
