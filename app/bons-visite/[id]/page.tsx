import { notFound } from "next/navigation";
import Link from "next/link";
import { getBonVisite, getBonVisiteLignes, getContact, getVisitesPourLigne } from "@/lib/repo";
import { marquerBonVisiteSigne, creerVisite } from "@/lib/actions";
import {
  formatDate,
  formatDateHeure,
  formatDh,
  TYPE_BIEN_LABELS,
  VERDICT_VISITE_LABELS,
  MOTIF_VISITE_LABELS,
  SUITE_VISITE_LABELS,
} from "@/lib/format";

const MOTIFS = Object.entries(MOTIF_VISITE_LABELS);

export default function BonVisiteDetailPage({ params }: { params: { id: string } }) {
  const bonVisite = getBonVisite(params.id);
  if (!bonVisite) notFound();

  const contact = getContact(bonVisite.contactId);
  const lignes = getBonVisiteLignes(bonVisite.id);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label-sm mb-1">Bon de visite {bonVisite.reference}</div>
          <h1 className="text-xl font-semibold">
            {contact ? (
              <Link href={`/contacts/${contact.id}`} className="hover:underline">
                {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
              </Link>
            ) : (
              "Visiteur inconnu"
            )}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span className={`pill ${bonVisite.signe ? "pill-green" : "pill-neutral"}`}>
            {bonVisite.signe ? `Signé le ${formatDate(bonVisite.dateSignature)}` : "Non signé"}
          </span>
          <a href={`/api/documents/bon-visite/${bonVisite.id}`} target="_blank" className="btn-primary">
            PDF
          </a>
        </div>
      </div>

      {/* Marquage signé — A30 : « au retour, marquer signé, avec la date et
          la photo du papier ». */}
      {!bonVisite.signe && (
        <div className="card p-5">
          <div className="label-sm mb-3">Marquer signé</div>
          <form action={marquerBonVisiteSigne.bind(null, bonVisite.id)} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="label-sm block mb-1">Date de signature</label>
              <input type="date" name="dateSignature" required className="input" />
            </div>
            <div>
              <label className="label-sm block mb-1">Photo du papier</label>
              <input type="file" name="photoPapier" accept="image/*" className="text-sm" />
            </div>
            <button type="submit" className="btn-primary">
              Marquer signé
            </button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {lignes.map((ligne, i) => {
          const visites = getVisitesPourLigne(ligne.id);
          return (
            <div key={ligne.id} className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="label-sm">Ligne {i + 1}</span>
                  <div className="font-medium">
                    <Link href={`/biens/${ligne.bien.id}`} className="hover:underline">
                      {ligne.bien.reference}
                    </Link>{" "}
                    — {TYPE_BIEN_LABELS[ligne.bien.typeBien] ?? ligne.bien.typeBien} · {ligne.bien.quartierNom ?? "—"}
                  </div>
                </div>
                <div className="text-right text-xs text-muted">
                  <div>Visite du {formatDate(ligne.dateLigne)}</div>
                  <div>Non-contournement jusqu'au {formatDate(ligne.finNonContournement)}</div>
                  <div>
                    Honoraires acquéreur :{" "}
                    {ligne.honorairesAcquereurPourcentage ? `${ligne.honorairesAcquereurPourcentage} %` : "Néant"}
                  </div>
                </div>
              </div>

              {visites.length > 0 && (
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="label-sm">Comptes rendus</div>
                  {visites.map((v) => (
                    <div key={v.id} className="text-sm flex gap-3">
                      <span className="text-muted shrink-0 w-24">{formatDateHeure(v.dateVisite)}</span>
                      <div>
                        <span className="pill pill-neutral">
                          {v.verdict ? VERDICT_VISITE_LABELS[v.verdict] : "—"}
                        </span>{" "}
                        {v.motifs && v.motifs.length > 0 && (
                          <span className="text-muted">
                            {v.motifs.map((m) => MOTIF_VISITE_LABELS[m] ?? m).join(", ")}
                          </span>
                        )}
                        {v.objectionPrix && (
                          <span className="text-muted"> · Objection prix : {formatDh(v.objectionPrix)}</span>
                        )}
                        {v.noteLibre && <div className="text-muted italic">« {v.noteLibre} »</div>}
                        {v.suite && (
                          <div className="text-xs text-muted">Suite : {SUITE_VISITE_LABELS[v.suite] ?? v.suite}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <details className="border-t border-border pt-3">
                <summary className="label-sm cursor-pointer">Ajouter un compte rendu</summary>
                <form action={creerVisite.bind(null, ligne.id)} className="space-y-3 mt-3">
                  <div>
                    <label className="label-sm block mb-1">Verdict</label>
                    <select name="verdict" className="input">
                      <option value="">—</option>
                      {Object.entries(VERDICT_VISITE_LABELS).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label-sm block mb-1">Ce qui a plu / ce qui bloque</label>
                    <div className="flex flex-wrap gap-2">
                      {MOTIFS.map(([m, label]) => (
                        <label key={m} className="chip flex items-center gap-1 cursor-pointer">
                          <input type="checkbox" name="motif" value={m} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label-sm block mb-1">Note libre</label>
                    <textarea name="noteLibre" rows={2} className="input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label-sm block mb-1">Objection prix</label>
                      <input type="number" name="objectionPrix" className="input" />
                    </div>
                    <div>
                      <label className="label-sm block mb-1">Suite</label>
                      <select name="suite" className="input">
                        <option value="">—</option>
                        {Object.entries(SUITE_VISITE_LABELS).map(([s, label]) => (
                          <option key={s} value={s}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="pieceIdentiteVue" />
                    Pièce d'identité vue
                  </label>
                  <button type="submit" className="btn-secondary">
                    Enregistrer le compte rendu
                  </button>
                </form>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
