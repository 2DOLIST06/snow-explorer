const departments = require("./departmentActivities.json");
const { hasStoredActivityContent } = require("./activities");

const normalize = value => typeof value === "string" || typeof value === "number"
  ? String(value).trim().normalize("NFC").toLocaleLowerCase("fr").replace(/’/g, "'") : "";

function departmentActivityConfig(department, mapping = departments) {
  const code = typeof department === "object" && department !== null ? department.code : department;
  const key = normalize(code).toUpperCase();
  const padded = /^\d$/.test(key) ? key.padStart(2, "0") : key;
  if (Object.hasOwn(mapping, padded)) return { code: padded, ...mapping[padded] };
  // The current station API stores a name, not a department code. Do not infer
  // destinations from a station name, visitor position or opaque database ID.
  if (typeof department === "object" && department !== null && department.code != null) return null;
  const name = normalize(typeof department === "object" && department !== null ? department.name : department);
  const entry = Object.entries(mapping).find(([, config]) => normalize(config.name) === name);
  return entry ? { code: entry[0], ...entry[1] } : null;
}

function resolveStationActivities(block, department, loaded, mapping = departments) {
  if (!loaded || hasStoredActivityContent(block)) return block;
  const config = departmentActivityConfig(department, mapping);
  // Each widget must contain the supplied, verified department-specific code.
  // null means pending confirmation; never use another location as a default.
  if (!config?.widget?.html?.trim()) return block;
  return {
    enabled: true,
    title: `Activité à faire ${config.locative}`,
    items: [{ id: `department-${config.code}`, enabled: true, type: "embed", ...config.widget }],
  };
}

function departmentActivityGaps(values, mapping = departments) {
  return values.map(department => {
    const config = departmentActivityConfig(department, mapping);
    return { department, code: config?.code || null, reason: !config ? "unknown_department" : !config.widget?.html?.trim() ? "missing_widget" : null };
  }).filter(entry => entry.reason);
}

module.exports = { departmentActivityConfig, resolveStationActivities, departmentActivityGaps };
