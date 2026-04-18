const { RuleTester } = require("eslint");
const rule = require("../no-fallbacks");

const tester = new RuleTester({
  parserOptions: { ecmaVersion: 2020, sourceType: "module" },
});

tester.run("no-fallbacks", rule, {
  valid: [
    "request('GET', '/api/stockviews/product/123')",
    "fetch('/api/products')",
  ],
  invalid: [
    {
      code: "readFirst(row, ['a','b'])",
      errors: [{ messageId: "avoidReadFirst" }],
    },
    {
      code: "request('GET', '/api/products')",
      errors: [{ messageId: "avoidProductListFallback" }],
    },
  ],
});
