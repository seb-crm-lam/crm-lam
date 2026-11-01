import { ajouterPublication } from "@/lib/actions";
import { listPublicationsBien } from "@/lib/repo";
import {
  FORMAT_PUBLICATION_LABELS,
  RESEAU_ABREGE,
  RESEAU_LABELS,
  aujourdhuiMaroc,
  depuisJours,
  ecartJours,
  formatJourCourt,
  ajouterJours,
} from "@/lib/format";
import PastilleReseau from "./PastilleReseau";
import SupprimerPublication from "./SupprimerPublication";

// Choix par boutons radio habillés en puces : aucune saisie au clavier, tout au pouce.
function Puces({ name, valeurs }: { name: string; valeurs: [string, string][] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {valeurs.map(([v, label]) => (
        <label key={v} className="cursor-pointer">
          <input type="radio" name={name} value={v} required className="peer sr-only" />
          <span className="inline-flex items-center rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm peer-checked:border-accent peer-checked:bg-accentbg peer-checked:font-medium peer-checked:text-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/30 md:py-2">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}

export default function SectionPublicationsBien({ bienId, offMarket }: { bienId: string; offMarket: boolean }) {
  const publications = listPublicationsBien(bienId);
  const aujourdhui = aujourdhuiMaroc();
  const debut30 = ajouterJours(aujourdhui, -29);
  const sur30 = publications.filter((p) => p.datePublication >= debut30 && p.datePublication <= aujourdhui);
  const parReseau = Object.keys(RESEAU_LABELS).map((r) => `${RESEAU_ABREGE[r]} ${sur30.filter((p) => p.reseau === r).length}`);
  const derniere = publications[0]?.datePublication;

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="label-sm">Publications réseaux</span>
        {offMarket && <span className="pill pill-interne">Off-market</span>}
      </div>

      <div className="grid grid-cols-3 gap-2 text-sm">
        <div className="rounded-lg bg-bg p-3">
          <div className="label-sm">Dernière</div>
          <div className="font-medium">{derniere ? depuisJours(ecartJours(derniere, aujourdhui)) : "Jamais"}</div>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <div className="label-sm">Sur 30 jours</div>
          <div className="font-medium">{sur30.length}</div>
        </div>
        <div className="rounded-lg bg-bg p-3">
          <div className="label-sm">Par réseau</div>
          <div className="font-medium">{parReseau.join(" · ")}</div>
        </div>
      </div>

      <form action={ajouterPublication.bind(null, bienId)} className="space-y-3 border-t border-border pt-3">
        <div>
          <div className="label-sm mb-1.5">Réseau</div>
          <Puces name="reseau" valeurs={Object.entries(RESEAU_LABELS)} />
        </div>
        <div>
          <div className="label-sm mb-1.5">Format</div>
          <Puces name="format" valeurs={Object.entries(FORMAT_PUBLICATION_LABELS)} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="label-sm">Date</span>
            <input type="date" name="datePublication" defaultValue={aujourdhui} required className="input mt-1" />
          </label>
          <button type="submit" className="btn-primary">
            Enregistrer
          </button>
        </div>
      </form>

      {publications.length > 0 && (
        <ul className="divide-y divide-border border-t border-border text-sm">
          {publications.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <span className="flex min-w-0 items-center gap-2">
                <span className="w-28 shrink-0 text-muted">{formatJourCourt(p.datePublication)}</span>
                <PastilleReseau reseau={p.reseau} />
                <span>{FORMAT_PUBLICATION_LABELS[p.format] ?? p.format}</span>
              </span>
              <SupprimerPublication id={p.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
