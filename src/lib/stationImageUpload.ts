import { ADMIN_API_BASE, adminFetch } from "@/lib/adminApi";
import { buildPresignPayload, parsePresignResponse } from "@/lib/stationImageUploadContract";

export type UploadFile = Blob & { name: string; type: string };

type PresignResponse = { uploadUrl: string; publicUrl: string; contentType: string };
type Fetcher = typeof fetch;

const PRESIGN_PATH = "/api/s3/presign";

function safeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.search = parsed.search ? "?…redacted…" : "";
    return parsed.toString();
  } catch {
    return url.split("?")[0];
  }
}

async function responseBody(response: Response) {
  const text = await response.text().catch(() => "<corps illisible>");
  return text || "<corps vide>";
}

function detail(step: string, file: UploadFile, url: string, status: number | "réseau", body: string) {
  return `${step} — HTTP ${status}; URL ${safeUrl(url)}; fichier ${file.name} (${file.type || "type MIME inconnu"}); réponse: ${body}`;
}

function parsePresign(value: unknown, file: UploadFile, url: string): PresignResponse {
  try {
    return parsePresignResponse(value) as PresignResponse;
  } catch (error) {
    throw new Error(detail("Parsing de la réponse presign", file, url, 200, error instanceof Error ? error.message : String(error)));
  }
}

export async function uploadStationImage(file: UploadFile, fetcher: Fetcher = fetch): Promise<string> {
  const presignUrl = `${ADMIN_API_BASE}${PRESIGN_PATH}`;
  if (!file.type.trim()) {
    throw new Error(detail("Validation du fichier avant presign", file, presignUrl, "réseau", "Le type MIME du fichier est vide"));
  }
  if (process.env.NODE_ENV === "development") {
    console.debug("[stationImageUpload] presign", { url: presignUrl, filename: file.name, mimeType: file.type, credentials: "include", csrfHeader: "attached by adminFetch" });
  }

  let response: Response;
  try {
    response = await adminFetch(PRESIGN_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(buildPresignPayload(file)),
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(detail("Appel POST presign", file, presignUrl, "réseau", reason));
  }
  if (!response.ok) throw new Error(detail("Appel POST presign", file, presignUrl, response.status, await responseBody(response)));

  let json: unknown;
  try {
    json = await response.json();
  } catch (error) {
    throw new Error(detail("Parsing de la réponse presign", file, presignUrl, response.status, error instanceof Error ? error.message : String(error)));
  }
  const { uploadUrl, publicUrl, contentType } = parsePresign(json, file, presignUrl);
  if (contentType !== file.type) {
    throw new Error(detail("Validation de la réponse presign", file, presignUrl, response.status, `Type MIME signé ${contentType} différent du type du fichier ${file.type}`));
  }

  let uploadResponse: Response;
  try {
    // Deliberately no credentials/CSRF/API headers: this request targets S3 directly.
    uploadResponse = await fetcher(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });
  } catch (error) {
    throw new Error(detail("Upload PUT vers S3", file, uploadUrl, "réseau", error instanceof Error ? error.message : String(error)));
  }
  if (!uploadResponse.ok) throw new Error(detail("Upload PUT vers S3", file, uploadUrl, uploadResponse.status, await responseBody(uploadResponse)));
  return publicUrl;
}
