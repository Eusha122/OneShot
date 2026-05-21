import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          graphing: ["jsxgraph"],
          katex: ["katex"],
          markdown: ["react-markdown", "remark-gfm", "remark-math"],
          markdownRehype: ["rehype-katex", "rehype-highlight"],
          motion: ["framer-motion"],
          react: ["react", "react-dom"],
        },
      },
    },
  },
  server: {
    port: 5173,
  },
});
