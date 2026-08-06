/** Build the exact JSON body accepted by the current Flask presign route. */
export function buildPresignPayload(file) {
  return {
    filename: file.name,
    content_type: file.type,
  };
}

/** Validate the exact camelCase response currently returned by the Flask route. */
export function parsePresignResponse(value) {
  if (!value || typeof value !== "object") throw new TypeError("JSON non objet");
  if (
    typeof value.uploadUrl !== "string" ||
    typeof value.publicUrl !== "string" ||
    typeof value.contentType !== "string" ||
    value.contentType.trim() === ""
  ) {
    throw new TypeError("uploadUrl/publicUrl/contentType absents ou invalides");
  }
  return {
    uploadUrl: value.uploadUrl,
    publicUrl: value.publicUrl,
    contentType: value.contentType,
  };
}
