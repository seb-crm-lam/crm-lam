"use client";

import { useState } from "react";
import { logEnvoiWhatsapp } from "@/lib/actions";
import { lienWhatsapp } from "@/lib/whatsapp";

export default function EnvoyerCompteRendu({
  bienId,
  proprietaireId,
  proprietaireTelephone,
  texteInitial,
}: {
  bienId: string;
  proprietaireId: string;
  proprietaireTelephone: string | null | undefined;
  texteInitial: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState(texteInitial);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);

  if (envoye) {
    return <span className="pill pill-green">Envoyé</span>;
  }

  if (!ouvert) {
    return (
      <button className="btn-secondary text-xs" onClick={() => setOuvert(true)}>
        Envoyer par WhatsApp (dernière visite)
      </button>
    );
  }

  const lien = lienWhatsapp(proprietaireTelephone, texte);

  return (
    <div className="card p-4 space-y-3">
      <div className="label-sm">Message au propriétaire — modifiable avant envoi</div>
      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={6}
        className="input w-full"
      />
      {!lien && (
        <p className="text-xs text-red-600">Ce propriétaire n'a pas de numéro de téléphone enregistré.</p>
      )}
      <div className="flex gap-2">
        <button className="btn-secondary text-xs flex-1" onClick={() => setOuvert(false)}>
          Annuler
        </button>
        <button
          className="btn-primary text-xs flex-1 disabled:opacity-50"
          disabled={!lien || enCours}
          onClick={async () => {
            if (!lien) return;
            setEnCours(true);
            window.open(lien, "_blank");
            await logEnvoiWhatsapp(proprietaireId, bienId, "compte rendu — dernière visite");
            setEnvoye(true);
            setEnCours(false);
          }}
        >
          Confirmer l'envoi
        </button>
      </div>
    </div>
  );
}
