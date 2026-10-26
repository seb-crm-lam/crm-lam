"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Contact } from "@/lib/types";
import { formatDate, TYPE_APPORTEUR_LABELS, APPORT_CATEGORIE_LABELS } from "@/lib/format";

const STATUT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  apporteur: "Apporteur",
  en_recherche: "En recherche",
  en_cours: "En cours",
  abouti: "Abouti",
  inactif: "Inactif",
  perdu: "Perdu",
};

type ContactAvecRecherche = Contact & { rechercheActive: boolean };

export default function ContactsTable({ contacts }: { contacts: ContactAvecRecherche[] }) {
  const [recherche, setRecherche] = useState("");
  const [statut, setStatut] = useState("");
  const [rechercheActiveSeulement, setRechercheActiveSeulement] = useState(false);
  const [consentement, setConsentement] = useState(""); // "", "oui", "non"
  const [tri, setTri] = useState<"recent" | "ancien">("recent");

  // Nom des contacts, pour afficher « Présenté par » / « Apporté par ».
  const nomParId = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of contacts) m.set(c.id, c.prenom ? `${c.prenom} ${c.nom}` : c.nom);
    return m;
  }, [contacts]);

  const statutsPresents = useMemo(
    () => Array.from(new Set(contacts.map((c) => c.statut))),
    [contacts]
  );

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    let liste = contacts.filter((c) => {
      if (q) {
        const nomComplet = `${c.prenom ?? ""} ${c.nom}`.toLowerCase();
        const correspond =
          nomComplet.includes(q) ||
          (c.telephone ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q);
        if (!correspond) return false;
      }
      if (statut && c.statut !== statut) return false;
      if (rechercheActiveSeulement && !c.rechercheActive) return false;
      if (consentement === "oui" && !c.consentementProspection) return false;
      if (consentement === "non" && c.consentementProspection) return false;
      return true;
    });

    liste = [...liste].sort((a, b) => {
      const da = a.dateDernierContact ?? "";
      const db_ = b.dateDernierContact ?? "";
      return tri === "recent" ? db_.localeCompare(da) : da.localeCompare(db_);
    });

    return liste;
  }, [contacts, recherche, statut, rechercheActiveSeulement, consentement, tri]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-3">
        <input
          type="text"
          placeholder="Rechercher un nom, un téléphone, un email…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="input col-span-2 md:flex-1 md:min-w-[220px]"
        />
        <select value={statut} onChange={(e) => setStatut(e.target.value)} className="input md:w-auto">
          <option value="">Tous statuts</option>
          {statutsPresents.map((s) => (
            <option key={s} value={s}>
              {STATUT_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <select value={consentement} onChange={(e) => setConsentement(e.target.value)} className="input md:w-auto">
          <option value="">Consentement : tous</option>
          <option value="oui">Consentement donné</option>
          <option value="non">Aucun consentement</option>
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={rechercheActiveSeulement}
            onChange={(e) => setRechercheActiveSeulement(e.target.checked)}
          />
          Recherche active seulement
        </label>
        <button
          type="button"
          onClick={() => setTri(tri === "recent" ? "ancien" : "recent")}
          className="btn-secondary text-sm"
        >
          Dernier contact : {tri === "recent" ? "plus récent d'abord" : "plus ancien d'abord"}
        </button>
      </div>

      <div className="label-sm">
        {resultats.length} contact{resultats.length > 1 ? "s" : ""}
        {resultats.length !== contacts.length ? ` sur ${contacts.length}` : ""}
      </div>

      {/* iPhone : une carte par contact, appel en un geste */}
      <ul className="md:hidden space-y-2">
        {resultats.length === 0 ? (
          <li className="card px-4 py-6 text-center text-sm text-muted">Aucun contact ne correspond.</li>
        ) : (
          resultats.map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/contacts/${c.id}`} className="min-w-0 text-sm font-medium text-accent">
                  {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                </Link>
                <span className="pill pill-neutral shrink-0">{STATUT_LABELS[c.statut] ?? c.statut}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                {c.telephone ? (
                  <a href={`tel:${c.telephone.replace(/\s/g, "")}`} className="text-text underline">
                    {c.telephone}
                  </a>
                ) : (
                  <span>—</span>
                )}
                <span>Dernier contact : {formatDate(c.dateDernierContact)}</span>
                {c.rechercheActive && <span className="chip">Recherche active</span>}
              </div>
              {(c.typeApporteur || c.apportCategorie || c.presenteParId || c.apporteParId) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  {c.typeApporteur && (
                    <span>
                      {TYPE_APPORTEUR_LABELS[c.typeApporteur] ?? c.typeApporteur}
                      {c.apportCategorie ? ` · apporte : ${(APPORT_CATEGORIE_LABELS[c.apportCategorie] ?? c.apportCategorie).toLowerCase()}` : ""}
                    </span>
                  )}
                  {c.presenteParId && <span>Présenté par {nomParId.get(c.presenteParId) ?? "—"}</span>}
                  {c.apporteParId && <span>Apporté par {nomParId.get(c.apporteParId) ?? "—"}</span>}
                </div>
              )}
            </li>
          ))
        )}
      </ul>

      <div className="card overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left label-sm border-b border-border">
              <th className="px-4 py-3 font-medium">Nom</th>
              <th className="px-4 py-3 font-medium">Téléphone</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Apporteur</th>
              <th className="px-4 py-3 font-medium">Présenté par</th>
              <th className="px-4 py-3 font-medium">Apporté par</th>
              <th className="px-4 py-3 font-medium">Dernier contact</th>
            </tr>
          </thead>
          <tbody>
            {resultats.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  Aucun contact ne correspond.
                </td>
              </tr>
            ) : (
              resultats.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-accent hover:underline">
                      {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                    </Link>
                    {c.rechercheActive && <span className="chip ml-2">Recherche active</span>}
                  </td>
                  <td className="px-4 py-3">{c.telephone ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="pill pill-neutral">{STATUT_LABELS[c.statut] ?? c.statut}</span>
                  </td>
                  <td className="px-4 py-3">
                    {c.typeApporteur ? (
                      <>
                        <div className="font-medium">{TYPE_APPORTEUR_LABELS[c.typeApporteur] ?? c.typeApporteur}</div>
                        {c.apportCategorie && (
                          <div className="text-xs text-muted">
                            apporte : {(APPORT_CATEGORIE_LABELS[c.apportCategorie] ?? c.apportCategorie).toLowerCase()}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.presenteParId ? (
                      <Link href={`/contacts/${c.presenteParId}`} className="text-accent hover:underline">
                        {nomParId.get(c.presenteParId) ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.apporteParId ? (
                      <Link href={`/contacts/${c.apporteParId}`} className="text-accent hover:underline">
                        {nomParId.get(c.apporteParId) ?? "—"}
                      </Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{formatDate(c.dateDernierContact)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
