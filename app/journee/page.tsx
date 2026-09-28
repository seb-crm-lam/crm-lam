import Link from "next/link";
import {
  getDemandesSansReponse,
  getQuartiersSansTexte,
  getBiensRetiresARelancer,
  getClientsAboutisARelancer,
  getBien,
  listBiens,
  listContactsAvecRechercheActive,
  getEnvoisWhatsappDuJour,
} from "@/lib/repo";
import { annulerEnvoiWhatsapp } from "@/lib/actions";
import { heuresDepuisTexte, formatDate } from "@/lib/format";


// Données lues à chaque affichage (sinon la page serait figée au moment de la construction).
export const dynamic = "force-dynamic";

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <span className="label-sm">{title}</span>
        <span className="pill pill-accent">{count}</span>
      </div>
      {count === 0 ? <p className="text-sm text-muted">Rien à signaler.</p> : <ul className="space-y-2">{children}</ul>}
    </div>
  );
}

function StatTile({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="card p-4 hover:bg-bg transition-colors">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="label-sm mt-1">{label}</div>
    </Link>
  );
}

export default function JourneePage() {
  const demandes = getDemandesSansReponse();
  const quartiers = getQuartiersSansTexte();
  const biensRetires = getBiensRetiresARelancer();
  const clientsAboutis = getClientsAboutisARelancer();
  const envoisDuJour = getEnvoisWhatsappDuJour();

  const biens = listBiens();
  const contacts = listContactsAvecRechercheActive();
  const biensPublies = biens.filter((b) => b.diffusionEtat === "publie").length;
  const biensBrouillon = biens.filter((b) => b.diffusionEtat === "brouillon").length;
  const biensSousPromesse = biens.filter((b) => b.statutCommercial === "sous_promesse").length;
  const contactsRechercheActive = contacts.filter((c) => c.rechercheActive).length;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Ma journée</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatTile label="Biens publiés" value={biensPublies} href="/biens" />
        <StatTile label="Biens en brouillon" value={biensBrouillon} href="/biens" />
        <StatTile label="Biens sous promesse" value={biensSousPromesse} href="/biens" />
        <StatTile label="Contacts en recherche active" value={contactsRechercheActive} href="/contacts" />
      </div>

      <div className="space-y-6">
        <Section title="Demandes sans réponse" count={demandes.length}>
          {demandes.map((d) => (
            <li key={d.id} className="text-sm flex items-center justify-between">
              <span>
                {d.nom ?? "Anonyme"} — {d.typeDemande}
                {d.bienId && (
                  <>
                    {" "}
                    ·{" "}
                    <Link href={`/biens/${d.bienId}`} className="text-accent hover:underline">
                      {getBien(d.bienId)?.reference}
                    </Link>
                  </>
                )}
              </span>
              <span className="label-sm">{heuresDepuisTexte(d.dateReception)}</span>
            </li>
          ))}
        </Section>

        <div className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
            <span className="label-sm">Envois WhatsApp du jour</span>
            <span className="pill pill-accent">{envoisDuJour.filter((e) => !e.annule).length}</span>
          </div>
          <p className="text-xs text-muted mb-3">
            Le CRM note l'envoi au clic sur « Ouvrir WhatsApp ». Si le message n'est finalement pas parti,
            indique-le ici.
          </p>
          {envoisDuJour.length === 0 ? (
            <p className="text-sm text-muted">Aucun envoi aujourd'hui.</p>
          ) : (
            <ul className="space-y-2">
              {envoisDuJour.map((e) => {
                const heure = new Date(
                  e.dateEvenement.includes("T") ? e.dateEvenement : e.dateEvenement.replace(" ", "T") + "Z"
                ).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const nom = e.contactPrenom ? `${e.contactPrenom} ${e.contactNom}` : e.contactNom ?? "—";
                return (
                  <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <span className={`min-w-0 ${e.annule ? "text-muted line-through" : ""}`}>
                      <span className="label-sm mr-2">{heure}</span>
                      {e.contactId ? (
                        <Link href={`/contacts/${e.contactId}`} className="text-accent hover:underline">
                          {nom}
                        </Link>
                      ) : (
                        nom
                      )}
                      {e.bienReference ? ` · ${e.bienReference}` : ""}
                    </span>
                    {e.annule ? (
                      <span className="pill pill-neutral">Pas envoyé</span>
                    ) : (
                      <form action={annulerEnvoiWhatsapp.bind(null, e.id)}>
                        <button type="submit" className="btn-secondary text-xs">
                          Pas envoyé
                        </button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <Section title="Quartiers sans texte" count={quartiers.length}>
          {quartiers.map((q) => (
            <li key={q.id} className="text-sm flex items-center justify-between">
              <span>{q.nom}</span>
              <span className="label-sm">{formatDate(q.datePremierSignalement)}</span>
            </li>
          ))}
        </Section>

        <Section title="Biens retirés à relancer" count={biensRetires.length}>
          {biensRetires.map((b) => (
            <li key={b.id} className="text-sm flex items-center justify-between">
              <Link href={`/biens/${b.id}`} className="text-accent hover:underline">
                {b.reference} — {b.titre}
              </Link>
              <span className="label-sm">{b.motifDeSortie ?? "—"}</span>
            </li>
          ))}
        </Section>

        <Section title="Clients aboutis à relancer" count={clientsAboutis.length}>
          {clientsAboutis.map((c) => (
            <li key={c.contact.id} className="text-sm flex items-center justify-between">
              <Link href={`/contacts/${c.contact.id}`} className="text-accent hover:underline">
                {c.contact.prenom ? `${c.contact.prenom} ${c.contact.nom}` : c.contact.nom}
              </Link>
              <span className="label-sm">{c.bien?.reference ?? "—"} · {formatDate(c.dateVente)}</span>
            </li>
          ))}
        </Section>
      </div>
    </div>
  );
}
