import Link from "next/link";
import QRCode from "qrcode";
import FormulaireInstallation from "@/components/auth/FormulaireInstallation";
import { compteExiste } from "@/lib/auth/utilisateur";
import { genererSecretTotp, lienOtpauth } from "@/lib/auth/totp";

export const dynamic = "force-dynamic";

// Création du compte unique, une seule fois. Fermée dès que le compte existe.
export default async function PageInstallation() {
  const cadre = (contenu: React.ReactNode) => (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm p-6 space-y-6">
        <div>
          <div className="text-lg font-semibold tracking-tight">L'Adresse Marrakchie</div>
          <div className="label-sm">CRM interne — création du compte</div>
        </div>
        {contenu}
      </div>
    </div>
  );

  if (compteExiste()) {
    return cadre(
      <p className="text-sm">
        Le compte existe déjà : l'installation est fermée.{" "}
        <Link href="/connexion" className="text-accent underline">
          Se connecter
        </Link>
      </p>,
    );
  }
  if (!process.env.LAM_SETUP_CODE?.trim()) {
    return cadre(
      <p className="text-sm">
        Configuration incomplète : la variable <code>LAM_SETUP_CODE</code> manque dans Railway.
      </p>,
    );
  }

  const totpSecret = genererSecretTotp();
  // L'e-mail n'est pas encore connu : le libellé dans l'application sera « CRM LAM ».
  const qrCode = await QRCode.toDataURL(lienOtpauth(totpSecret, "Seb"), { margin: 1, width: 384 });
  return cadre(<FormulaireInstallation totpSecret={totpSecret} qrCode={qrCode} />);
}
