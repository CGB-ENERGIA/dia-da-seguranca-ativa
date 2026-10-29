import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig } from "vite";

const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  build: { target: ["es2020", "chrome87", "safari14"] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["logo-cgb.png", "logo-cgb-branco.png", "favicon.png"],
      manifest: {
        name: "Dia da Segurança Ativa · CGB Energia",
        short_name: "DSA CGB",
        description: "Registro de ações do Dia da Segurança Ativa, mesmo sem sinal.",
        lang: "pt-BR",
        theme_color: "#4a0f1d",
        background_color: "#4a0f1d",
        display: "standalone",
        start_url: base,
        scope: base,
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,woff2,woff}"],
        maximumFileSizeToCacheInBytes: 4_000_000,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes("/seed/"),
            handler: "StaleWhileRevalidate",
            options: { cacheName: "dsa-seed" },
          },
        ],
      },
    }),
  ],
});
