/**
 * Traduction des erreurs Supabase Auth en messages clairs pour l'utilisateur.
 *
 * Supabase renvoie la cause dans `code` (ex. "same_password") et un message
 * technique en anglais. Afficher un message générique du type "le lien a
 * expiré" est trompeur : l'utilisateur cherche à corriger le mauvais problème
 * (voire contacte le support alors qu'il a simplement réutilisé son ancien
 * mot de passe).
 */
export function messageErreurMotDePasse(
  error: { code?: string; message?: string } | null | undefined,
  contexte: "reinitialisation" | "creation" = "reinitialisation"
): string {
  const code = error?.code ?? "";
  const raw = error?.message ?? "";
  const rawLower = raw.toLowerCase();

  if (code === "same_password" || rawLower.includes("different from the old password")) {
    return "Le nouveau mot de passe doit être différent de l'ancien mot de passe.";
  }

  if (
    code === "weak_password" ||
    rawLower.includes("weak") ||
    rawLower.includes("at least")
  ) {
    return "Mot de passe trop faible. Utilisez au moins 8 caractères, avec des lettres et des chiffres.";
  }

  if (
    rawLower.includes("session") ||
    rawLower.includes("jwt") ||
    rawLower.includes("token") ||
    rawLower.includes("expired")
  ) {
    return contexte === "creation"
      ? "Votre lien de création de mot de passe n'est plus valide. Demandez-en un nouveau depuis la page de connexion."
      : "Votre lien de réinitialisation n'est plus valide. Veuillez en demander un nouveau.";
  }

  const prefixe =
    contexte === "creation"
      ? "Erreur lors de la création du mot de passe"
      : "Erreur lors de la réinitialisation";
  return raw ? `${prefixe} : ${raw}` : `${prefixe}. Veuillez réessayer.`;
}
