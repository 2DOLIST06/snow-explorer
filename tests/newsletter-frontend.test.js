const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("newsletter requests all target the configured backend origin", () => {
  const api = read("src/lib/api/newsletter.ts");
  assert.match(api, /fetch\(`\$\{ADMIN_API_BASE\}\$\{path\}`/);
  assert.doesNotMatch(api, /fetch\(path/);
});

test("general preferences use query-token URL and the flat backend payload", () => {
  const api = read("src/lib/api/newsletter.ts");
  const types = read("src/types/newsletter.ts");
  const centre = read("src/components/newsletter/NewsletterPreferences.tsx");
  assert.match(api, /`\$\{root\}\/preferences\?token=\$\{encodeURIComponent\(token\)\}`/);
  assert.match(types, /NewsletterPreferencesUpdate = NewsletterPreferences & \{ newsletter_frequency:/);
  assert.match(centre, /\{ \.\.\.draftPrefs, newsletter_frequency: frequency \}/);
  assert.doesNotMatch(api, /JSON\.stringify\(\{ token, \.\.\.body \}\)/);
});

test("station and alert resources put the token in the path and not the body", () => {
  const api = read("src/lib/api/newsletter.ts");
  assert.match(api, /preferenceResource\(token, "\/stations"\)/);
  assert.match(api, /preferenceResource\(token, `\/stations\/\$\{encodeURIComponent\(stationId\)\}`\)/);
  assert.match(api, /preferenceResource\(token, "\/alerts"\)/);
  assert.match(api, /preferenceResource\(token, `\/alerts\/\$\{encodeURIComponent\(id\)\}`\)/);
  assert.doesNotMatch(api, /`\$\{root\}\/preferences\/stations/);
  assert.doesNotMatch(api, /`\$\{root\}\/preferences\/alerts/);
});

test("station settings and snow alerts use the final backend field names", () => {
  const types = read("src/types/newsletter.ts");
  const centre = read("src/components/newsletter/NewsletterPreferences.tsx");
  for (const field of ["weather_enabled", "snow_conditions_enabled", "resort_updates_enabled", "weather_frequency"]) assert.match(types, new RegExp(field));
  for (const field of ["alert_type", "threshold_cm", "forecast_period_hours", "is_active"]) assert.match(types, new RegExp(field));
  for (const oldField of [/snowfall_cm/, /(?:^|[^a-z_])period_hours/, /(?:^|[^a-z_])active: boolean/]) assert.doesNotMatch(types, oldField);
  assert.match(centre, /alert_type: "snowfall"/);
});

test("station search uses only the final active-station endpoint", () => {
  const api = read("src/lib/api/newsletter.ts");
  assert.match(api, /`\/api\/stations\/search\?q=\$\{encodeURIComponent\(query\)\}`/);
  assert.doesNotMatch(api, /\/api\/resorts\/\?q=/);
  assert.doesNotMatch(api, /limit=6/);
});

test("subscriptions use v1 consent and unwrap the data envelope without assuming a token", () => {
  const api = read("src/lib/api/newsletter.ts");
  const signup = read("src/components/newsletter/NewsletterSignup.tsx");
  const follow = read("src/components/newsletter/FollowStationButton.tsx");
  assert.match(api, /ApiDataResponse<NewsletterSubscribeResult>/);
  assert.match(signup, /email, language, source, consent, consentTextVersion/);
  assert.match(follow, /source: "station_page".*station_id: stationId/);
  assert.doesNotMatch(follow, /preferences_token|preferences_url|data\.token/);
  assert.match(follow, /setSuccess\(true\)/);
});

test("preference response envelope and unsubscribe confirmation match the final contract", () => {
  const types = read("src/types/newsletter.ts");
  const centre = read("src/components/newsletter/NewsletterPreferences.tsx");
  assert.match(types, /status: "active"/);
  assert.match(types, /newsletter_frequency: NewsletterFrequency/);
  assert.match(types, /unsubscribed: boolean/);
  assert.match(centre, /value\.unsubscribed/);
  assert.match(centre, /confirmUnsubscribe \?/);
  assert.match(centre, /await newsletterApi\.unsubscribe\(token\)/);
});

test("preferences are loaded only when the token changes", () => {
  const centre = read("src/components/newsletter/NewsletterPreferences.tsx");
  const loadEffect = centre.match(/useEffect\(\(\) => \{ let live = true;[\s\S]*?\}, \[([^\]]*)\]\);/);

  assert.ok(loadEffect, "the preferences loading effect should exist");
  assert.equal(loadEffect[1].trim(), "token");
  assert.equal((loadEffect[0].match(/newsletterApi\.preferences\(token\)/g) || []).length, 1);
});
