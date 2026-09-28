"use client";

import { useState } from "react";
import { logEnvoiWhatsapp } from "@/lib/actions";
import { lienWhatsapp } from "@/lib/whatsapp";

// Envoi d'un bien à un contact — décisions du 24 septembre 2026 :
// message WhatsApp court + fiche PDF d'une page. Un lien wa.me ne transporte
// que du texte : le PDF est joint par Seb dans WhatsApp (sur iPhone, via le
// bouton « Partager la fiche »).
export default function EnvoyerWhatsapp({
  contactId,
  contactTelephone,
  bienId,
  libelle,
  pointsFortsInitiaux,
  offMarket,
  construireMessage,
  accordProspection = true,
}: {
  contactId: string;
  contactTelephone: string | null | undefined;
  bienId: string;
  libelle: string;
  pointsFortsInitiaux: string[];
  offMarket: boolean;
  construireMessage: { avant: string; apres: string };
  accordProspection?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [points, setPoints] = useState<string[]>(() => {
    const p = [...pointsFortsInitiaux];
    while (p.length < 3) p.push("");
    return p.slice(0, 3);
  });
  const [confirmeOffMarket, setConfirmeOffMarket] = useState(false);
  const [partage, setPartage] = useState<string | null>(null);

  if (envoye) {
    return <span className="pill pill-green">Envoyé</span>;
  }

  if (!ouvert) {
    return (
      <button className="btn-secondary text-xs px-2.5 py-1.5" onClick={() => setOuvert(true)}>
        Envoyer
      </button>
    );
  }

  const lignePoints = points
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `• ${p}`)
    .join(" ");
  const message = [construireMessage.avant, lignePoints, construireMessage.apres].filter(Boolean).join("\n");
  const lien = lienWhatsapp(contactTelephone, message);
  const urlPdf = `/api/documents/fiche-bien/${bienId}`;
  const bloque = !lien || enCours || (offMarket && !confirmeOffMarket);

  async function partagerFiche() {
    setPartage(null);
    try {
      const reponse = await fetch(urlPdf);
      const blob = await reponse.blob();
      const fichier = new File([blob], `${libelle.split(" — ")[0]}.pdf`, { type: "application/pdf" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare && nav.canShare({ files: [fichier] })) {
        await nav.share({ files: [fichier] });
        setPartage("Fiche partagée.");
        return;
      }
    } catch {
      // Partage annulé ou impossible : on retombe sur l'ouverture du PDF.
    }
    window.open(urlPdf, "_blank");
    setPartage("PDF ouvert dans un nouvel onglet : enregistre-le, puis joins-le dans WhatsApp.");
  }

  return (
    <>
    {/* iPhone : fond assombri, la fenêtre monte du bas de l'écran */}
    <div className="fixed inset-0 z-50 bg-black/30 md:hidden" onClick={() => setOuvert(false)} />
    <div
      className="card fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-b-none p-4 text-left shadow-lg md:absolute md:inset-auto md:right-0 md:z-10 md:mt-2 md:max-h-none md:w-80 md:rounded-card"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
    >
      <div className="label-sm mb-2">Envoi — {libelle}</div>
      {offMarket && <span className="pill pill-accent mb-2 inline-block">Off-market</span>}

      <div className="label-sm mb-1">Points forts (modifiables)</div>
      <div className="space-y-1 mb-3">
        {points.map((p, i) => (
          <input
            key={i}
            className="input md:text-xs"
            value={p}
            placeholder={`Point fort ${i + 1}`}
            onChange={(e) => {
              const suivant = [...points];
              suivant[i] = e.target.value;
              setPoints(suivant);
            }}
          />
        ))}
      </div>

      <div className="label-sm mb-1">Aperçu du message</div>
      <pre className="rounded-lg bg-bg border border-border p-3 mb-3 text-xs whitespace-pre-wrap font-sans">
        {message}
      </pre>

      {!accordProspection && (
        <p className="text-xs text-muted mb-2">
          Pas d'accord de prospection : n'envoyer que des biens liés à sa demande ou à sa recherche.
        </p>
      )}
      {!lien && (
        <p className="text-xs text-red-600 mb-2">Ce contact n'a pas de numéro de téléphone enregistré.</p>
      )}
      {offMarket && (
        <label className="flex items-start gap-2 text-xs mb-3">
          <input
            type="checkbox"
            checked={confirmeOffMarket}
            onChange={(e) => setConfirmeOffMarket(e.target.checked)}
          />
          Je confirme l'envoi d'un bien off-market à ce contact.
        </label>
      )}

      <div className="flex flex-col gap-2">
        <button
          className="btn-primary md:text-xs disabled:opacity-50"
          disabled={bloque}
          onClick={async () => {
            if (!lien) return;
            setEnCours(true);
            window.open(lien, "_blank");
            await logEnvoiWhatsapp(contactId, bienId, `${libelle} — message + fiche PDF`);
            setEnCours(false);
          }}
        >
          1. Ouvrir WhatsApp avec le message
        </button>
        <button className="btn-secondary md:text-xs" onClick={partagerFiche}>
          2. Partager la fiche PDF
        </button>
        {partage && <p className="text-xs text-muted">{partage}</p>}
        <div className="flex gap-2">
          <button className="btn-secondary md:text-xs flex-1" onClick={() => setOuvert(false)}>
            Fermer
          </button>
          <button className="btn-secondary md:text-xs flex-1" onClick={() => setEnvoye(true)}>
            Terminé
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
