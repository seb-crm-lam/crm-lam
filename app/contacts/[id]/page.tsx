import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getContact,
  getRecherchesForContact,
  getEvenementsForContact,
  getBonsVisitePourContact,
} from "@/lib/repo";
import { formatDh, formatM2, formatDate, formatDateHeure, TYPE_BIEN_LABELS } from "@/lib/format";

// Libellés lisibles de l'historique ; un type inconnu s'affiche tel quel.
const EVENEMENT_LABELS: Record<string, string> = {
  whatsapp_envoye: "WhatsApp envoyé",
  whatsapp_non_envoye: "WhatsApp non parti (corrigé)",
  bon_visite_cree: "Bon de visite créé",
  mandat_signe: "Mandat signé",
  engagement_confidentialite_genere: "Engagement de confidentialité généré",
  engagement_confidentialite_signe: "Engagement de confidentialité signé",
  visite: "Visite",
  envoi_whatsapp: "WhatsApp envoyé",
  recherche_creee: "Recherche créée",
};

const STATUT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_recherche: "En recherche",
  en_cours: "En cours",
  abouti: "Abouti",
  inactif: "Inactif",
  perdu: "Perdu",
};

export default function FicheContactPage({ params }: { params: { id: string } }) {
  const contact = getContact(params.id);
  if (!contact) notFound();

  const recherches = getRecherchesForContact(contact.id);
  const evenements = getEvenementsForContact(contact.id);
  const bonsVisite = getBonsVisitePourContact(contact.id);
  const cinMasque = contact.cinPasseport
    ? contact.cinPasseport.slice(0, 2) + "••••" + contact.cinPasseport.slice(-2)
    : "—";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="label-sm mb-1">Contact</div>
          <h1 className="text-xl font-semibold">
            {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="pill pill-neutral">{STATUT_LABELS[contact.statut] ?? contact.statut}</span>
          <Link href={`/contacts/${contact.id}/bon-visite`} className="btn-secondary">
            Bon de visite
          </Link>
          <Link href={`/contacts/${contact.id}/edit`} className="btn-secondary">
            Modifier
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="card p-5">
            <div className="label-sm mb-3">Coordonnées</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm [overflow-wrap:anywhere]">
              <div className="label-sm">Téléphone</div>
              <div>
                {contact.telephone ? (
                  <a href={`tel:${contact.telephone.replace(/\s/g, "")}`} className="underline">
                    {contact.telephone}
                  </a>
                ) : (
                  "—"
                )}
              </div>
              <div className="label-sm">Email</div>
              <div>{contact.email ?? "—"}</div>
              <div className="label-sm">Vouvoiement / tutoiement</div>
              <div>{contact.formeAdresse === "tu" ? "Tu" : "Vous"}</div>
              <div className="label-sm">CIN / Passeport</div>
              <div>{cinMasque}</div>
              <div className="label-sm">Adresse postale</div>
              <div>{contact.adressePostale ?? "—"}</div>
              {contact.agitPourLeCompteDe && (
                <>
                  <div className="label-sm">Agit pour le compte de</div>
                  <div>{contact.agitPourLeCompteDe}</div>
                </>
              )}
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <div className="label-sm">Accords</div>
            {/* Décision 1A du 25 septembre : deux accords distincts. L'accord de
                réponse autorise la réponse et l'envoi des biens liés à sa recherche ;
                seul l'accord de prospection autorise la prospection générale. */}
            {[
              {
                titre: "Réponse à sa demande",
                ok: contact.accordReponse,
                date: contact.dateAccordReponse,
                origine: null as string | null,
                texte: contact.texteAccordReponse,
              },
              {
                titre: "Prospection (nouveautés, relances, diffusion)",
                ok: contact.consentementProspection,
                date: contact.dateConsentement,
                origine: contact.origineConsentement,
                texte: contact.texteConsentement,
              },
            ].map((a) => (
              <div key={a.titre} className="text-sm space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`pill ${a.ok ? "pill-green" : "pill-red"}`}>{a.ok ? "Oui" : "Non"}</span>
                  <span>{a.titre}</span>
                </div>
                {a.ok && (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 [overflow-wrap:anywhere]">
                    <div className="label-sm">Date</div>
                    <div>{formatDate(a.date)}</div>
                    {a.origine !== null && (
                      <>
                        <div className="label-sm">Origine</div>
                        <div>{a.origine ?? "—"}</div>
                      </>
                    )}
                    {a.texte && (
                      <>
                        <div className="label-sm">Texte accepté</div>
                        <div className="text-xs text-muted">« {a.texte} »</div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {recherches.length > 0 && (
            <div className="card p-5">
              <div className="label-sm mb-3">Recherche active</div>
              {recherches.map((r) => (
                <div key={r.id} className="space-y-3">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm [overflow-wrap:anywhere]">
                    <div className="label-sm">Type de bien</div>
                    <div>{r.typeBien ? TYPE_BIEN_LABELS[r.typeBien] ?? r.typeBien : "—"}</div>
                    <div className="label-sm">Quartier</div>
                    <div>{r.quartierNom ?? "—"}</div>
                    <div className="label-sm">Surface min.</div>
                    <div>{formatM2(r.surfaceSolMin)}</div>
                    <div className="label-sm">Budget max.</div>
                    <div>{formatDh(r.budgetMax)}</div>
                  </div>
                  {r.messageProspect && (
                    <div className="text-sm italic border-l-2 border-border pl-3 text-muted">
                      « {r.messageProspect} »
                    </div>
                  )}
                  {r.criteresLibres && (
                    <div className="text-sm">
                      <span className="label-sm">Précisions (Seb) : </span>
                      {r.criteresLibres}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="card p-5">
            <div className="label-sm mb-3">Historique</div>
            {evenements.length === 0 ? (
              <p className="text-sm text-muted">Aucun événement.</p>
            ) : (
              <ul className="space-y-3">
                {evenements.map((e) => (
                  <li key={e.id} className="text-sm flex gap-3">
                    <span className="label-sm shrink-0 w-24">{formatDateHeure(e.dateEvenement)}</span>
                    <span>
                      <span className="font-medium">{EVENEMENT_LABELS[e.typeEvenement] ?? e.typeEvenement}</span>
                      {e.detail ? ` — ${e.detail}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-5 text-sm">
            <div className="label-sm mb-2">Dernier contact</div>
            <div>{formatDate(contact.dateDernierContact)}</div>
          </div>

          <div className="card p-5 text-sm">
            <div className="label-sm mb-2">Bons de visite</div>
            {bonsVisite.length === 0 ? (
              <p className="text-muted">Aucun bon de visite.</p>
            ) : (
              <ul className="space-y-2">
                {bonsVisite.map((bv) => (
                  <li key={bv.id}>
                    <Link href={`/bons-visite/${bv.id}`} className="flex items-center justify-between hover:underline">
                      <span>{bv.reference}</span>
                      <span className={`pill ${bv.signe ? "pill-green" : "pill-neutral"}`}>
                        {bv.signe ? "Signé" : "Non signé"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
