// Preserve the browser Origin: cookie-session endpoints validate it against the
// backend GATEWAY_CORS_ORIGINS allowlist, including the frontend's exact port.
module.exports = {
  "/api/**": {
    target: "http://localhost:8080",
    secure: false,
    changeOrigin: true,
  },
};
