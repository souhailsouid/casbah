import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statique : le site est une page unique, hébergeable n'importe où
  // (Vercel, Netlify, un simple dossier `out/` derrière Caddy/Nginx, ou un artifact).
  output: "export",
  // Préfixe optionnel des assets (ex. ASSET_PREFIX=/nx pour l'hébergement en artifact,
  // qui interdit les chemins commençant par « _ »). Vide par défaut : /_next/... classique.
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  // Sous-chemin d'hébergement (ex. BASE_PATH=/casbah pour GitHub Pages : souhailsouid.github.io/casbah).
  basePath: process.env.BASE_PATH || undefined,
  images: { unoptimized: true },
  trailingSlash: false,
  reactStrictMode: true,
  // Le dossier vit dans le monorepo adel-ai mais reste un projet indépendant (pnpm --ignore-workspace).
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
