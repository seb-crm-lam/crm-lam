"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Bien } from "@/lib/types";
import { formatDh, formatM2, TYPE_BIEN_LABELS, DIFFUSION_LABELS, STATUT_COMMERCIAL_LABELS } from "@/lib/format";

function diffusionPill(etat: string) {
  const cls = etat === "publie" ? "pill-green" : etat === "archive" ? "pill-red" : "pill-neutral";
  return <span className={`pill ${cls}`}>{DIFFUSION_LABELS[etat] ?? etat}</span>;
}

export default function BiensTable({ biens }: { biens: Bien[] }) {
  const [recherche, setRecherche] = useState("");
  const [typeBien, setTypeBien] = useState("");
  const [statutCommercial, setStatutCommercial] = useState("");
  const [diffusionEtat, setDiffusionEtat] = useState("");
  const [quartier, setQuartier] = useState("");

  const typesPresents = useMemo(() => Array.from(new Set(biens.map((b) => b.typeBien))), [biens]);
  const statutsPresents = useMemo(() => Array.from(new Set(biens.map((b) => b.statutCommercial))), [biens]);
  const diffusionsPresentes = useMemo(() => Array.from(new Set(biens.map((b) => b.diffusionEtat))), [biens]);
  const quartiersPresents = useMemo(
    () => Array.from(new Set(biens.map((b) => b.quartierNom).filter((q): q is string => !!q))).sort(),
    [biens]
  );

  const resultats = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return biens.filter((b) => {
      if (q) {
        const correspond =
          b.reference.toLowerCase().includes(q) || b.titre.toLowerCase().includes(q);
        if (!correspond) return false;
      }
      if (typeBien && b.typeBien !== typeBien) return false;
      if (statutCommercial && b.statutCommercial !== statutCommercial) return false;
      if (diffusionEtat && b.diffusionEtat !== diffusionEtat) return false;
      if (quartier && b.quartierNom !== quartier) return false;
      return true;
    });
  }, [biens, recherche, typeBien, statutCommercial, diffusionEtat, quartier]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-3">
        <input
          type="text"
          placeholder="Rechercher une référence, un titre…"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          className="input col-span-2 md:flex-1 md:min-w-[220px]"
        />
        <select value={typeBien} onChange={(e) => setTypeBien(e.target.value)} className="input md:w-auto">
          <option value="">Tous types</option>
          {typesPresents.map((t) => (
            <option key={t} value={t}>
              {TYPE_BIEN_LABELS[t] ?? t}
            </option>
          ))}
        </select>
        <select value={statutCommercial} onChange={(e) => setStatutCommercial(e.target.value)} className="input md:w-auto">
          <option value="">Tous statuts</option>
          {statutsPresents.map((s) => (
            <option key={s} value={s}>
              {STATUT_COMMERCIAL_LABELS[s] ?? s}
            </option>
          ))}
        </select>
        <select value={diffusionEtat} onChange={(e) => setDiffusionEtat(e.target.value)} className="input md:w-auto">
          <option value="">Toute diffusion</option>
          {diffusionsPresentes.map((d) => (
            <option key={d} value={d}>
              {DIFFUSION_LABELS[d] ?? d}
            </option>
          ))}
        </select>
        <select value={quartier} onChange={(e) => setQuartier(e.target.value)} className="input md:w-auto">
          <option value="">Tous quartiers</option>
          {quartiersPresents.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>

      <div className="label-sm">
        {resultats.length} bien{resultats.length > 1 ? "s" : ""}
        {resultats.length !== biens.length ? ` sur ${biens.length}` : ""}
      </div>

      {/* iPhone : une carte par bien */}
      <ul className="md:hidden space-y-2">
        {resultats.length === 0 ? (
          <li className="card px-4 py-6 text-center text-sm text-muted">Aucun bien ne correspond.</li>
        ) : (
          resultats.map((b) => (
            <li key={b.id}>
              <Link href={`/biens/${b.id}`} className="card block p-4 active:bg-bg">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-accent">{b.reference}</div>
                    <div className="text-sm">{b.titre}</div>
                  </div>
                  {diffusionPill(b.diffusionEtat)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                  <span className="font-medium text-text">
                    {b.prixSurDemande ? "Sur demande" : formatDh(b.prixVente)}
                  </span>
                  {b.surfaceSol ? <span>{formatM2(b.surfaceSol)}</span> : null}
                  <span>{TYPE_BIEN_LABELS[b.typeBien] ?? b.typeBien}</span>
                  {b.quartierNom && <span>{b.quartierNom}</span>}
                  <span>{STATUT_COMMERCIAL_LABELS[b.statutCommercial] ?? b.statutCommercial}</span>
                </div>
              </Link>
            </li>
          ))
        )}
      </ul>

      <div className="card overflow-hidden hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left label-sm border-b border-border">
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Titre</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Quartier</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Diffusion</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {resultats.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted">
                  Aucun bien ne correspond.
                </td>
              </tr>
            ) : (
              resultats.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0 hover:bg-bg">
                  <td className="px-4 py-3">
                    <Link href={`/biens/${b.id}`} className="font-medium text-accent hover:underline">
                      {b.reference}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{b.titre}</td>
                  <td className="px-4 py-3">{TYPE_BIEN_LABELS[b.typeBien] ?? b.typeBien}</td>
                  <td className="px-4 py-3">{b.quartierNom ?? "—"}</td>
                  <td className="px-4 py-3">
                    {b.prixSurDemande ? "Sur demande" : formatDh(b.prixVente)}
                    {b.surfaceSol ? <span className="label-sm"> · {formatM2(b.surfaceSol)}</span> : null}
                  </td>
                  <td className="px-4 py-3">{diffusionPill(b.diffusionEtat)}</td>
                  <td className="px-4 py-3">
                    <span className="pill pill-neutral">
                      {STATUT_COMMERCIAL_LABELS[b.statutCommercial] ?? b.statutCommercial}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
