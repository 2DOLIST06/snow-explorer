const nonEmptyText = (value) => typeof value === "string" && value.trim() ? value.trim() : "";

/**
 * Keep the V3 presentation on the same source contract as the legacy page:
 * the resort description is authoritative and the legacy widget description
 * remains its fallback. V2 editorial content is intentionally handled apart.
 */
function getStationPresentation(station = {}, widgets = null) {
  const presentation = nonEmptyText(station.description_md) || nonEmptyText(widgets?.description?.html);
  return presentation
    ? presentation.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
}

/** Return only real, strictly positive piste counts, in display order. */
function getStationPisteDetails(station = {}, widgets = null) {
  const colors = station.pistes_colors ?? widgets?.pistes?.colors ?? {};
  return [
    { label: "Vertes", value: colors.green, color: "green" },
    { label: "Bleues", value: colors.blue, color: "blue" },
    { label: "Rouges", value: colors.red, color: "red" },
    { label: "Noires", value: colors.black, color: "black" },
  ].filter(({ value }) => Number.isFinite(Number(value)) && Number(value) > 0);
}

module.exports = { getStationPresentation, getStationPisteDetails };
