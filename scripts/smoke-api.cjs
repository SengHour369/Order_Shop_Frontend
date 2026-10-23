// Read-only checks. This script never signs in or modifies shop data.
const fs = require("node:fs");
const baseUrl = process.argv[2] || "http://localhost:8080";
const routes = [
  "/actuator/health",
  "/api/v1/storefront/access-settings",
  "/api/v1/storefront/products",
  "/api/v1/storefront/categories",
  "/api/v1/promotions/active?page=1&size=1",
  "/api/notifications/unread-count",
  "/api/v1/admin/session",
  "/openapi/auth-service",
  "/openapi/catalog-service",
  "/openapi/order-service",
  "/openapi/payment-service",
  "/openapi/admin-service",
];

async function main() {
  const checks = await Promise.all(
    routes.map(async (route) => {
      try {
        const response = await fetch(new URL(route, baseUrl), {
          signal: AbortSignal.timeout(10000),
        });
        const result = { method: "GET", route, status: response.status };
        if (route.startsWith("/openapi/") && response.ok) {
          const document = await response.json();
          result.documentedPaths = Object.keys(document.paths || {}).length;
        } else {
          // Consume without storing responses that may contain business data.
          await response.arrayBuffer();
        }
        return result;
      } catch (error) {
        return { method: "GET", route, status: null, error: error.message };
      }
    }),
  );
  const report = {
    checkedAt: new Date().toISOString(),
    baseUrl,
    authenticated: false,
    note: "Availability checks only. A 401 proves authentication is required; it does not validate an authenticated flow.",
    checks,
  };
  fs.mkdirSync("docs", { recursive: true });
  fs.writeFileSync(
    "docs/live-api-smoke.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(checks, null, 2));
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
