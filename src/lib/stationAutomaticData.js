/** Missing coordinates must never become an artificial zero. */
function parseCoordinate(value, limit) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}
function normalizeSeasonDate(value) {
  if (typeof value !== "string") return null;
  const match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(value);
  if (!match) return null;
  const date = new Date(match[1] + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1]) return null;
  if (value !== match[1] && !Number.isFinite(Date.parse(value))) return null;
  return match[1];
}
module.exports = { parseCoordinate, normalizeSeasonDate };
