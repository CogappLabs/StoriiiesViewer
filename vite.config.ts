// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/StoriiiesViewer.ts"),
      fileName: (format) => {
        if (format === "umd") {
          return "umd/storiiies-viewer.js";
        } else {
          return "esm/storiiies-viewer.js";
        }
      },
      name: "StoriiiesViewer",
      formats: ["es", "umd"],
    },
    rollupOptions: {
      output: {
        assetFileNames: "storiiies-viewer.[ext]",
      },
    },
    copyPublicDir: false,
  },
  server: {
    port: 43110,
    strictPort: true,
  },
  publicDir: resolve(__dirname, "cypress", "fixtures"),
});
