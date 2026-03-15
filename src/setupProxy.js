const { createProxyMiddleware } = require("http-proxy-middleware");

module.exports = function (app) {
  console.log("into proxy");
  app.use(
    "/api",
    createProxyMiddleware({
      target: "http://localhost:8080",
      changeOrigin: true,
      pathRewrite: {
        "^/api": "", // remove /api prefix when forwarding to backend
      },
      onProxyRes: function (proxyRes, req, res) {
        // Handle redirects by making them relative
        const location = proxyRes.headers["location"];
        if (location && location.startsWith("http://localhost:8080")) {
          proxyRes.headers["location"] = location.replace(
            "http://localhost:8080",
            ""
          );
        }
      },
    })
  );
};
