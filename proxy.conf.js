// The browser sends Origin on every POST, including same-origin calls to this
// dev server. The gateway allowlist does not include http://127.0.0.1:4200 and
// rejects that header with an empty 403. Drop it here: the proxy is the caller.
module.exports = {
  "/api/**": {
    target: "http://localhost:8080",
    secure: false,
    changeOrigin: true,
    configure(proxy) {
      proxy.on("proxyReq", (proxyReq) => {
        proxyReq.removeHeader("origin");
      });
    },
  },
};
