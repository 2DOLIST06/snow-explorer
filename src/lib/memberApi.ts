import { ADMIN_API_BASE } from "./adminApi";
export type MemberUser = { id: number; email: string; password_set: boolean };
export type MemberSession = { authenticated: boolean; user: MemberUser; csrf_token: string };
let csrf: string | null = null;
export class MemberApiError extends Error {
  constructor(public code: string, public status: number) { super(memberError(code)); }
}
export function memberError(code: string) {
  const messages: Record<string, string> = {
    account_not_found: "Aucun compte membre avec cette adresse e-mail. Vous pouvez créer un compte.",
    account_exists: "Un compte membre existe déjà avec cette adresse. Connectez-vous ou recevez un lien par mail.",
    account_unavailable: "Ce compte est indisponible.", invalid_email: "Vérifiez votre adresse e-mail.",
    invalid_credentials: "Adresse e-mail ou mot de passe incorrect. Vous pouvez aussi recevoir un lien de connexion.",
    password_not_set: "Vous n’avez pas encore défini de mot de passe. Recevez un lien de connexion, puis définissez-le dans votre compte.",
    email_delivery_failed: "Impossible d’envoyer le mail. Veuillez réessayer.",
    login_link_cooldown: "Veuillez patienter une minute avant de demander un nouveau lien.",
    too_many_login_attempts: "Trop de tentatives. Veuillez réessayer plus tard.",
    invalid_preferences_token: "Ce lien d’abonnement est invalide. Connectez-vous avec votre adresse email.",
    resend_email_required: "Indiquez votre adresse email pour recevoir un nouveau lien de connexion.",
    invalid_or_expired_link: "Ce lien est invalide ou expiré. Demandez un nouveau lien.",
    member_authentication_required: "Votre session a expiré. Veuillez vous reconnecter.",
    password_too_short: "Le mot de passe doit contenir au moins 12 caractères.",
    password_too_long: "Le mot de passe est trop long.",
    station_not_found: "Cette station n’est plus disponible. Retirez-la de la sélection et réessayez.",
    invalid_newsletter_intent: "Vérifiez les stations, les thèmes et les fréquences sélectionnés.",
    explicit_consent_required: "Votre accord est nécessaire pour enregistrer cet abonnement.",
    newsletter_unavailable: "Cet abonnement ne peut pas être réactivé. Contactez-nous.",
  };
  return messages[code] || "Une erreur est survenue. Veuillez réessayer.";
}
export async function memberRequest<T = any>(path: string, body?: object, authenticated = false): Promise<T> {
  if (!/^\/[A-Za-z0-9_/%.-]+$/.test(path) || path.includes("//") || path.split("/").some(part => part === "." || part === "..")) throw new Error("Invalid member path");
  if (body && authenticated && !csrf) await memberRequest("/session");
  let response: Response;
  try {
    response = await fetch(`${ADMIN_API_BASE}/api/member${path}`, {
      method: body ? "POST" : "GET", credentials: "include", cache: "no-store",
      headers: { Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}), ...(body && authenticated && csrf ? { "X-CSRF-Token": csrf } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { throw new Error("Impossible de joindre le serveur. Veuillez réessayer."); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401 && (authenticated || path === "/session")) csrf = null; throw new MemberApiError(data.error || "request_failed", response.status); }
  if (data.csrf_token) csrf = data.csrf_token;
  if (data.authenticated === false) csrf = null;
  return data;
}
