/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: true,
    // Con el pool de forks paralelo por defecto, algunos runners (Bun en
    // particular) matan los workers antes de que el reporter alcance a
    // volcar la salida de todos los archivos de test. Un solo fork evita
    // la condición de carrera a costa de un poco de paralelismo.
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
}));
