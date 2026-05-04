const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  const target = process.env.REACT_APP_PROXY_TARGET || "http://localhost:9090";
  app.use(
    "/api",
    createProxyMiddleware({
      target,
      changeOrigin: true,
    })
  );
};
