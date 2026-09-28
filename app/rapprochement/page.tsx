import Link from "next/link";
import {
  listContacts,
  listBiens,
  getRecherchesForContact,
  matchBiensPourRecherche,
  matchRecherchesPourBien,
  type NiveauCorrespondance,
} from "@/lib/repo";
import { formatDh, formatM2, TYPE_BIEN_LABELS } from "@/lib/format";
import EnvoyerWhatsapp from "@/components/EnvoyerWhatsapp";
import { getBienPrestations } from "@/lib/repo";
import { preparerEnvoi, libelleCourt } from "@/lib/documents/fiche-client";
import { CONSEILLER_PAR_DEFAUT } from "@/lib/agence";
import type { Bien, Contact } from "@/lib/types";



export const dynamic = "force-dynamic";

// Props du bouton d'envoi : message et fiche client (décisions du 24/09/2026).
// Le lien public de la fiche n'est pas encore connu du CRM (synchronisation
// avec le site à venir) : le message renvoie à la fiche PDF jointe.
function propsEnvoi(bien: Bien, contact: Contact) {
  return {
    contactId: contact.id,
    contactTelephone: contact.telephone,
    bienId: bien.id,
    accordProspection: contact.consentementProspection,
    ...preparerEnvoi({
      bien,
      contact: { prenom: contact.prenom, formeAdresse: contact.formeAdresse === "tu" ? "tu" : "vous" },
      prestations: getBienPrestations(bien.id),
      lienSite: null,
      conseiller: bien.conseillerReferent || CONSEILLER_PAR_DEFAUT,
    }),
  };
}

function correspondancePill(c: NiveauCorrespondance) {
  if (c === "correspond") return <span className="pill pill-green">Correspond</span>;
  if (c === "proche") return <span className="pill pill-accent">Proche</span>;
  if (c === "elargi") return <span className="pill pill-red">Élargi</span>;
  return <span className="pill pill-neutral">Hors critère</span>;
}

// Ligne teintée pour distinguer visuellement les biens hors du tableau normal
function ligneClasse(c: NiveauCorrespondance) {
  if (c === "elargi") return "bg-redbg/40";
  if (c === "hors_critere") return "opacity-50";
  return "";
}

