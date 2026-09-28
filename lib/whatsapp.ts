// Construction du lien wa.me pour l'envoi WhatsApp réel (A8 : « le CRM
// enregistre l'envoi au clic ... par lien wa.me, sans API WhatsApp Business »).
// Aucune donnée n'est envoyée à un serveur tiers ici : on ouvre simplement
// l'application WhatsApp du poste avec un message pré-rempli.

// Normalise un numéro marocain saisi sous diverses formes (0661234567,
// +212661234567, 00212661234567, 212661234567...) vers le format
// international sans "+" attendu par wa.me.
export function normaliserNumeroMaroc(telephone: string): string | null {
  let chiffres = telephone.replace(/[^0-9]/g, "");
  if (chiffres.length === 0) return null;
  if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  if (chiffres.startsWith("0")) chiffres = "212" + chiffres.slice(1);
  else if (!chiffres.startsWith("212") && chiffres.length === 9) chiffres = "212" + chiffres;
  return chiffres;
}

export function lienWhatsapp(telephone: string | null | undefined, message: string): string | null {
  if (!telephone) return null;
  const numero = normaliserNumeroMaroc(telephone);
  if (!numero) return null;
  return `https://wa.me/${numero}?text=${encodeURIComponent(message)}`;
}
