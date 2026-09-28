import Link from "next/link";
import FormulaireConnexion from "@/components/auth/FormulaireConnexion";
import { compteExiste } from "@/lib/auth/utilisateur";
import { secretSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default function PageConnexion({ searchParams }: { searchParams: { suite?: string } }) {
  const configurationOk = !!secretSession();
  const aCompte = configurationOk && compteExiste();

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 space-y-6">
        <div>
          <div className="text-lg font-semibold tracking-tight">L'Adresse Marrakchie</div>
          <div className="label-sm">CRM interne — connexion</div>
        </div>

        {!configurationOk ? (
          <p className="text-sm">
            Configuration incomplète : la variable <code>LAM_SESSION_SECRET</code> manque dans Railway (au moins 32
            caractères). Le CRM reste fermé tant qu'elle n'est pas en place.
          </p>
        ) : !aCompte ? (
          <p className="text-sm">
            Aucun compte n'existe encore.{" "}
            <Link href="/installation" className="text-accent underline">
              Créer le compte
            </Link>
          </p>
        ) : (
          <FormulaireConnexion suite={searchParams.suite ?? "/journee"} />
        )}
      </div>
    </div>
  );
}
