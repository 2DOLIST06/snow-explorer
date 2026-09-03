const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const sourceFiles = (directory) => fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? sourceFiles(path.join(directory, entry.name)) : [path.join(directory, entry.name)]).filter(file => /\.(ts|tsx|js)$/.test(file));

test("login is accessible, validated and never persists credentials", () => {
  const login = read("pages/admin/login.tsx");
  assert.match(login, /type="email"/); assert.match(login, /type="password"/);
  assert.match(login, /autoComplete="username"/); assert.match(login, /autoComplete="current-password"/);
  assert.match(login, /aria-live="assertive"/); assert.match(login, /disabled=\{loading\}/);
  assert.match(login, /rate_limited/); assert.match(login, /Adresse e-mail ou mot de passe incorrect/);
  assert.doesNotMatch(login, /localStorage|sessionStorage/);
});

test("session guard prevents admin content flash and preserves only safe next paths", () => {
  const auth = read("src/contexts/AdminAuthContext.tsx"); const redirect = read("src/lib/adminRedirect.ts");
  assert.match(auth, /Vérification de la session/); assert.match(auth, /credentials: "include"/);
  assert.match(auth, /reason=expired/); assert.match(auth, /router\.query\.next/);
  assert.match(redirect, /startsWith\("\/admin\/"\)/); assert.match(redirect, /startsWith\("\/\/"\)/);
});

test("public station editing is visible only to an authenticated administrator", () => {
  const auth = read("src/contexts/AdminAuthContext.tsx");
  const station = read("pages/stations/[slug].tsx");
  const adminStation = read("pages/admin/stations/[slug].tsx");

  assert.match(auth, /useEffect\(\(\) => \{ void refreshSession\(\); \}, \[refreshSession\]\)/);
  assert.match(station, /adminAuth\.status === "authenticated"/);
  assert.match(station, /Modifier la station/);
  assert.match(station, /href=\{`\/admin\/stations\/\$\{encodeURIComponent\(resort\.slug\)\}`\}/);
  assert.match(adminStation, /href="\/admin\/stations"[^>]*>Toutes les stations<\/Link>/);
});

test("central client sends cookies, applies CSRF only to writes and retries a 403 once", () => {
  const api = read("src/lib/adminApi.ts");
  assert.match(api, /credentials: "include"/); assert.match(api, /X-CSRF-Token/);
  assert.match(api, /GET", "HEAD", "OPTIONS/); assert.match(api, /!retried/);
  assert.match(api, /response\.status === 401/); assert.match(api, /response\.status === 403/);
});

test("station imports transmit file content instead of serializing a File object", () => {
  const client = read("src/config/axios.ts");
  const imports = read("src/lib/api/stationImports.ts");

  assert.doesNotMatch(client, /"Content-Type": "application\/json"/);
  assert.match(imports, /new FormData\(\)/);
  assert.match(imports, /body\.append\("file", file, file\.name\)/);
  assert.match(imports, /JSON\.parse\(await file\.text\(\)\)/);
  assert.match(imports, /file: document/);
  assert.match(imports, /all_or_nothing: options\.transaction === "atomic"/);
  assert.match(imports, /previewBulkStationImport[\s\S]*await bulkDocument\(file, options\)/);
  assert.doesNotMatch(imports, /JSON\.stringify\(\{\s*file\s*\}\)/);
});

test("logout and logout-all are implemented with the central client", () => {
  const auth = read("src/contexts/AdminAuthContext.tsx");
  assert.match(auth, /logout-all/); assert.match(auth, /adminFetch/); assert.match(auth, /csrfToken: null/);
});

test("no browser admin secret storage or public admin routes remain", () => {
  const files = [...sourceFiles("pages"), ...sourceFiles("src")];
  const all = files.map(file => `${file}\n${read(file)}`).join("\n");
  assert.doesNotMatch(all, /ADMIN_API_TOKEN|NEXT_PUBLIC_ADMIN_|X-Admin-Token|localStorage|sessionStorage/);
  for (const file of files.filter(file => !file.startsWith("pages/admin") && !file.includes("src/lib/admin") && !file.includes("src/config/axios") && !file.includes("src/contexts") && !file.includes("src/lib/api/stationImports") && !file.includes("src/lib/api/anmsmLogos") && !file.includes("src/components/admin"))) {
    assert.doesNotMatch(read(file), /\/api\/admin\//, `public file uses an admin route: ${file}`);
  }
});

test("all direct admin fetches use central helpers", () => {
  for (const file of sourceFiles("pages/admin")) {
    const source = read(file);
    assert.doesNotMatch(source, /fetch\([^\n]*\/api\/admin\//, `direct admin fetch: ${file}`);
  }
});
