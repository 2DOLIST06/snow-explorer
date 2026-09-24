import type { BulkImportOptions, BulkImportPreview } from "@/types/stationImport";

type ConfirmationState = {
  document: unknown;
  options: BulkImportOptions;
  preview: BulkImportPreview | null;
};

/** Returns the user-facing reason why the current preview cannot be confirmed. */
export function getBulkImportBlockReason({ document, options, preview }: ConfirmationState): string | null {
  if (!preview) return "Prévisualisez le fichier avant de confirmer l’import.";
  if (!preview.summary || !Array.isArray(preview.stations) || typeof preview.valid !== "boolean") {
    return "La réponse de prévisualisation est invalide. Relancez l’analyse du fichier.";
  }
  if (!preview.valid) return "La prévisualisation contient des erreurs bloquantes à corriger.";
  if (!preview.preview_token) return "Le jeton de prévisualisation est absent. Relancez l’analyse du fichier.";
  if (document === undefined) return "Le document analysé n’est plus disponible. Relancez l’analyse du fichier.";

  const hasCreation = preview.stations.some(station => station?.status === "create");
  if (hasCreation && !options.create_missing) {
    return "Cochez « Créer les stations absentes », puis relancez l’analyse pour importer les créations.";
  }

  const hasImportableOperation = preview.stations.some(station => {
    if (!station || typeof station !== "object") return false;
    // A creation is itself an operation: it has no existing id and the API may
    // legitimately return no field-level changes for it.
    if (station.status === "create") return options.create_missing;
    return station.status === "update"
      && Array.isArray(station.changes)
      && station.changes.some(change => change.action !== "unchanged");
  });

  return hasImportableOperation ? null : "Aucune création ni mise à jour n’est à importer.";
}
