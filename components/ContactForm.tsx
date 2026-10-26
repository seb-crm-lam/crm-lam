import { createContact, updateContact } from "@/lib/actions";
import { listContacts, listQuartiers, getRecherchesForContact } from "@/lib/repo";
import { APPORT_CATEGORIE_LABELS, ETAT_RECHERCHE_LABELS, TYPE_APPORTEUR_LABELS, TYPE_BIEN_LABELS } from "@/lib/format";
import type { Contact } from "@/lib/types";

// Liste validée par Seb le 8 septembre (CRM_LAM_champs_bien_et_contact.md §10).
const STATUT_OPTIONS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "en_recherche", label: "En recherche" },
  { value: "en_cours", label: "En cours" },
  { value: "abouti", label: "Abouti" },
  { value: "inactif", label: "Inactif" },
];

const STATUT_RECHERCHE_OPTIONS = [
  { value: "actif", label: "Actif" },
  { value: "satisfait", label: "Satisfait" },
  { value: "abandonne", label: "Abandonné" },
];

export default function ContactForm({ contact }: { contact?: Contact }) {
  const action = contact ? updateContact.bind(null, contact.id) : createContact;
  // Grille « Recherche » (26 octobre 2026) : la fiche porte la recherche la
  // plus récente du contact.
  const recherche = contact ? getRecherchesForContact(contact.id)[0] : undefined;
  const quartiers = listQuartiers();
  const trierNom = (a: { nom: string }, b: { nom: string }) => a.nom.localeCompare(b.nom, "fr");
  const racines = quartiers.filter((q) => !q.quartierParentId).sort(trierNom);
  const enfants = (id: string) => quartiers.filter((q) => q.quartierParentId === id).sort(trierNom);
  const quartiersCoches = new Set(recherche?.quartierIds ?? []);
  // Menus « Présenté par » / « Apporté par » : les autres fiches contact.
  const autresContacts = listContacts()
    .filter((c) => c.id !== contact?.id && !c.anonymise)
    .map((c) => ({ id: c.id, nom: c.prenom ? `${c.prenom} ${c.nom}` : c.nom }))
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  return (
    <form action={action} className="space-y-6">
      <div className="card p-5 space-y-4">
        <div className="label-sm">Identité</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Nom" required>
            <input name="nom" defaultValue={contact?.nom} required className="input" />
          </Champ>
          <Champ label="Prénom">
            <input name="prenom" defaultValue={contact?.prenom ?? ""} className="input" />
          </Champ>
          <Champ label="Téléphone" required>
            <input
              type="tel"
              name="telephone"
              defaultValue={contact?.telephone ?? ""}
              required
              className="input"
            />
          </Champ>
          <Champ label="Email">
            <input type="email" name="email" defaultValue={contact?.email ?? ""} className="input" />
          </Champ>
          <Champ label="Vouvoiement / tutoiement">
            <select name="formeAdresse" defaultValue={contact?.formeAdresse ?? "vous"} className="input">
              <option value="vous">Vous</option>
              <option value="tu">Tu</option>
            </select>
          </Champ>
          <Champ label="CIN / Passeport">
            <input name="cinPasseport" defaultValue={contact?.cinPasseport ?? ""} className="input" />
          </Champ>
          <Champ label="Statut">
            <select name="statut" defaultValue={contact?.statut ?? "nouveau"} className="input">
              {STATUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <Champ label="Adresse postale">
          <input name="adressePostale" defaultValue={contact?.adressePostale ?? ""} className="input" />
        </Champ>
        <Champ label="Agit pour le compte de">
          <input
            name="agitPourLeCompteDe"
            defaultValue={contact?.agitPourLeCompteDe ?? ""}
            className="input"
          />
        </Champ>
      </div>


      {/* 26 octobre 2026 — grille « Recherche », emplacement A : un bloc dans la
          fiche contact. Tous les champs sont facultatifs ; rien n'est créé tant
          qu'aucun critère n'est saisi. Elle alimente le rapprochement. */}
      <div className="card p-5 space-y-4">
        <div className="label-sm">Recherche</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Type de bien">
            <select name="rechTypeBien" defaultValue={recherche?.typeBien ?? ""} className="input">
              <option value="">— non précisé —</option>
              {Object.entries(TYPE_BIEN_LABELS).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="État du bien">
            <select name="rechEtat" defaultValue={recherche?.etatBienRecherche ?? ""} className="input">
              <option value="">— non précisé —</option>
              {Object.entries(ETAT_RECHERCHE_LABELS).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Surface minimum (m²)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              name="rechSurfaceMin"
              defaultValue={recherche?.surfaceSolMin ?? ""}
              className="input"
            />
          </Champ>
          <Champ label="Surface maximum (m²)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              name="rechSurfaceMax"
              defaultValue={recherche?.surfaceSolMax ?? ""}
              className="input"
            />
          </Champ>
          <Champ label="Budget maximum (DH)">
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              name="rechBudgetMax"
              defaultValue={recherche?.budgetMax ?? ""}
              className="input"
            />
          </Champ>
          <Champ label="Statut de la recherche">
            <select name="rechStatut" defaultValue={recherche?.statut ?? "actif"} className="input">
              {STATUT_RECHERCHE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <div className="block text-sm">
          <span className="label-sm block mb-1">Quartiers (plusieurs possibles)</span>
          <div className="input max-h-56 overflow-y-auto space-y-1 py-2">
            {racines.map((r) => (
              <div key={r.id}>
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    name="rechQuartierIds"
                    value={r.id}
                    defaultChecked={quartiersCoches.has(r.id)}
                    className="rounded border-border"
                  />
                  {r.nom}
                </label>
                {enfants(r.id).map((q) => (
                  <label key={q.id} className="flex items-center gap-2 pl-6">
                    <input
                      type="checkbox"
                      name="rechQuartierIds"
                      value={q.id}
                      defaultChecked={quartiersCoches.has(q.id)}
                      className="rounded border-border"
                    />
                    {q.nom}
                  </label>
                ))}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted mt-1">
            Aucun quartier coché = tous les quartiers. Cocher un quartier inclut ses sous-quartiers.
          </p>
        </div>
        <Champ label="Message du prospect">
          <textarea name="rechMessage" defaultValue={recherche?.messageProspect ?? ""} rows={3} className="input" />
        </Champ>
        <Champ label="Critères libres">
          <textarea name="rechCriteres" defaultValue={recherche?.criteresLibres ?? ""} rows={3} className="input" />
        </Champ>
      </div>

      {/* 16 octobre 2026 — qualification des apporteurs d'affaires. Tous ces
          champs sont facultatifs ; « Présenté par » = le contact qui a présenté
          cet apporteur, « Apporté par » = l'apporteur qui a amené ce contact
          comme client. */}
      <div className="card p-5 space-y-4">
        <div className="label-sm">Apporteur</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Type d'apporteur">
            <select name="typeApporteur" defaultValue={contact?.typeApporteur ?? ""} className="input">
              <option value="">— aucun —</option>
              {Object.entries(TYPE_APPORTEUR_LABELS).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Ce qu'il apporte">
            <select name="apportCategorie" defaultValue={contact?.apportCategorie ?? ""} className="input">
              <option value="">—</option>
              {Object.entries(APPORT_CATEGORIE_LABELS).map(([valeur, libelle]) => (
                <option key={valeur} value={valeur}>
                  {libelle}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Présenté par (fiche contact)">
            <select name="presenteParId" defaultValue={contact?.presenteParId ?? ""} className="input">
              <option value="">—</option>
              {autresContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Apporté par (fiche contact)">
            <select name="apporteParId" defaultValue={contact?.apporteParId ?? ""} className="input">
              <option value="">—</option>
              {autresContacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom}
                </option>
              ))}
            </select>
          </Champ>
        </div>
        <Champ label="Note sur la présentation">
          <textarea
            name="notePresentation"
            defaultValue={contact?.notePresentation ?? ""}
            rows={3}
            className="input"
          />
        </Champ>
        <p className="text-xs text-muted">
          « Présenté par » : le contact qui vous a présenté cet apporteur. « Apporté par » : l'apporteur qui vous a
          amené ce contact comme client.
        </p>
      </div>

      {/* Décision 1A du 25 septembre : deux accords distincts, chacun avec sa
          date et le texte exact accepté (repris tel quel du formulaire du site). */}
      <div className="card p-5 space-y-4">
        <div className="label-sm">Accord de réponse</div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="accordReponse"
            defaultChecked={contact?.accordReponse}
            className="rounded border-border"
          />
          Accepte qu'on réponde à sa demande et qu'on lui propose des biens correspondant à sa recherche
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Date de l'accord">
            <input
              type="date"
              name="dateAccordReponse"
              defaultValue={contact?.dateAccordReponse?.slice(0, 10) ?? ""}
              className="input"
            />
          </Champ>
          <Champ label="Texte accepté">
            <input name="texteAccordReponse" defaultValue={contact?.texteAccordReponse ?? ""} className="input" />
          </Champ>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div className="label-sm">Accord de prospection</div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="consentementProspection"
            defaultChecked={contact?.consentementProspection}
            className="rounded border-border"
          />
          Accepte de recevoir les nouveaux biens et actualités (WhatsApp ou e-mail)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Champ label="Date de l'accord">
            <input
              type="date"
              name="dateConsentement"
              defaultValue={contact?.dateConsentement?.slice(0, 10) ?? ""}
              className="input"
            />
          </Champ>
          <Champ label="Origine">
            <input
              name="origineConsentement"
              defaultValue={contact?.origineConsentement ?? ""}
              className="input"
            />
          </Champ>
        </div>
        <Champ label="Texte accepté">
          <input name="texteConsentement" defaultValue={contact?.texteConsentement ?? ""} className="input" />
        </Champ>
      </div>

      <div className="flex justify-end gap-2">
        <button type="submit" className="btn-primary">
          {contact ? "Enregistrer" : "Créer le contact"}
        </button>
      </div>
    </form>
  );
}

function Champ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="label-sm block mb-1">
        {label}
        {required && " *"}
      </span>
      {children}
    </label>
  );
}
