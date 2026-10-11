// Compare current Spring controller routes with Angular HTTP call sites.
// This is a static inventory, not evidence of successful live requests.
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const backend = process.argv[2];
if (!backend || !fs.existsSync(backend)) {
  throw new Error("Pass the E-Shop backend directory as the first argument.");
}
const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "target", ".git", ".idea"].includes(entry.name))
      return [];
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
const normalize = (value) =>
  ("/" + value).replace(/\/+/g, "/").replace(/\/$/, "");
const quoted = (value) =>
  [...value.matchAll(/"([^"\n]*)"/g)].map((match) => match[1]);
const routes = [];
const javaRoots = fs
  .readdirSync(backend, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => path.join(backend, entry.name, "src", "main", "java"))
  .filter((dir) => fs.existsSync(dir));
const javaFiles = javaRoots
  .flatMap(walk)
  .filter((file) => file.endsWith(".java"));
const cleanSource = (file) =>
  fs
    .readFileSync(file, "utf8")
    .replace(/"(?:\\.|[^"\\])*"|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, (match) =>
      match.startsWith('"') ? match : "",
    );
const constants = new Map();
for (const file of javaFiles) {
  const source = cleanSource(file);
  for (const match of source.matchAll(
    /static\s+final\s+String\s+(\w+)\s*=\s*"([^"]*)"/g,
  )) {
    constants.set(path.basename(file, ".java") + "." + match[1], match[2]);
  }
}
for (const file of javaFiles) {
  const source = cleanSource(file);
  if (!/@(?:RestController|Controller)\b/.test(source)) continue;
  const classIndex = source.indexOf("class ");
  const prefix = source
    .slice(0, classIndex)
    .match(/@RequestMapping\s*\(([^)]*)\)/)?.[1];
  const bases = prefix ? quoted(prefix) : [""];
  if (prefix && !bases.length) {
    const resolved = constants.get(prefix.trim());
    if (!resolved)
      throw new Error("Unresolved route constant in " + file + ": " + prefix);
    bases.push(resolved);
  }
  const methods = source.slice(classIndex);
  for (const match of methods.matchAll(
    /@(Get|Post|Put|Patch|Delete)Mapping\b(?:\s*\(([^)]*)\))?/g,
  )) {
    const paths = quoted(match[2] || "").filter((value) =>
      value.startsWith("/"),
    );
    for (const base of bases)
      for (const suffix of paths.length ? paths : [""]) {
        routes.push({
          method: match[1].toUpperCase(),
          path: normalize(base + suffix),
          source: path.relative(backend, file).replaceAll("\\", "/"),
        });
      }
  }
}

// Preserve dynamic segments as wildcards. Query parameters do not change routing.
function expression(node) {
  if (!node) return "*";
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isTemplateExpression(node))
    return (
      node.head.text +
      node.templateSpans.map((span) => "*" + span.literal.text).join("")
    );
  if (
    ts.isBinaryExpression(node) &&
    node.operatorToken.kind === ts.SyntaxKind.PlusToken
  )
    return expression(node.left) + expression(node.right);
  if (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === "url"
  )
    return expression(node.arguments[0]);
  return "*";
}
const calls = [];
for (const file of walk("src/app").filter(
  (file) => file.endsWith(".ts") && !file.endsWith(".spec.ts"),
)) {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;
      if (["get", "post", "put", "patch", "delete", "data"].includes(method)) {
        const route = expression(node.arguments[0]).split("?")[0];
        if (route.startsWith("/api/"))
          calls.push({
            method: method === "data" ? "POST" : method.toUpperCase(),
            route: normalize(route),
            file: file.replaceAll("\\", "/"),
          });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function matches(template, route) {
  if (
    template === "/api/v1/returns/*/*" &&
    /^\/api\/v1\/returns\/\{returnId\}\/inspect\/(start|complete)$/.test(route)
  )
    return true;
  const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const concrete = route.replace(/\{[^}]+\}/g, "*");
  const pattern = escape(template).replaceAll("\\*", "[^/]+");
  return new RegExp("^" + pattern + "$").test(concrete);
}
const unique = [
  ...new Map(
    routes.map((route) => [route.method + " " + route.path, route]),
  ).values(),
];
for (const route of unique) {
  route.clients = [
    ...new Set(
      calls
        .filter(
          (call) =>
            call.method === route.method && matches(call.route, route.path),
        )
        .map((call) => call.file),
    ),
  ];
  route.status = route.clients.length
    ? "Adapter present; live verification required"
    : "Review required";
  if (route.path.startsWith("/internal/"))
    route.status = "Excluded: service-to-service API";
  if (
    route.path.startsWith("/api/v1/gateway/") ||
    route.path.startsWith("/fallback/")
  )
    route.status = "Excluded: gateway infrastructure";
  if (route.path.includes("/public/session/"))
    route.status =
      "Excluded: alternative cookie-session protocol; app uses bearer tokens";
  if (route.path.endsWith("/reset-password-page"))
    route.status = "Excluded: backend HTML page; Angular supplies reset form";
  if (route.path === "/api/v1/user/id/update")
    route.status = "Blocked: backend @PathVariable id is missing from mapping";
  if (route.path === "/api/admin/audit-logs") {
    route.status =
      "Adapter present through gateway service-specific audit paths";
    route.clients = ["src/app/features/admin/admin.api.ts"];
  }
}
fs.mkdirSync("docs", { recursive: true });
fs.writeFileSync(
  "docs/endpoint-audit.json",
  JSON.stringify(unique, null, 2) + "\n",
);
const rows = unique.map(
  (route) =>
    `| ${route.method} | \`${route.path}\` | ${route.status} | ${route.clients.map((file) => `[${path.basename(file)}](../${file})`).join(", ")} |`,
);
fs.writeFileSync(
  "docs/endpoint-audit.md",
  "# E-Shop endpoint inventory\n\nGenerated from current Spring controller annotations and Angular HTTP call sites. Dynamic segments are matched structurally; this does not validate DTOs, authorization, side effects, or live service behavior. See integration-status.md for testing evidence and limitations.\n\n| Method | Route | Static status | Angular source |\n| --- | --- | --- | --- |\n" +
    rows.join("\n") +
    "\n",
);
console.log(
  JSON.stringify(
    {
      routes: unique.length,
      review: unique
        .filter((route) => route.status === "Review required")
        .map((route) => route.method + " " + route.path),
    },
    null,
    2,
  ),
);
