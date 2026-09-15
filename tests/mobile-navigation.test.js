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

test("the two-tier desktop header follows the scroll direction without changing mobile", () => {
  assert.match(header, /window\.matchMedia\("\(min-width: 981px\)"\)/);
  assert.match(header, /setDesktopHeaderMode\("hidden"\)/);
  assert.match(header, /setDesktopHeaderMode\("navigation"\)/);
  assert.match(header, /scrollY <= 12/);
  assert.match(header, /headerBarRef\.current\?\.offsetHeight/);
  assert.match(header, /direction < 0 \? 2 : 8/);
  assert.match(styles, /@media \(min-width:981px\).*\.site-header--hidden\{transform:translateY\(-100%\)\}.*\.site-header--navigation/s);
  assert.match(styles, /@media \(max-width:980px\)\{\.site-header__bar/);
});
