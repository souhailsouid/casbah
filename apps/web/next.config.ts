import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Export statique : site + /admin (rendu côté client) hébergeables sur GitHub Pages ou n'importe quel CDN.
  output: "export",
  // Préfixe optionnel des assets (ex. ASSET_PREFIX=/nx pour l'hébergement en artifact,
  // qui interdit les chemins commençant par « _ »). Vide par défaut : /_next/... classique.
  assetPrefix: process.env.ASSET_PREFIX || undefined,
  // Sous-chemin d'hébergement (ex. BASE_PATH=/casbah pour GitHub Pages : souhailsouid.github.io/casbah).
  basePath: process.env.BASE_PATH || undefined,
  images: { unoptimized: true },
  trailingSlash: false,
  reactStrictMode: true,
  transpilePackages: ["@casbah/shared"],
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
};

export default nextConfig;
