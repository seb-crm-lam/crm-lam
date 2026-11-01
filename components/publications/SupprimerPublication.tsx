"use client";

import { supprimerPublication } from "@/lib/actions";

// Suppression d'une saisie erronée, avec confirmation (évite un faux appui sur iPhone).
export default function SupprimerPublication({ id }: { id: string }) {
  return (
    <form
      action={supprimerPublication.bind(null, id)}
      onSubmit={(e) => {
        if (!window.confirm("Supprimer cette publication de l'historique ?")) e.preventDefault();
      }}
    >
      <button type="submit" className="text-xs text-muted hover:text-red">
        Supprimer
      </button>
    </form>
  );
}
