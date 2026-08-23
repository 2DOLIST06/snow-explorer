const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const header = fs.readFileSync(path.join(root, "src/components/layout/ProHeader.tsx"), "utf8");
const styles = fs.readFileSync(path.join(root, "src/styles/globals.css"), "utf8");

test("the mobile navigation opens as an accessible viewport drawer", () => {
  assert.match(header, /createPortal\(/);
  assert.match(header, /role="dialog" aria-modal="true"/);
  assert.match(header, /document\.body\.style\.overflow = "hidden"/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /navItems\.map\(\(item\) => <Link/);
  assert.match(styles, /\.mobile-menu\{position:fixed;inset:0/);
  assert.match(styles, /\.mobile-menu__panel\{position:absolute/);
  assert.match(styles, /\.mobile-menu \.mobile-nav\{display:grid/);
});
