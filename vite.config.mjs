import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";

export default defineConfig(({ mode }) => {
  const { PORT = "3001" } = loadEnv(mode, process.cwd(), "PORT");

  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss({
          content: ["./index.html", "./src/client/**/*.jsx"],
          theme: {
            extend: {
              fontFamily: { sans: ["Plus Jakarta Sans", "sans-serif"] },
              colors: {
                brand: {
                  50: "#fff3f5",
                  100: "#ffe4e8",
                  200: "#ffcbd5",
                  300: "#fca4b5",
                  500: "#e23252",
                  600: "#bb1b29",
                  700: "#9c1728",
                  800: "#7c1423",
                  900: "#58121d"
                }
              }
            }
          }
        })]
      }
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${PORT}`,
          changeOrigin: true
        }
      }
    }
  };
});
