import { GROUPES_PRESTATION, GROUPE_PRESTATION_LABELS } from "@/lib/format";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getBien,
  getBienPhotos,
  getBienPrestations,
  calculerFeuVert,
  getContact,
  getBienDocuments,
  getVisitesPourBien,
  getPiecesDossier,
  listContacts,
} from "@/lib/repo";
import { marquerDocumentSigne, ajouterPhotosBien, supprimerPhotoBien, mettreAJourPieceDossier } from "@/lib/actions";
import EnvoyerCompteRendu from "@/components/EnvoyerCompteRendu";
import { NIVEAU_LABELS, BLOC_LABELS, blocFondsActif } from "@/lib/pieces";
import {
  formatDh,
  formatM2,
  formatDate,
  TYPE_BIEN_LABELS,
  TRANSACTION_LABELS,
  DIFFUSION_LABELS,
  STATUT_COMMERCIAL_LABELS,
  VERDICT_VISITE_LABELS,
  MOTIF_VISITE_LABELS,
  SUITE_VISITE_LABELS,
  TYPE_DOCUMENT_LABELS,
  QUALITE_MANDANT_LABELS,
  TYPE_ORIGINE_LABELS,
  ETAT_EXPLOITATION_LABELS,
  EQUIPEMENT_LABELS,
} from "@/lib/format";

