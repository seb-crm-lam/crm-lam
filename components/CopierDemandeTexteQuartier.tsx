"use client";

import { useState } from "react";

// Bouton « Écrire le texte » — décision de Seb du 8 novembre 2026 : le CRM
// n'est pas relié à Claude ; il copie une demande prête à coller dans Claude.
// Le texte revient ensuite à Seb, qui le publie sur le site puis coche
// « Texte en ligne ».
export function demandeTexteQuartier(nom: string, nbBiens: number): string {
  return [
    `Écris le texte d'introduction (100 à 150 mots, en français) de la page du quartier « ${nom} » à Marrakech, pour ladressemarrakchie.com.`,
    `Ce texte s'affiche en tête de la page du quartier sur le site de L'Adresse Marrakchie (agence immobilière à Marrakech) et sert au référencement naturel (SEO) de la page.`,
    `${nbBiens} bien${nbBiens > 1 ? "s sont publiés" : " est publié"} dans ce quartier.`,
    `N'invente aucun chiffre, aucune date ni aucun nom : écris [à compléter] quand une information manque.`,
  ].join("\n");
}

export default function CopierDemandeTexteQuartier({ nom, nbBiens }: { nom: string; nbBiens: number }) {
  const [etat, setEtat] = useState<"initial" | "copie" | "erreur">("initial");

  async function copier() {
    try {
      await navigator.clipboard.writeText(demandeTexteQuartier(nom, nbBiens));
      setEtat("copie");
      setTimeout(() => setEtat("initial"), 4000);
    } catch {
      setEtat("erreur");
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={copier} className="btn-secondary text-xs">
        {etat === "copie" ? "Demande copiée ✓" : "Écrire le texte"}
      </button>
      {etat === "copie" && <span className="label-sm">À coller dans Claude</span>}
      {etat === "erreur" && <span className="label-sm text-red-700">Copie impossible : autorise le presse-papiers</span>}
    </span>
  );
}
