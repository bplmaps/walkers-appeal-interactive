import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";

const iiifProxy = {
  "/_iiif": {
    target: "https://iiif.digitalcommonwealth.org",
    changeOrigin: true,
    rewrite: (path) => path.replace(/^\/_iiif/, ""),
    secure: true,
  },
};

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  server: { proxy: iiifProxy },
  preview: { proxy: iiifProxy },
});
