
# ---- build: compiles the client bundle and the server; needs the full ----
# ---- dependency tree, but never launches a browser and skips Playwright's
# ---- own Chromium download since this image never renders anything itself.
FROM node:24-slim AS build
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run sandbox && npm run build:server

# ---- runtime: no node_modules at all — the sandbox bundle is a single ----
# ---- self-contained HTML file and the server uses only Node built-ins.
FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production PORT=8787 SANDBOX_DATA_DIR=/data SANDBOX_HTML_PATH=/app/out/sandbox.html
COPY --from=build /app/out/sandbox.html ./out/sandbox.html
COPY --from=build /app/dist-server ./dist-server
EXPOSE 8787
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||8787)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist-server/server/index.js"]
