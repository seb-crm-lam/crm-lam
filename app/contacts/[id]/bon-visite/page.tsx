import { notFound } from "next/navigation";
import { getContact, listBiens } from "@/lib/repo";
import { creerBonVisite } from "@/lib/actions";
import { TYPE_BIEN_LABELS } from "@/lib/format";



export const dynamic = "force-dynamic";

export default function BonVisitePage({ params }: { params: { id: string } }) {
  const contact = getContact(params.id);
  if (!contact) notFound();

  const biens = listBiens().filter((b) => b.diffusionEtat !== "archive");

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Bon de visite</h1>
      <p className="label-sm mb-6">
        Pour {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom} — sélectionner jusqu'à 4 biens
        présentés
      </p>

      {/* Server action : crée le BonVisite + ses lignes en base, puis
          redirige vers la fiche du bon où le PDF peut être généré et le
          document marqué signé au retour. */}
      <form action={creerBonVisite} className="space-y-4">
        <input type="hidden" name="contactId" value={contact.id} />
        <div className="card divide-y divide-border">
          {biens.map((b) => (
            <label key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm cursor-pointer">
              <input type="checkbox" name="bienId" value={b.id} className="rounded border-border" />
              <span className="font-medium whitespace-nowrap">{b.reference}</span>
              <span className="text-muted">
                {TYPE_BIEN_LABELS[b.typeBien] ?? b.typeBien} · {b.quartierNom ?? "—"} — {b.titre}
              </span>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted">Quatre biens maximum par bon — au-delà, créer un second bon.</p>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            Créer le bon de visite
          </button>
        </div>
      </form>
    </div>
  );
}