export default function FicheBienPage({ params }: { params: { id: string } }) {
  const bien = getBien(params.id);
  if (!bien) notFound();

  const photos = getBienPhotos(bien.id);
  const prestations = getBienPrestations(bien.id);
  const feuVert = calculerFeuVert(bien);
  const proprietaire = bien.proprietaireId ? getContact(bien.proprietaireId) : undefined;
  const apporteur = bien.apporteurId ? getContact(bien.apporteurId) : undefined;
  const documents = getBienDocuments(bien.id);
  const visites = getVisitesPourBien(bien.id);
  const pieces = getPiecesDossier(bien);
  const piecesBase = pieces.filter((p) => p.bloc === "base");
  const piecesParNiveau = { 1: piecesBase.filter((p) => p.niveau === 1), 2: piecesBase.filter((p) => p.niveau === 2), 3: piecesBase.filter((p) => p.niveau === 3) };
  const blocsComplementaires = (["societe", "fonds"] as const)
    .map((bloc) => ({ bloc, pieces: pieces.filter((p) => p.bloc === bloc) }))
    .filter((b) => b.pieces.length > 0);
  const fondsActif = blocFondsActif(bien);
  const contactsCandidats = fondsActif ? listContacts().filter((c) => !c.anonymise) : [];
  const nomsContacts = new Map(listContacts().map((c) => [c.id, `${c.prenom ?? ""} ${c.nom}`.trim()]));
  const derniereVisite = visites[0];

  const texteCompteRendu = derniereVisite
    ? [
        `Bonjour, voici le compte rendu de la dernière visite de votre bien ${bien.reference} — ${bien.titre} :`,
        `Date : ${formatDate(derniereVisite.dateVisite)}`,
        `Retour : ${derniereVisite.verdict ? VERDICT_VISITE_LABELS[derniereVisite.verdict] ?? derniereVisite.verdict : "—"}`,
        derniereVisite.motifs && derniereVisite.motifs.length > 0
          ? `Points évoqués : ${derniereVisite.motifs.map((m) => MOTIF_VISITE_LABELS[m] ?? m).join(", ")}`
          : null,
        derniereVisite.noteLibre ? `Note : ${derniereVisite.noteLibre}` : null,
        `Suite : ${derniereVisite.suite ? SUITE_VISITE_LABELS[derniereVisite.suite] ?? derniereVisite.suite : "—"}`,
        `— L'Adresse Marrakchie`,
      ]
        .filter(Boolean)
        .join("\n")
    : "";

  const groupes = prestations.reduce<Record<string, typeof prestations>>((acc, p) => {
    (acc[p.groupe] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* Barre du haut */}
      <div className="flex flex-col gap-3 mb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="label-sm">{bien.reference}</span>
            <span className="pill pill-neutral">{TYPE_BIEN_LABELS[bien.typeBien] ?? bien.typeBien}</span>
            <span className="pill pill-neutral">{TRANSACTION_LABELS[bien.transaction] ?? bien.transaction}</span>
            <span className={`pill ${bien.diffusionEtat === "publie" ? "pill-green" : "pill-neutral"}`}>
              {DIFFUSION_LABELS[bien.diffusionEtat] ?? bien.diffusionEtat}
            </span>
            <span className="pill pill-accent">
              {STATUT_COMMERCIAL_LABELS[bien.statutCommercial] ?? bien.statutCommercial}
            </span>
          </div>
          <h1 className="text-xl font-semibold">{bien.titre}</h1>
        </div>
        <div className="flex flex-wrap gap-2 md:shrink-0">
          <Link href={`/biens/${bien.id}/edit`} className="btn-secondary">
            Modifier
          </Link>
          <a href={`/api/documents/fiche-bien/${bien.id}`} target="_blank" className="btn-secondary">
            Fiche client (PDF)
          </a>
          <a href={`/api/documents/mandat/${bien.id}`} target="_blank" className="btn-primary">
            Créer le mandat (PDF)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {/* Colonne gauche */}
        <div className="md:col-span-2 space-y-6">
          {/* 27 septembre : description publique, facultative, jamais bloquante. */}
          <div className="card p-5 space-y-2">
            <span className="label-sm">Description (publique)</span>
            {bien.description ? (
              <p className="text-sm whitespace-pre-wrap">{bien.description}</p>
            ) : (
              <p className="text-sm text-muted">Aucune description pour l'instant — peut être ajoutée à tout moment.</p>
            )}
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-sm">Photos ({photos.length})</span>
            </div>
            {photos.length === 0 ? (
              <div className="aspect-video flex items-center justify-center text-muted text-sm bg-bg rounded-lg">
                Aucune photo
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="relative group">
                    {/* Le fichier est servi par /api/documents/fichier — chemin stocké côté serveur uniquement */}
                    <img
                      src={`/api/documents/fichier?chemin=${encodeURIComponent(p.cheminWeb)}`}
                      alt={p.texteAlternatif ?? ""}
                      className="w-full aspect-video object-cover rounded-lg border border-border"
                    />
                    <form action={supprimerPhotoBien.bind(null, p.id, bien.id)} className="absolute top-1 right-1">
                      <button
                        type="submit"
                        className="bg-black/60 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer cette photo"
                      >
                        ×
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
            <form action={ajouterPhotosBien.bind(null, bien.id)} className="flex flex-wrap items-center gap-2 pt-1 border-t border-border">
              <input
                type="file"
                name="photos"
                accept="image/*"
                multiple
                className="text-xs flex-1 min-w-0"
              />
              <button type="submit" className="btn-secondary text-xs">
                Ajouter
              </button>
            </form>
          </div>

          <div className="card p-5">
            <div className="label-sm mb-2">Mise en avant</div>
            <p className="text-sm">
              {bien.mentionEditoriale === "coup_de_coeur"
                ? "Coup de cœur"
                : bien.mentionEditoriale === "rare"
                  ? "Rare"
                  : bien.mentionEditoriale ?? "—"}
            </p>
          </div>

          <div className="card p-5">
            <div className="label-sm mb-3">Prestations</div>
            {Object.keys(groupes).length === 0 ? (
              <p className="text-sm text-muted">Aucune prestation renseignée</p>
            ) : (
              <div className="space-y-3">
                {GROUPES_PRESTATION.filter((g) => groupes[g.code]).map((g) => [g.code, groupes[g.code]] as const).map(([groupe, items]) => (
                  <div key={groupe}>
                    <div className="text-xs text-muted mb-1.5">{GROUPE_PRESTATION_LABELS[groupe] ?? groupe}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((p) => (
                        <span key={p.id} className="chip">
                          {p.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-5">
            <div className="label-sm mb-3">Suivi commercial</div>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div>
                <div className="label-sm">Conseiller référent</div>
                <div>{bien.conseillerReferent ?? "—"}</div>
              </div>
              <div>
                <div className="label-sm">Propriétaire</div>
                <div>{proprietaire ? `${proprietaire.prenom ?? ""} ${proprietaire.nom}`.trim() : "—"}</div>
              </div>
              <div>
                <div className="label-sm">Apporteur</div>
                <div>{apporteur ? `${apporteur.prenom ?? ""} ${apporteur.nom}`.trim() : "—"}</div>
              </div>
              <div>
                <div className="label-sm">Origine</div>
                <div>{bien.typeOrigine ?? "—"}</div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="label-sm mb-2">Commentaire</div>
            <p className="text-sm whitespace-pre-wrap">{bien.notesInternes || "Aucune note."}</p>
          </div>

          <div className="card p-5">
            <div className="label-sm mb-3">Documents générés</div>
            {documents.length === 0 ? (
              <p className="text-sm text-muted">Aucun document généré pour l'instant.</p>
            ) : (
              <div className="space-y-3">
                {documents.map((d) => (
                  <div key={d.id} className="flex flex-col gap-2 text-sm border-b border-border pb-3 last:border-0 last:pb-0 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="font-medium">
                        {TYPE_DOCUMENT_LABELS[d.typeDocument] ?? d.typeDocument} {d.modeleVersion ?? ""}
                      </div>
                      <div className="text-muted text-xs">
                        généré le {formatDate(d.dateGeneration)}
                        {d.typeDocument === "engagement_confidentialite" && d.contactId
                          ? ` — candidat : ${nomsContacts.get(d.contactId) ?? "—"}`
                          : ""}
                      </div>
                    </div>
                    {d.typeDocument === "compte_rendu" ? null : d.signe ? (
                      <span className="pill pill-green">Signé le {formatDate(d.dateSignature)}</span>
                    ) : (
                      <form action={marquerDocumentSigne.bind(null, d.id)} className="flex flex-wrap items-center gap-2">
                        <input type="date" name="dateSignature" required className="input !w-auto md:text-xs" />
                        <input type="file" name="photoPapier" accept="image/*" className="text-xs max-w-[9rem]" />
                        <button type="submit" className="btn-secondary text-xs">
                          Marquer signé
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {fondsActif && (
            <div className="card p-5 space-y-3">
              <div className="label-sm">Engagement de confidentialité</div>
              <p className="text-xs text-muted">
                À faire signer par le candidat acquéreur avant toute remise des comptes d'exploitation. Le taux est repris du mandat ; modifiable ici.
              </p>
              <form
                action={`/api/documents/engagement/${bien.id}`}
                method="get"
                target="_blank"
                className="flex flex-col gap-2 md:flex-row md:items-end"
              >
                <label className="block text-sm md:flex-1">
                  <span className="label-sm block mb-1">Candidat acquéreur *</span>
                  <select name="contactId" required defaultValue="" className="input">
                    <option value="" disabled>
                      Choisir un contact
                    </option>
                    {contactsCandidats.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm md:w-36">
                  <span className="label-sm block mb-1">Taux HT (%)</span>
                  <input
                    type="number"
                    step="0.1"
                    name="taux"
                    defaultValue={bien.honorairesPourcentage ?? ""}
                    className="input"
                  />
                </label>
                <button type="submit" className="btn-primary">
                  Générer (PDF)
                </button>
              </form>
            </div>
          )}

          <div className="card p-5 space-y-4">
            <div className="label-sm">Dossier de pièces vendeur</div>
            {([1, 2, 3] as const).map((niveau) => (
              <div key={niveau}>
                <div className="text-xs text-muted mb-2">{NIVEAU_LABELS[niveau]}</div>
                <div className="space-y-2">
                  {piecesParNiveau[niveau].map((p) => (
                    <form
                      key={p.pieceKey}
                      action={mettreAJourPieceDossier.bind(null, bien.id, p.pieceKey)}
                      className="flex flex-wrap items-center gap-2 text-sm border-b border-border pb-2 last:border-0"
                    >
                      <span className="w-full md:w-auto md:flex-1 md:min-w-[180px]">{p.nom}</span>
                      <input type="date" name="recueLe" defaultValue={p.recueLe ?? ""} className="input !w-auto flex-1 md:flex-none md:text-xs" />
                      <select name="conforme" defaultValue={p.conforme === null ? "" : p.conforme ? "oui" : "non"} className="input !w-auto flex-1 md:flex-none md:text-xs">
                        <option value="">Conforme ?</option>
                        <option value="oui">Conforme</option>
                        <option value="non">Non conforme</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="relanceDemandee" defaultChecked={p.relanceDemandee} />
                        Relance
                      </label>
                      <button type="submit" className="btn-secondary text-xs">
                        Enregistrer
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
            {blocsComplementaires.map(({ bloc, pieces: piecesBloc }) => (
              <div key={bloc}>
                <div className="text-xs text-muted mb-2">{BLOC_LABELS[bloc]}</div>
                <div className="space-y-2">
                  {piecesBloc.map((p) => (
                    <form
                      key={p.pieceKey}
                      action={mettreAJourPieceDossier.bind(null, bien.id, p.pieceKey)}
                      className="flex flex-wrap items-center gap-2 text-sm border-b border-border pb-2 last:border-0"
                    >
                      <span className="w-full md:w-auto md:flex-1 md:min-w-[180px]">
                        <span className="pill pill-neutral mr-2">Niv. {p.niveau}</span>
                        {p.nom}
                      </span>
                      <input type="date" name="recueLe" defaultValue={p.recueLe ?? ""} className="input !w-auto flex-1 md:flex-none md:text-xs" />
                      <select name="conforme" defaultValue={p.conforme === null ? "" : p.conforme ? "oui" : "non"} className="input !w-auto flex-1 md:flex-none md:text-xs">
                        <option value="">Conforme ?</option>
                        <option value="oui">Conforme</option>
                        <option value="non">Non conforme</option>
                      </select>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" name="relanceDemandee" defaultChecked={p.relanceDemandee} />
                        Relance
                      </label>
                      <button type="submit" className="btn-secondary text-xs">
                        Enregistrer
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted">
              Pièces « société » : affichées quand la qualité du mandant est « Représentant d'une société »
              {bien.qualiteMandant ? ` (actuellement : ${QUALITE_MANDANT_LABELS[bien.qualiteMandant] ?? bien.qualiteMandant})` : " (non renseignée)"}.
              Pièces « fonds de commerce » : case sur la fiche, bouton Modifier.
            </p>
          </div>

          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="label-sm">Compte rendu vendeur ({visites.length} visite{visites.length !== 1 ? "s" : ""})</span>
              <a href={`/api/documents/compte-rendu/${bien.id}`} target="_blank" className="btn-secondary text-xs">
                PDF — toutes les visites
              </a>
            </div>
            {!bien.proprietaireId ? (
              <p className="text-sm text-muted">Aucun propriétaire renseigné sur cette fiche.</p>
            ) : !derniereVisite ? (
              <p className="text-sm text-muted">Aucune visite enregistrée pour l'instant.</p>
            ) : (
              <EnvoyerCompteRendu
                bienId={bien.id}
                proprietaireId={bien.proprietaireId}
                proprietaireTelephone={proprietaire?.telephone}
                texteInitial={texteCompteRendu}
              />
            )}
          </div>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="label-sm">Feu vert de publication</span>
              <span className="text-sm font-semibold">
                {feuVert.obtenus}/{feuVert.total}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-chip overflow-hidden mb-3">
              <div
                className="h-full bg-accent"
                style={{ width: `${(feuVert.obtenus / feuVert.total) * 100}%` }}
              />
            </div>
            {feuVert.manquants.length > 0 && (
              <ul className="text-xs text-muted space-y-1">
                {feuVert.manquants.map((m) => (
                  <li key={m}>· {m}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="card p-5 space-y-3 text-sm">
            <div className="label-sm">Identification</div>
            <div className="grid grid-cols-2 gap-y-2">
              <div className="label-sm">Quartier</div>
              <div>{bien.quartierNom ?? "—"}</div>
              <div className="label-sm">Situation</div>
              <div>{bien.situation ?? "—"}</div>
              <div className="label-sm">Statut juridique</div>
              <div>{bien.statutJuridique ?? "—"}</div>
              <div className="label-sm">Origine</div>
              <div>{bien.typeOrigine ? TYPE_ORIGINE_LABELS[bien.typeOrigine] ?? bien.typeOrigine : "—"}</div>
              <div className="label-sm">Exclusivité</div>
              <div>{bien.exclusivite ? "Oui" : "Non"}</div>
              <div className="label-sm">Carte (publiée)</div>
              <div>
                {bien.latitudePubliee != null && bien.longitudePubliee != null
                  ? `${bien.latitudePubliee.toFixed(5)}, ${bien.longitudePubliee.toFixed(5)}`
                  : "— (pas de carte)"}
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-3 text-sm">
            <div className="label-sm">Surfaces / état</div>
            <div className="grid grid-cols-2 gap-y-2">
              <div className="label-sm">Surface sol</div>
              <div>{formatM2(bien.surfaceSol)}</div>
              <div className="label-sm">Surface habitable</div>
              <div>{formatM2(bien.surfaceHabitable)}</div>
              <div className="label-sm">Chambres / SDB</div>
              <div>
                {bien.chambres ?? "—"} / {bien.sallesBain ?? "—"}
              </div>
              <div className="label-sm">État</div>
              <div>{bien.etatBien ?? "—"}</div>
              {bien.licenceExploitationTouristique && (
                <>
                  <div className="label-sm">Licence touristique</div>
                  <div>Oui</div>
                </>
              )}
            </div>
          </div>

          <div className="card p-5 space-y-3 text-sm">
            <div className="label-sm">Prix</div>
            <div className="grid grid-cols-2 gap-y-2">
              <div className="label-sm">Prix affiché</div>
              <div className="font-medium">
                {bien.prixSurDemande ? "Sur demande" : formatDh(bien.prixVente)}
              </div>
              <div className="label-sm">Prix plancher</div>
              <div className="pill-interne pill inline-block w-fit">{formatDh(bien.prixPlancher)}</div>
              <div className="label-sm">Honoraires</div>
              <div>{bien.honorairesPourcentage ? `${bien.honorairesPourcentage} %` : "—"}</div>
            </div>
          </div>

          <div className="card p-5 space-y-3 text-sm border-interne">
            <div className="label-sm text-interne">Bloc interne</div>
            <div className="grid grid-cols-2 gap-y-2">
              <div className="label-sm">Coordonnées exactes</div>
              <div>
                {bien.latitudeExacte != null && bien.longitudeExacte != null
                  ? `${bien.latitudeExacte.toFixed(5)}, ${bien.longitudeExacte.toFixed(5)}`
                  : "—"}
              </div>
              <div className="label-sm">Estimation agence</div>
              <div>{formatDh(bien.estimationAgence)}</div>
              <div className="label-sm">Accès</div>
              <div>{bien.contactAcces ?? "—"}</div>
              <div className="label-sm">Clés confiées</div>
              <div>{bien.clesConfiees === null ? "—" : bien.clesConfiees ? "Oui" : "Non"}</div>
              <div className="label-sm">Commission</div>
              <div>{bien.commissionTauxOuMontant ?? "—"}</div>
              {bien.typeBien === "fonds_commerce" && (
                <>
                  <div className="label-sm">Prix du fonds</div>
                  <div className="pill-interne pill inline-block w-fit">{formatDh(bien.prixFonds)}</div>
                  <div className="label-sm">Prix des murs</div>
                  <div className="pill-interne pill inline-block w-fit">{formatDh(bien.prixMurs)}</div>
                </>
              )}
            </div>
          </div>

          {bien.typeBien === "fonds_commerce" && (
            <div className="card p-5 space-y-3 text-sm">
              <div className="label-sm">Fonds de commerce — exploitation</div>
              <div className="grid grid-cols-2 gap-y-2">
                <div className="label-sm">État d'exploitation</div>
                <div>{bien.etatExploitation ? ETAT_EXPLOITATION_LABELS[bien.etatExploitation] ?? bien.etatExploitation : "—"}</div>
                <div className="label-sm">Activité</div>
                <div>{bien.activite ?? "—"}</div>
                <div className="label-sm">Capacité</div>
                <div>{bien.capaciteValeur ? `${bien.capaciteValeur} ${bien.capaciteUnite ?? ""}` : "—"}</div>
                <div className="label-sm">Salariés</div>
                <div>{bien.salaries ?? "—"}</div>
                <div className="label-sm">Jours / horaires</div>
                <div>{[bien.joursOuverture, bien.horairesOuverture].filter(Boolean).join(" · ") || "—"}</div>
                <div className="label-sm">Licence alcool / terrasse</div>
                <div>
                  {bien.licenceAlcool ? "Alcool" : ""}
                  {bien.licenceAlcool && bien.droitTerrasse ? " · " : ""}
                  {bien.droitTerrasse ? "Terrasse" : ""}
                  {!bien.licenceAlcool && !bien.droitTerrasse ? "—" : ""}
                </div>
                <div className="label-sm">Équipement</div>
                <div>
                  {bien.equipement && bien.equipement.length > 0
                    ? bien.equipement.map((e) => EQUIPEMENT_LABELS[e] ?? e).join(", ")
                    : "—"}
                </div>
              </div>
              <p className="text-xs text-muted">Données financières d'exploitation : sur demande, jamais publiées.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
