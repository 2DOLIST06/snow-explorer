/** Missing coordinates must never become an artificial zero. */
function parseCoordinate(value, limit) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}
function normalizeSeasonDate(value) {
  if (typeof value !== "string") return null;
  // The API also serializes SQL dates as RFC 1123 / HTTP dates.
  const httpDate = /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{2}):(\d{2}):(\d{2}) GMT$/.exec(value);
  if (httpDate) {
    if (Number(httpDate[4]) > 23 || Number(httpDate[5]) > 59 || Number(httpDate[6]) > 59) return null;
    const month = String(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(httpDate[2]) + 1).padStart(2, '0');
    return normalizeSeasonDate(`${httpDate[3]}-${month}-${httpDate[1]}`);
  }
  const match = /^(\d{4}-\d{2}-\d{2})(?:T.*)?$/.exec(value);
  if (!match) return null;
  const date = new Date(match[1] + "T00:00:00Z");
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== match[1]) return null;
  if (value !== match[1] && !Number.isFinite(Date.parse(value))) return null;
  return match[1];
}
/** Prefer station dates, then the nested and flat legacy snow dates. */
function resolveStationSeasonDates(station = {}, widgets = null) {
  const snow = widgets?.snow;
  return {
    openDate: normalizeSeasonDate(station.season_open_date)
      ?? normalizeSeasonDate(snow?.season?.openingDate)
      ?? normalizeSeasonDate(snow?.openingDate),
    closeDate: normalizeSeasonDate(station.season_close_date)
      ?? normalizeSeasonDate(snow?.season?.closingDate)
      ?? normalizeSeasonDate(snow?.closingDate),
  };
}
module.exports = { parseCoordinate, normalizeSeasonDate, resolveStationSeasonDates };
