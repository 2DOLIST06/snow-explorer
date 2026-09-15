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
  // `hidden` would turn this ancestor into a scroll container and break the header's viewport sticky positioning.
  assert.match(styles, /html,body\{max-width:100vw;overflow-x:clip\}/);
  assert.doesNotMatch(styles, /html,body\{[^}]*overflow-x:hidden/);
  assert.match(header, /window\.matchMedia\("\(min-width: 981px\)"\)/);
  assert.match(header, /setDesktopHeaderMode\("hidden"\)/);
  assert.match(header, /setDesktopHeaderMode\("navigation"\)/);
  assert.match(header, /scrollY <= 12/);
  assert.match(header, /new ResizeObserver\(measureHeaderBar\)/);
  assert.match(header, /getBoundingClientRect\(\)\.height/);
  assert.match(header, /style=\{\{ transform: headerTransform \}\}/);
  assert.match(header, /`translateY\(-\$\{headerBarHeight\}px\)`/);
  assert.match(header, /direction < 0 \? 2 : 8/);
  assert.doesNotMatch(styles, /\.site-header--(?:hidden|navigation)\{transform:/);
  assert.match(styles, /@media \(max-width:980px\)\{\.site-header__bar/);
});
