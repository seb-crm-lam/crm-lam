import { createContact, updateContact } from "@/lib/actions";
import type { Contact } from "@/lib/types";

// Liste validée par Seb le 8 septembre (CRM_LAM_champs_bien_et_contact.md §10).
const STATUT_OPTIONS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "en_recherche", label: "En recherche" },
  { value: "en_cours", label: "En cours" },
  { value: "abouti", label: "Abouti" },
  { value: "inactif", label: "Inactif" },
];

export default function ContactForm({ contact }: { contact?: Contact }) {
  const action = contact ? updateContact.bind(null, contact.id) : createContact;

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
