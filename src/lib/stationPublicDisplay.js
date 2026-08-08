const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SEASON_LABEL_PATTERN = /^\d{4}-\d{4}$/;

function validMetric(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function keyFigures(resort) {
  const figures = [];
  if (validMetric(resort?.ski_area_km)) {
    figures.push({ key: "ski-area", label: `${resort.ski_area_km.toLocaleString("fr-FR")} km de pistes` });
  }
  if (validMetric(resort?.snowparks_count)) {
    const count = resort.snowparks_count;
    figures.push({ key: "snowparks", label: `${count.toLocaleString("fr-FR")} snowpark${count === 1 ? "" : "s"}` });
  }
  if (validMetric(resort?.family_parks_count)) {
    const count = resort.family_parks_count;
    figures.push({ key: "family-parks", label: `${count.toLocaleString("fr-FR")} family park${count === 1 ? "" : "s"}` });
  }
  return figures;
}

function parseCivilDate(value) {
  if (typeof value !== "string") return null;
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) return null;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  if (
    date.getFullYear() !== Number(year) ||
    date.getMonth() !== Number(month) - 1 ||
    date.getDate() !== Number(day)
  ) return null;
  return date;
}

function formatCivilDate(value) {
  const date = parseCivilDate(value);
  return date ? date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : null;
}

function seasonDisplay(resort) {
  const opening = formatCivilDate(resort?.season_open_date);
  const closing = formatCivilDate(resort?.season_close_date);
  let label = typeof resort?.season_label === "string" && SEASON_LABEL_PATTERN.test(resort.season_label)
    ? resort.season_label
    : null;
  if (!label && opening && closing) {
    label = `${resort.season_open_date.slice(0, 4)}-${resort.season_close_date.slice(0, 4)}`;
  }
  return { label: opening && closing ? label : null, opening, closing };
}

module.exports = { formatCivilDate, keyFigures, parseCivilDate, seasonDisplay, validMetric };
