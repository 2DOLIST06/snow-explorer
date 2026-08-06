const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");

test("presign payload includes the filename and MIME type required by the backend", async () => {
  const contract = await import(path.join(root, "src/lib/stationImageUploadContract.js"));
  assert.deepEqual(contract.buildPresignPayload({ name: "logo station.png", type: "image/png" }), {
    filename: "logo station.png",
    content_type: "image/png",
  });
});

test("presign response requires uploadUrl, publicUrl and a non-empty contentType", async () => {
  const contract = await import(path.join(root, "src/lib/stationImageUploadContract.js"));
  const valid = { uploadUrl: "https://s3/upload", publicUrl: "https://cdn/logo.png", contentType: "image/png" };
  assert.deepEqual(contract.parsePresignResponse(valid), valid);
  assert.throws(() => contract.parsePresignResponse({ upload_url: "wrong-shape", public_url: "wrong", content_type: "image/png" }), /uploadUrl\/publicUrl\/contentType/);
  assert.throws(() => contract.parsePresignResponse({ uploadUrl: "https://s3/upload", publicUrl: "https://cdn/logo.png", contentType: "" }), /contentType/);
});

test("S3 upload is a credential-free PUT and logo replacement is persisted", () => {
  const upload = fs.readFileSync(path.join(root, "src/lib/stationImageUpload.ts"), "utf8");
  const page = fs.readFileSync(path.join(root, "pages/admin/stations/[slug].tsx"), "utf8");
  assert.match(upload, /fetcher\(uploadUrl, \{[\s\S]*method: "PUT",[\s\S]*"Content-Type": contentType,[\s\S]*body: file/);
  const s3Put = upload.match(/fetcher\(uploadUrl, \{[\s\S]*?\n    \}\);/)?.[0] || "";
  assert.doesNotMatch(s3Put, /credentials|X-CSRF-Token|Authorization/);
  assert.match(page, /saveUploadedStationImage\("logo_url", publicUrl, file\)/);
  assert.match(page, /body: JSON\.stringify\(\{ \[field\]: publicUrl \}\)/);
});

test("empty or mismatched MIME types are rejected", () => {
  const upload = fs.readFileSync(path.join(root, "src/lib/stationImageUpload.ts"), "utf8");
  assert.match(upload, /if \(!file\.type\.trim\(\)\)/);
  assert.match(upload, /contentType !== file\.type/);
  assert.match(upload, /Le type MIME du fichier est vide/);
  assert.match(upload, /Type MIME signé/);
});

test("upload failures identify every step without logging CSRF values", () => {
  const upload = fs.readFileSync(path.join(root, "src/lib/stationImageUpload.ts"), "utf8");
  assert.match(upload, /Appel POST presign/);
  assert.match(upload, /Parsing de la réponse presign/);
  assert.match(upload, /Upload PUT vers S3/);
  assert.match(upload, /filename: file\.name, mimeType: file\.type/);
  assert.doesNotMatch(upload, /getAdminCsrfToken|document\.cookie/);
});
