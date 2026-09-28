"use client";

import { useFormState, useFormStatus } from "react-dom";
import { seConnecter, type EtatFormulaire } from "@/lib/auth/actions";

function Bouton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Vérification…" : "Se connecter"}
    </button>
  );
}

export default function FormulaireConnexion({ suite }: { suite: string }) {
  const [etat, action] = useFormState<EtatFormulaire, FormData>(seConnecter, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="suite" value={suite} />
      <label className="block space-y-1">
        <span className="label-sm">E-mail</span>
        <input type="email" name="email" required autoComplete="username" className="input" />
      </label>
      <label className="block space-y-1">
        <span className="label-sm">Mot de passe</span>
        <input type="password" name="motDePasse" required autoComplete="current-password" className="input" />
      </label>
      <label className="block space-y-1">
        <span className="label-sm">Code à 6 chiffres (application de codes)</span>
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
