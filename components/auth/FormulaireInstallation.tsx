"use client";

import { useFormState, useFormStatus } from "react-dom";
import { installer, type EtatFormulaire } from "@/lib/auth/actions";

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Création…" : "Créer le compte"}
    </button>
  );
}

export default function FormulaireInstallation({ totpSecret, qrCode }: { totpSecret: string; qrCode: string }) {
  const [etat, action] = useFormState<EtatFormulaire, FormData>(installer, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="totpSecret" value={totpSecret} />

      <label className="block space-y-1">
        <span className="label-sm">1. Code d'installation (celui rangé dans Railway)</span>
        <input name="codeInstallation" required autoComplete="off" className="input" />
      </label>

      <label className="block space-y-1">
        <span className="label-sm">2. Votre e-mail</span>
        <input type="email" name="email" required autoComplete="username" className="input" />
      </label>

      <label className="block space-y-1">
        <span className="label-sm">3. Mot de passe (12 caractères minimum)</span>
        <input type="password" name="motDePasse" required minLength={12} autoComplete="new-password" className="input" />
      </label>
      <label className="block space-y-1">
        <span className="label-sm">Mot de passe, une seconde fois</span>
        <input type="password" name="confirmation" required minLength={12} autoComplete="new-password" className="input" />
      </label>

      <div className="space-y-2">
        <div className="label-sm">4. Scannez ce QR code avec l'appareil photo de l'iPhone ou l'application de codes</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrCode} alt="QR code du code de vérification" className="mx-auto h-48 w-48" />
        <div className="label-sm">Ou saisissez cette clé à la main :</div>
        <div className="rounded-lg bg-chip px-3 py-2 font-mono text-sm break-all select-all">{totpSecret}</div>
      </div>

      <label className="block space-y-1">
        <span className="label-sm">5. Code à 6 chiffres affiché par l'application</span>
        <input
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          className="input tracking-widest"
        />
      </label>

      {etat.erreur && <p className="text-sm text-red">{etat.erreur}</p>}
      <Bouton />
    </form>
  );
}
