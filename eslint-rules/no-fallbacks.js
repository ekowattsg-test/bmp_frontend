/**
 * ESLint rule: no-fallbacks
 * - Flags usages of `readFirst(...)` (runtime multi-key probing)
 * - Flags `request("GET", "/api/products" ...)` calls (product-list fallback)
 */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Disallow runtime fallback probing and product-list fallback requests",
      category: "Best Practices",
    },
    schema: [],
    messages: {
      avoidReadFirst:
        "Avoid using runtime multi-key probing (readFirst); use canonical backend field names instead.",
      avoidProductListFallback:
        "Avoid using GET /api/products as a fallback lookup in non-list contexts. Use explicit error handling or product endpoints with productId.",
    },
  },
  create(context) {
    // allowlist patterns for files where product-list requests are legitimate
    const filename = String(context.getFilename() || "");
    const allowedPatterns = [
      /src[\\/]components[\\/]baseInformation[\\/]/,
      /src[\\/]components[\\/]information[\\/]/,
      /src[\\/]components[\\/]stock[\\/]ProductDialog\.(js|jsx)$/,
      /src[\\/]components[\\/]stock[\\/]UOMHierarchy\.(js|jsx)$/,
    ];

    const isAllowedFile = allowedPatterns.some((p) => p.test(filename));

    return {
      CallExpression(node) {
        // detect readFirst(...)
        if (
          node.callee &&
          node.callee.type === "Identifier" &&
          node.callee.name === "readFirst"
        ) {
          context.report({ node, messageId: "avoidReadFirst" });
          return;
        }

        // detect request("GET", "/api/products" ...)
        if (
          node.callee &&
          node.callee.type === "Identifier" &&
          node.callee.name === "request"
        ) {
          const args = node.arguments || [];
          if (args.length >= 2) {
            const methodArg = args[0];
            const urlArg = args[1];
            if (
              methodArg.type === "Literal" &&
              String(methodArg.value).toUpperCase() === "GET" &&
              urlArg.type === "Literal" &&
              typeof urlArg.value === "string" &&
              String(urlArg.value).startsWith("/api/products")
            ) {
              // Allow product-list calls in known product-management files.
              if (!isAllowedFile) {
                context.report({ node, messageId: "avoidProductListFallback" });
              }
            }
          }
        }
      },
    };
  },
};
