/**
 * Produces a compact comparison key for user-facing station searches.
 * Accents, casing and separators (spaces, hyphens, apostrophes, etc.) are
 * intentionally ignored so users do not have to know the exact spelling.
 */
export function normalizeSearchText(value) {
  return String(value ?? "")
    .toLocaleLowerCase("fr")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function matchesSearch(value, query) {
  return normalizeSearchText(value).includes(normalizeSearchText(query));
}
