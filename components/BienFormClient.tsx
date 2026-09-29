"use client";

import { useState } from "react";
import type { Bien, Contact, Prestation, Quartier, TypeBien } from "@/lib/types";
import {
  TYPE_BIEN_LABELS,
  TRANSACTION_LABELS,
  DIFFUSION_LABELS,
  STATUT_COMMERCIAL_LABELS,
  QUALITE_MANDANT_LABELS,
  NATURE_VENTE_LABELS,
  ETAT_EXPLOITATION_LABELS,
  TYPE_ORIGINE_LABELS,
  EQUIPEMENT_LABELS,
  GROUPES_PRESTATION,
} from "@/lib/format";
import { blocFondsActif } from "@/lib/pieces";

interface Props {
  bien?: Bien;
  quartiers: Quartier[];
  contacts: Contact[];
  prestations: Prestation[];
  prestationsCochees: string[];
  action: (formData: FormData) => void;
}

export default function BienFormClient({ bien, quartiers, contacts, prestations, prestationsCochees, action }: Props) {
  // 27 septembre 2026 — état local du type de bien, pour n'afficher le bloc
  // fonds de commerce (et la case « Afficher le prix » inversée) que pour ce
  // type, comme le prévoit champs_bien_et_contact.md §11 : « Ces champs
  // n'apparaissent que si type_bien = fonds de commerce ». Les autres
  // sections restent statiques, comme avant.
  const [typeBien, setTypeBien] = useState<TypeBien>(bien?.typeBien ?? "riad");
  const estFondsCommerce = typeBien === "fonds_commerce";

  const cochees = new Set(prestationsCochees);
  const trier = (a: { nom: string }, b: { nom: string }) => a.nom.localeCompare(b.nom, "fr");
  const racines = quartiers.filter((q) => !q.quartierParentId).sort(trier);
  const enfants = (id: string) => quartiers.filter((q) => q.quartierParentId === id).sort(trier);

  return (
    <form action={action} className="space-y-6">
      <div className="card p-5 space-y-4">
        <div className="label-sm">Identification</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Titre" required>
            <input name="titre" defaultValue={bien?.titre} required className="input" />
          </Champ>
          <Champ label="Type de bien" required>
            <select
              name="typeBien"
              required
              value={typeBien}
              onChange={(e) => setTypeBien(e.target.value as TypeBien)}
              className="input"
            >
              {Object.entries(TYPE_BIEN_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Transaction">
            <select name="transaction" defaultValue={bien?.transaction ?? "vente"} className="input">
              {Object.entries(TRANSACTION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Quartier" required>
            <select name="quartierId" defaultValue={bien?.quartierId ?? ""} required className="input">
              <option value="" disabled>
                Choisir…
              </option>
              {racines.flatMap((r) => [
                <option key={r.id} value={r.id}>
                  {r.nom}
                </option>,
                ...enfants(r.id).map((q) => (
                  <option key={q.id} value={q.id}>
                    {"    " + q.nom}
                  </option>
                )),
              ])}
            </select>
          </Champ>
          <Champ label="Situation">
            <input name="situation" defaultValue={bien?.situation ?? ""} className="input" />
          </Champ>
          <Champ label="Statut juridique">
            <select name="statutJuridique" defaultValue={bien?.statutJuridique ?? ""} className="input">
              <option value="">—</option>
              <option value="titre_foncier">Titre foncier</option>
              <option value="melkia">Melkia</option>
              <option value="en_requisition">En réquisition</option>
            </select>
          </Champ>
        </div>
        {/* 27 septembre : description publique, facultative — se remplit à
            la publication ou plus tard, jamais bloquante, n'entre pas au
            feu vert. */}
        <Champ label="Description (publique, facultative)">
          <textarea
            name="description"
            defaultValue={bien?.description ?? ""}
            rows={4}
            className="input"
            placeholder="Peut être ajoutée maintenant ou plus tard, avant ou après publication."
          />
        </Champ>
      </div>

      <div className="card p-5 space-y-4">
        <div className="label-sm">Surfaces / état</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Surface sol (m²)">
            <input type="number" name="surfaceSol" defaultValue={bien?.surfaceSol ?? ""} className="input" />
          </Champ>
          <Champ label="Surface habitable (m²)">
            <input
              type="number"
              name="surfaceHabitable"
              defaultValue={bien?.surfaceHabitable ?? ""}
              className="input"
            />
          </Champ>
          <Champ label="Chambres">
            <input type="number" name="chambres" defaultValue={bien?.chambres ?? ""} className="input" />
          </Champ>
          <Champ label="Salles de bain">
            <input type="number" name="sallesBain" defaultValue={bien?.sallesBain ?? ""} className="input" />
          </Champ>
          <Champ label="État">
            <select name="etatBien" defaultValue={bien?.etatBien ?? ""} className="input">
              <option value="">—</option>
              <option value="a_renover">À rénover</option>
              <option value="en_exploitation">En exploitation</option>
            </select>
          </Champ>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="label-sm">Prestations</div>
        {GROUPES_PRESTATION.map((g) => (
          <div key={g.code}>
            <div className="text-xs text-muted mb-1.5">{g.label}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {prestations
                .filter((p) => p.groupe === g.code)
                .map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      name="prestations"
                      value={p.id}
                      defaultChecked={cochees.has(p.id)}
                      className="rounded border-border"
                    />
                    {p.nom}
                  </label>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card p-5 space-y-4">
        <div className="label-sm">Prix</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Prix affiché (DH)">
            <input type="number" name="prixVente" defaultValue={bien?.prixVente ?? ""} className="input" />
          </Champ>
          {/* 27 septembre : sur un fonds de commerce, la case s'inverse —
              « Afficher le prix », décochée par défaut : le prix n'apparaît
              au visiteur du site que si elle est cochée. Même donnée
              stockée (prixSurDemande), lib/actions.ts fait l'inversion. */}
          {estFondsCommerce ? (
            <Champ label="">
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  name="afficherPrix"
                  defaultChecked={bien ? !bien.prixSurDemande : false}
                  className="rounded border-border"
                />
                Afficher le prix (sinon « sur demande »)
              </label>
            </Champ>
          ) : (
            <Champ label="">
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  name="prixSurDemande"
                  defaultChecked={bien?.prixSurDemande}
                  className="rounded border-border"
                />
                Prix sur demande
              </label>
            </Champ>
          )}
          <Champ label="Prix plancher (DH, interne)">
            <input type="number" name="prixPlancher" defaultValue={bien?.prixPlancher ?? ""} className="input" />
          </Champ>
          <Champ label="Honoraires (%)">
            <input
              type="number"
              step="0.1"
              name="honorairesPourcentage"
              defaultValue={bien?.honorairesPourcentage ?? ""}
              className="input"
            />
          </Champ>
        </div>
      </div>

      {/* §11 champs_bien_et_contact.md : ces champs n'apparaissent que si
          le bien est un fonds de commerce. */}
      {estFondsCommerce && (
        <div className="card p-5 space-y-4">
          <div className="label-sm">Vente avec fonds de commerce</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Champ label="Nature de la vente">
              <select name="natureVente" defaultValue={bien?.natureVente ?? ""} className="input">
                <option value="">—</option>
                {Object.entries(NATURE_VENTE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ label="">
              <label className="flex items-center gap-2 text-sm mt-6">
                <input
                  type="checkbox"
                  name="piecesFonds"
                  defaultChecked={bien ? blocFondsActif(bien) : false}
                  className="rounded border-border"
                />
                Pièces du fonds de commerce au dossier
              </label>
            </Champ>
          </div>

          {/* Bloc d'exploitation — §11 champs_bien_et_contact.md / §6 cadrage,
              validé le 14 septembre. Aucune donnée financière : « sur
              demande », jamais un chiffre publié. */}
          <div className="border-t border-border pt-4 space-y-4">
            <div className="label-sm">Bloc d'exploitation</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Champ label="État d'exploitation">
                <select name="etatExploitation" defaultValue={bien?.etatExploitation ?? ""} className="input">
                  <option value="">—</option>
                  {Object.entries(ETAT_EXPLOITATION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Activité">
                <input
                  name="activite"
                  defaultValue={bien?.activite ?? ""}
                  className="input"
                  placeholder="Restaurant, spa, boutique…"
                />
              </Champ>
              <Champ label="Capacité">
                <input type="number" name="capaciteValeur" defaultValue={bien?.capaciteValeur ?? ""} className="input" />
              </Champ>
              <Champ label="Unité de capacité">
                <input
                  name="capaciteUnite"
                  defaultValue={bien?.capaciteUnite ?? ""}
                  className="input"
                  placeholder="Couverts, chambres, postes…"
                />
              </Champ>
              <Champ label="Salariés">
                <input type="number" name="salaries" defaultValue={bien?.salaries ?? ""} className="input" />
              </Champ>
              <Champ label="Jours d'ouverture">
                <input name="joursOuverture" defaultValue={bien?.joursOuverture ?? ""} className="input" />
              </Champ>
              <Champ label="Horaires d'ouverture">
                <input name="horairesOuverture" defaultValue={bien?.horairesOuverture ?? ""} className="input" />
              </Champ>
              <Champ label="Autorisation d'exploitation — activité autorisée">
                <input
                  name="autorisationExploitationActivite"
                  defaultValue={bien?.autorisationExploitationActivite ?? ""}
                  className="input"
                />
              </Champ>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="licenceAlcool" defaultChecked={bien?.licenceAlcool ?? false} className="rounded border-border" />
                Licence d'alcool
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="droitTerrasse" defaultChecked={bien?.droitTerrasse ?? false} className="rounded border-border" />
                Droit de terrasse
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="autorisationExploitation"
                  defaultChecked={bien?.autorisationExploitation ?? false}
                  className="rounded border-border"
                />
                Autorisation d'exploitation
              </label>
            </div>
            <div>
              <div className="text-xs text-muted mb-1.5">Équipement</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                {Object.entries(EQUIPEMENT_LABELS).map(([v, l]) => (
                  <label key={v} className="flex items-center gap-2 text-sm py-1">
                    <input
                      type="checkbox"
                      name="equipement"
                      value={v}
                      defaultChecked={bien?.equipement?.includes(v) ?? false}
                      className="rounded border-border"
                    />
                    {l}
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted">
              Données financières d'exploitation : jamais publiées, remises « sur demande » après
              engagement de confidentialité — aucun champ ici.
            </p>
          </div>

          {/* Internes, jamais envoyés au site (décision du 26 septembre). */}
          <div className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Champ label="Prix du fonds (DH, interne)">
              <input type="number" name="prixFonds" defaultValue={bien?.prixFonds ?? ""} className="input" />
            </Champ>
            <Champ label="Prix des murs (DH, interne)">
              <input type="number" name="prixMurs" defaultValue={bien?.prixMurs ?? ""} className="input" />
            </Champ>
          </div>
        </div>
      )}

      <div className="card p-5 space-y-4">
        <div className="label-sm">Suivi commercial</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Conseiller référent">
            <input name="conseillerReferent" defaultValue={bien?.conseillerReferent ?? ""} className="input" />
          </Champ>
          <Champ label="Origine">
            {/* Liste fermée — « RDS » retiré le 26 septembre (sujet clos). */}
            <select name="typeOrigine" defaultValue={bien?.typeOrigine ?? ""} className="input">
              <option value="">—</option>
              {Object.entries(TYPE_ORIGINE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Propriétaire">
            <select name="proprietaireId" defaultValue={bien?.proprietaireId ?? ""} className="input">
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                </option>
              ))}
            </select>
          </Champ>
          {/* Mandat V3.1, art. 1 — ajouté le 25 septembre (décision 3C/A) : déclenche
              le bloc de pièces « société » et coche la case du mandat PDF. */}
          <Champ label="Qualité du mandant">
            <select name="qualiteMandant" defaultValue={bien?.qualiteMandant ?? ""} className="input">
              <option value="">—</option>
              {Object.entries(QUALITE_MANDANT_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Apporteur">
            <select name="apporteurId" defaultValue={bien?.apporteurId ?? ""} className="input">
              <option value="">—</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Liste validée (A17, 18 septembre) : une seule mention à la fois. */}
          <Champ label="Mention éditoriale">
            <select name="mentionEditoriale" defaultValue={bien?.mentionEditoriale ?? ""} className="input">
              <option value="">Aucune</option>
              <option value="coup_de_coeur">Coup de cœur</option>
              <option value="rare">Rare</option>
            </select>
          </Champ>
          {/* Fait vérifiable, cumulable avec la mention éditoriale (§5 cadrage). */}
          <Champ label="">
            <label className="flex items-center gap-2 text-sm mt-6">
              <input
                type="checkbox"
                name="exclusivite"
                defaultChecked={bien?.exclusivite ?? false}
                className="rounded border-border"
              />
              Exclusivité
            </label>
          </Champ>
        </div>
        <Champ label="Commentaire (notes libres)">
          <textarea name="notesInternes" defaultValue={bien?.notesInternes ?? ""} rows={3} className="input" />
        </Champ>
      </div>

      <div className="card p-5 space-y-4">
        <div className="label-sm">Diffusion</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="État de diffusion">
            <select name="diffusionEtat" defaultValue={bien?.diffusionEtat ?? "brouillon"} className="input">
              {Object.entries(DIFFUSION_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Statut commercial">
            <select name="statutCommercial" defaultValue={bien?.statutCommercial ?? "disponible"} className="input">
              {Object.entries(STATUT_COMMERCIAL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </Champ>
        </div>
      </div>

      <div className="card p-5 space-y-4 border-interne">
        <div className="label-sm text-interne">Bloc interne</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 26 septembre : coordonnées exactes, restreintes, jamais envoyées.
              Les coordonnées publiées (décalage 0-300 m) sont calculées
              automatiquement à l'enregistrement, tirées une seule fois. */}
          <div className="sm:col-span-2">
            <Champ label="Adresse exacte (rue, derb, numéro) — écrite sur le mandat, jamais publiée">
              <input name="adresseExacte" defaultValue={bien?.adresseExacte ?? ""} className="input" />
            </Champ>
          </div>
          <Champ label="Latitude exacte">
            <input type="number" step="any" name="latitudeExacte" defaultValue={bien?.latitudeExacte ?? ""} className="input" />
          </Champ>
          <Champ label="Longitude exacte">
            <input type="number" step="any" name="longitudeExacte" defaultValue={bien?.longitudeExacte ?? ""} className="input" />
          </Champ>
          {bien?.latitudePubliee != null && (
            <p className="text-xs text-muted sm:col-span-2">
              Coordonnées publiées (carte) : {bien.latitudePubliee.toFixed(5)}, {bien.longitudePubliee?.toFixed(5)}
              {" — "}conservées ; un nouveau tirage n'a lieu que si les coordonnées exactes changent.
            </p>
          )}
          <Champ label="Estimation agence (DH)">
            <input type="number" name="estimationAgence" defaultValue={bien?.estimationAgence ?? ""} className="input" />
          </Champ>
          <Champ label="Accès">
            <input name="contactAcces" defaultValue={bien?.contactAcces ?? ""} className="input" />
          </Champ>
          <Champ label="">
            <label className="flex items-center gap-2 text-sm mt-6">
              <input
                type="checkbox"
                name="clesConfiees"
                defaultChecked={bien?.clesConfiees ?? false}
                className="rounded border-border"
              />
              Clés confiées
            </label>
          </Champ>
          <Champ label="Commission (taux ou montant)">
            <input name="commissionTauxOuMontant" defaultValue={bien?.commissionTauxOuMontant ?? ""} className="input" />
          </Champ>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary">
          {bien ? "Enregistrer" : "Créer le bien"}
        </button>
      </div>
    </form>
  );
}

function Champ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      {label && (
        <span className="label-sm block mb-1">
          {label}
          {required && " *"}
        </span>
      )}
      {children}
    </label>
  );
}
