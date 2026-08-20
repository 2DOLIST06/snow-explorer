export const getSkiPassBlocksVisibility = (legacyEnabled: boolean, normalizedEnabled: boolean) => ({
  legacy: legacyEnabled,
  normalized: normalizedEnabled,
  any: legacyEnabled || normalizedEnabled,
});
