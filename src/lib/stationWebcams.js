const { parseCoordinate } = require('./stationAutomaticData');
function normalize(value) {
  return typeof value === 'string' ? value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : '';
}
function captureTime(value, now = Date.now()) {
  const time = typeof value === 'number' ? value * 1000 :
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? Date.parse(value) : NaN;
  return Number.isFinite(time) && time > 0 && time <= now ? time : null;
}
function nearbyWebcams(list, lat, lon) {
  const unique = new Map();
  for (const cam of Array.isArray(list) ? list : []) {
    if (cam?.status && cam.status !== 'active') continue;
    if (!cam || cam.id == null || !String(cam.id).trim() || !/^https:\/\//.test(cam.preview || '')) continue;
    const clat = parseCoordinate(cam.lat, 90), clon = parseCoordinate(cam.lon, 180);
    if (clat === null || clon === null) continue;
    const radians = Math.PI / 180;
    const a = Math.sin((clat - lat) * radians / 2) ** 2 +
      Math.cos(lat * radians) * Math.cos(clat * radians) * Math.sin((clon - lon) * radians / 2) ** 2;
    const distance = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    if (distance > 30) continue;
    const item = { ...cam, id: String(cam.id), distance, capturedAt: captureTime(cam.lastUpdated) };
    const previous = unique.get(item.id);
    if (!previous || (item.capturedAt || 0) > (previous.capturedAt || 0)) unique.set(item.id, item);
  }
  return [...unique.values()].sort((a, b) => a.distance - b.distance || (b.capturedAt || 0) - (a.capturedAt || 0) || a.id.localeCompare(b.id));
}
function matchesStation(cam, name) {
  const station = normalize(name);
  const subject = normalize((cam.title || '').split(/\s+[-–—|:]\s*|:/)[0]);
  return Boolean(station) && subject === station;
}
function selectWebcams(list, name, lat, lon) {
  return nearbyWebcams(list, lat, lon).filter(cam => matchesStation(cam, name));
}
function featuredWebcams(cams, name) {
  const matching = cams.filter(cam => matchesStation(cam, name));
  return matching.length ? matching.slice(0, 4) : cams.slice(0, 2);
}
function formatCapture(time) {
  return time ? new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(time) : null;
}
module.exports = { nearbyWebcams, featuredWebcams, selectWebcams, captureTime, formatCapture };
