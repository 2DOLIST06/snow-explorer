import { ADMIN_API_BASE } from "./adminApi";

const messages: Record<string, string> = {
  account_not_found: "Aucun compte avec cette adresse e-mail.",
  account_unavailable: "Ce compte ne peut pas se connecter. Contactez l’administrateur.",
  login_link_cooldown: "Veuillez patienter une minute avant de demander un nouveau lien.",
  too_many_login_attempts: "Trop de tentatives. Veuillez réessayer plus tard.",
  email_delivery_failed: "Impossible d’envoyer le mail de connexion. Veuillez réessayer.",
  invalid_or_expired_link: "Ce lien est invalide ou expiré. Demandez un nouveau lien.",
  password_too_short: "Le mot de passe doit contenir au moins 12 caractères.",
  password_too_long: "Le mot de passe est trop long.",
};
export const recoveryError = (code?: string) => messages[code || ""] || "Une erreur est survenue. Veuillez réessayer.";

export async function recoveryRequest(path: "login-link" | "login-link/consume", body: object) {
  const response = await fetch(`${ADMIN_API_BASE}/api/admin/auth/${path}`, {
    method: "POST", credentials: "include", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(recoveryError(data.error));
  return data;
}
