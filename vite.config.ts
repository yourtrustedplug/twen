import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Map unprefixed build env (Vercel-friendly) onto import.meta.env.VITE_*.
 * Vercel blocks saving VITE_* as private; SUPABASE_URL / PRIVY_APP_ID work as Secret.
 */
function clientEnv(mode: string) {
  const fileEnv = loadEnv(mode, process.cwd(), "");
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const value = (process.env[key] ?? fileEnv[key] ?? "").trim();
      if (value) return value;
    }
    return "";
  };

  return {
    VITE_SUPABASE_URL: get("VITE_SUPABASE_URL", "SUPABASE_URL"),
    VITE_SUPABASE_PUBLISHABLE_KEY: get(
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_ANON_KEY",
    ),
    VITE_SUPABASE_PROJECT_ID: get(
      "VITE_SUPABASE_PROJECT_ID",
      "SUPABASE_PROJECT_ID",
    ),
    VITE_PRIVY_APP_ID: get("VITE_PRIVY_APP_ID", "PRIVY_APP_ID"),
    VITE_PRIVY_GOOGLE_ENABLED: get(
      "VITE_PRIVY_GOOGLE_ENABLED",
      "PRIVY_GOOGLE_ENABLED",
    ),
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = clientEnv(mode);

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(env.VITE_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env.VITE_SUPABASE_PUBLISHABLE_KEY,
      ),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(
        env.VITE_SUPABASE_PROJECT_ID,
      ),
      "import.meta.env.VITE_PRIVY_APP_ID": JSON.stringify(env.VITE_PRIVY_APP_ID),
      "import.meta.env.VITE_PRIVY_GOOGLE_ENABLED": JSON.stringify(
        env.VITE_PRIVY_GOOGLE_ENABLED,
      ),
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            ui: [
              "framer-motion",
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-popover",
            ],
          },
        },
      },
      minify: "esbuild",
      cssCodeSplit: true,
    },
  };
});
