import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ["leaflet", "leaflet-draw", "@turf/turf", "fast-deep-equal"],
    needsInterop: ["fast-deep-equal"],
  },
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/gmaps-tiles": {
        target: "https://mt0.google.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gmaps-tiles/, ""),
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["Access-Control-Allow-Origin"] = "*";
          });
        },
      },
      "/roboflow-proxy": {
        target: "https://serverless.roboflow.com",
        changeOrigin: true,
        rewrite: (pathValue) => {
          const withoutPrefix = pathValue.replace(/^\/roboflow-proxy/, "");
          if (/^\/serverless\.roboflow\.com\//.test(withoutPrefix)) {
            return withoutPrefix.replace(/^\/serverless\.roboflow\.com/, "");
          }
          if (/^\/detect\.roboflow\.com\//.test(withoutPrefix)) {
            return withoutPrefix.replace(/^\/detect\.roboflow\.com/, "");
          }
          return withoutPrefix;
        },
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            if (req.url?.startsWith("/roboflow-proxy/serverless.roboflow.com/")) {
              proxyReq.setHeader("host", "serverless.roboflow.com");
            }
            if (req.url?.startsWith("/roboflow-proxy/detect.roboflow.com/")) {
              proxyReq.setHeader("host", "detect.roboflow.com");
            }
          });
        },
        router: (req) => {
          if (req.url?.startsWith("/roboflow-proxy/detect.roboflow.com/")) {
            return "https://detect.roboflow.com";
          }
          if (req.url?.startsWith("/roboflow-proxy/serverless.roboflow.com/")) {
            return "https://serverless.roboflow.com";
          }
          return "https://serverless.roboflow.com";
        },
      },
    },
  },
});