export default function RapprochementPage({
  searchParams,
}: {
  searchParams: { mode?: string; contactId?: string; bienId?: string; exclus?: string };
}) {
  const mode = searchParams.mode === "bien" ? "bien" : "recherche";
  const voirExclus = searchParams.exclus === "1";
  const contacts = listContacts().filter((c) => c.statut === "en_recherche" || c.statut === "nouveau");
  const biens = listBiens().filter((b) => b.diffusionEtat !== "archive");

  const contactId = searchParams.contactId ?? contacts[0]?.id;
  const bienId = searchParams.bienId ?? biens[0]?.id;

  const recherches = contactId ? getRecherchesForContact(contactId) : [];
  const contactCourant = contacts.find((c) => c.id === contactId);
  const recherche = recherches[0];
  const matchesParRecherche = recherche
    ? matchBiensPourRecherche(recherche, { includeExclus: voirExclus })
    : [];

  const bien = biens.find((b) => b.id === bienId);
  const matchesParBien = bien ? matchRecherchesPourBien(bien, { includeExclus: voirExclus }) : [];

  const paramsBase = new URLSearchParams();
  paramsBase.set("mode", mode);
  if (contactId) paramsBase.set("contactId", contactId);
  if (bienId) paramsBase.set("bienId", bienId);
  const toggleExclusHref = (() => {
    const p = new URLSearchParams(paramsBase);
    if (!voirExclus) p.set("exclus", "1");
    return `/rapprochement?${p.toString()}`;
  })();

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold">Rapprochement</h1>
        <div className="flex items-center gap-3">
          <Link href={toggleExclusHref} className="text-sm text-muted hover:text-text underline underline-offset-2">
            {voirExclus ? "Masquer les hors critère" : "Voir les hors critère"}
          </Link>
          <div className="pill pill-neutral p-0.5 flex gap-0.5">
            <Link
              href={`/rapprochement?mode=recherche${contactId ? `&contactId=${contactId}` : ""}`}
              className={`px-3 py-1.5 rounded-full ${mode === "recherche" ? "bg-white shadow-sm" : ""}`}
            >
              Par recherche
            </Link>
            <Link
              href={`/rapprochement?mode=bien${bienId ? `&bienId=${bienId}` : ""}`}
              className={`px-3 py-1.5 rounded-full ${mode === "bien" ? "bg-white shadow-sm" : ""}`}
            >
              Par bien
            </Link>
          </div>
        </div>
      </div>

      <details className="card mb-4 px-4 py-3 text-sm">
        <summary className="cursor-pointer font-medium">Comment fonctionne l'envoi WhatsApp</summary>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
          <li>« Envoyer » ouvre l'aperçu du message : les trois points forts se modifient avant l'envoi.</li>
          <li>
            « 1. Ouvrir WhatsApp » ouvre la conversation avec le message déjà écrit. Rien ne part tant que tu
            n'appuies pas sur la flèche d'envoi, et le texte reste modifiable dans WhatsApp.
          </li>
          <li>« 2. Partager la fiche PDF » : sur iPhone, choisis WhatsApp puis la même conversation.</li>
          <li>
            Le CRM note l'envoi dès le clic sur « 1. Ouvrir WhatsApp ». Il ne sait pas si le message est
            réellement parti, ni s'il a été lu.
          </li>
        </ol>
      </details>

      {mode === "recherche" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="card p-4">
            <div className="label-sm mb-2">Contacts en recherche</div>
            <ul className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
              {contacts.map((c) => (
                <li key={c.id} className="shrink-0">
                  <Link
                    href={`/rapprochement?mode=recherche&contactId=${c.id}`}
                    className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm md:whitespace-normal ${
                      c.id === contactId ? "bg-accentbg text-accent font-medium" : "hover:bg-bg"
                    }`}
                  >
                    {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 space-y-4">
            {recherche ? (
              <>
                <div className="card p-5">
                  <div className="label-sm mb-2">Critères recherchés</div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="label-sm">Type</div>
                    <div>{recherche.typeBien ? TYPE_BIEN_LABELS[recherche.typeBien] : "—"}</div>
                    <div className="label-sm">Quartier</div>
                    <div>{recherche.quartierNom ?? "—"}</div>
                    <div className="label-sm">Surface min.</div>
                    <div>{formatM2(recherche.surfaceSolMin)}</div>
                    <div className="label-sm">Budget max.</div>
                    <div>{formatDh(recherche.budgetMax)}</div>
                  </div>
                </div>

                <div className="card overflow-visible">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left label-sm border-b border-border">
                        <th className="px-4 py-3 font-medium">Bien</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Prix</th>
                        <th className="px-2 md:px-4 py-3 font-medium">Correspondance</th>
                        <th className="px-4 py-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {matchesParRecherche.map((m) => (
                        <tr
                          key={m.bien.id}
                          className={`border-b border-border last:border-0 ${ligneClasse(m.correspondance)}`}
                        >
                          <td className="px-4 py-3">
                            <Link href={`/biens/${m.bien.id}`} className="text-accent hover:underline">
                              {m.bien.reference}
                            </Link>{" "}
                            {m.bien.titre}
                            {m.bien.diffusionEtat === "off_market" && (
                              <span className="pill pill-accent ml-2">Off-market</span>
                            )}
                            <div className="md:hidden label-sm mt-1">
                              {m.bien.prixSurDemande ? "Sur demande" : formatDh(m.bien.prixVente)}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {m.bien.prixSurDemande ? "Sur demande" : formatDh(m.bien.prixVente)}
                          </td>
                          <td className="px-2 md:px-4 py-3">{correspondancePill(m.correspondance)}</td>
                          <td className="px-2 md:px-4 py-3 md:relative">
                            {m.correspondance !== "hors_critere" && contactCourant && (
                              <EnvoyerWhatsapp {...propsEnvoi(m.bien, contactCourant)} />
                            )}
                          </td>
                        </tr>
                      ))}
                      {matchesParRecherche.length === 0 && (
                        <tr>
                          <td className="px-4 py-6 text-sm text-muted" colSpan={4}>
                            Aucun bien correspondant.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">Aucune recherche active pour ce contact.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="card p-4">
            <div className="label-sm mb-2">Biens</div>
            <ul className="flex gap-2 overflow-x-auto pb-1 md:block md:space-y-1 md:overflow-visible md:pb-0">
              {biens.map((b) => (
                <li key={b.id} className="shrink-0">
                  <Link
                    href={`/rapprochement?mode=bien&bienId=${b.id}`}
                    className={`block whitespace-nowrap rounded-lg px-3 py-2 text-sm md:whitespace-normal ${
                      b.id === bienId ? "bg-accentbg text-accent font-medium" : "hover:bg-bg"
                    }`}
                  >
                    {libelleCourt(b)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2">
            {bien ? (
              <div className="card overflow-visible">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left label-sm border-b border-border">
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">Budget max.</th>
                      <th className="px-2 md:px-4 py-3 font-medium">Correspondance</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchesParBien.map((m) => {
                      const contact = contacts.find((c) => c.id === m.recherche.contactId);
                      return (
                        <tr
                          key={m.recherche.id}
                          className={`border-b border-border last:border-0 ${ligneClasse(m.correspondance)}`}
                        >
                          <td className="px-4 py-3">
                            {contact ? (
                              <Link href={`/contacts/${contact.id}`} className="text-accent hover:underline">
                                {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
                              </Link>
                            ) : (
                              "—"
                            )}
                            <div className="md:hidden label-sm mt-1">Budget : {formatDh(m.recherche.budgetMax)}</div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">{formatDh(m.recherche.budgetMax)}</td>
                          <td className="px-2 md:px-4 py-3">{correspondancePill(m.correspondance)}</td>
                          <td className="px-2 md:px-4 py-3 md:relative">
                            {m.correspondance !== "hors_critere" && contact && (
                              <EnvoyerWhatsapp {...propsEnvoi(bien, contact)} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {matchesParBien.length === 0 && (
                      <tr>
                        <td className="px-4 py-6 text-sm text-muted" colSpan={4}>
                          Aucun contact correspondant.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">Sélectionnez un bien.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
