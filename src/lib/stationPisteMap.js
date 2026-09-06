const nonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

/**
 * Resolve the piste-map fields shared by the public page and the admin form.
 * Published station fields are authoritative; widget fields only support
 * stations which have not yet been migrated.
 */
function resolveStationPisteMap(station = {}, pistes = {}) {
  const largeMapUrl =
    nonEmptyString(station.pistes_large_map_url) ||
    nonEmptyString(pistes.largeMapUrl) ||
    nonEmptyString(pistes.large_map_url);
  const smallMapUrl =
    nonEmptyString(station.pistes_small_map_url) ||
    nonEmptyString(pistes.smallMapUrl) ||
    nonEmptyString(pistes.small_map_url);
  const caption =
    nonEmptyString(station.pistes_caption) || nonEmptyString(pistes.caption);
  const hasPublishedImage = Boolean(
    nonEmptyString(station.pistes_large_map_url) || nonEmptyString(station.pistes_small_map_url)
  );

  return {
    enabled: hasPublishedImage || Boolean(pistes.enabled ?? pistes.is_active),
    smallMapUrl,
    largeMapUrl,
    // The official URL is a fallback link, never an image replacement when a
    // station or legacy image is available.
    officialMapUrl:
      largeMapUrl || smallMapUrl ? null : nonEmptyString(pistes.officialMapUrl ?? pistes.official_map_url),
    caption,
    hasPublishedImage,
  };
}

module.exports = { nonEmptyString, resolveStationPisteMap };
