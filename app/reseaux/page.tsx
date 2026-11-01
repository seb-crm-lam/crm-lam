import Link from "next/link";
import { getBiensAPublier, listPublicationsPeriode, SEUIL_ALERTE_PUBLICATION_JOURS } from "@/lib/repo";
import {
  FORMAT_PUBLICATION_LABELS,
  ajouterJours,
  aujourdhuiMaroc,
  depuisJours,
  ecartJours,
  formatJourCourt,
  lundiDeLaSemaine,
} from "@/lib/format";
import PastilleReseau from "@/components/publications/PastilleReseau";

export const dynamic = "force-dynamic";

export default function ReseauxPage({ searchParams }: { searchParams?: { semaine?: string } }) {
  const aujourdhui = aujourdhuiMaroc();
  const brut = searchParams?.semaine;
  const valide = brut && /^\d{4}-\d{2}-\d{2}$/.test(brut) && !isNaN(new Date(brut + "T12:00:00Z").getTime());
  const lundi = lundiDeLaSemaine(valide ? brut! : aujourdhui);
  const dimanche = ajouterJours(lundi, 6);
  const jours = Array.from({ length: 7 }, (_, i) => ajouterJours(lundi, i));
  const publications = listPublicationsPeriode(lundi, dimanche);
  const aPublier = getBiensAPublier(aujourdhui);
  const semaineCourante = lundi === lundiDeLaSemaine(aujourdhui);

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Publications réseaux</h1>

      <div className="card p-5 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="label-sm">
            Semaine du {formatJourCourt(lundi)} au {formatJourCourt(dimanche)}
          </span>
          <span className="flex gap-2">
            <Link href={`/reseaux?semaine=${ajouterJours(lundi, -7)}`} className="btn-secondary text-xs">
              ← Précédente
            </Link>
            {!semaineCourante && (
              <Link href="/reseaux" className="btn-secondary text-xs">
                Aujourd'hui
              </Link>
            )}
            <Link href={`/reseaux?semaine=${ajouterJours(lundi, 7)}`} className="btn-secondary text-xs">
              Suivante →
            </Link>
          </span>
        </div>
        <ul className="divide-y divide-border">
          {jours.map((j) => {
            const duJour = publications.filter((p) => p.datePublication === j);
            return (
              <li key={j} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-2.5 text-sm">
                <span className={j === aujourdhui ? "font-medium" : "text-muted"}>{formatJourCourt(j)}</span>
                {duJour.length === 0 ? (
                  <span className="text-muted">Aucune publication</span>
                ) : (
                  <ul className="space-y-1.5">
                    {duJour.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center gap-2">
                        <PastilleReseau reseau={p.reseau} />
                        <span>{FORMAT_PUBLICATION_LABELS[p.format] ?? p.format}</span>
                        <span className="text-muted">·</span>
                        <Link href={`/biens/${p.bienId}`} className="text-accent hover:underline">
                          {p.bienReference}
                        </Link>
                        {p.bienDiffusionEtat === "off_market" && <span className="pill pill-interne">Off-market</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="label-sm">À publier</span>
          <span className="pill pill-accent">{aPublier.length}</span>
        </div>
        <p className="text-xs text-muted mb-3">
          Biens sans publication depuis plus de {SEUIL_ALERTE_PUBLICATION_JOURS} jours. Les biens off-market n'y figurent
          jamais.
        </p>
        {aPublier.length === 0 ? (
          <p className="text-sm text-muted">Rien à signaler.</p>
        ) : (
          <ul className="space-y-2">
            {aPublier.map(({ bien, dernierePublication }) => (
              <li key={bien.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <Link href={`/biens/${bien.id}`} className="text-accent hover:underline">
                  {bien.reference} — {bien.titre}
                </Link>
                <span className="text-red font-medium">
                  {dernierePublication ? depuisJours(ecartJours(dernierePublication, aujourdhui)) : "Jamais publié"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
