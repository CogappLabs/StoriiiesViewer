// vite.config.js
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      fileName: (format) => {
        if (format === "umd") {
          return "storiiies-viewer.js";
        } else {
          return "index.js";
        }
      },
      name: "StoriiiesViewer",
      formats: ["es", "umd"],
    },
  },
  server: {
    port: 43110,
    strictPort: true,
  },
});
