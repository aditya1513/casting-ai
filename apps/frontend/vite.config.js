import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    target: "esnext",
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@trpc/client", "@trpc/react-query"],
  },
});