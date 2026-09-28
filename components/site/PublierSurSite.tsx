"use client";

import { useFormState, useFormStatus } from "react-dom";
import { publierSurSite, type EtatPublication } from "@/lib/site/actions";

function Bouton({ libelle }: { libelle: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Envoi en cours… (jusqu'à quelques minutes avec les photos)" : libelle}
    </button>
  );
}

export default function PublierSurSite({ bienId, libelle }: { bienId: string; libelle: string }) {
  const [etat, action] = useFormState<EtatPublication, FormData>(publierSurSite.bind(null, bienId), null);
  return (
    <form action={action} className="space-y-3">
      <Bouton libelle={libelle} />
      {etat && (
        <div className={`rounded-lg p-3 text-sm ${etat.ok ? "bg-greenbg text-green" : "bg-redbg text-red"}`}>
          <div className="font-medium">
            {etat.ok ? "✓ " : "✕ "}
            {etat.titre}
          </div>
          {etat.details.length > 0 && (
            <ul className="mt-1 list-disc pl-5 space-y-0.5">
              {etat.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          {etat.adresse && (
            <a href={etat.adresse} target="_blank" rel="noreferrer" className="mt-1 block underline break-all">
              Voir la page sur le site
            </a>
          )}
        </div>
      )}
    </form>
  );
}
