import BienForm from "@/components/BienForm";


// Données lues à chaque affichage (sinon la page serait figée au moment de la construction).
export const dynamic = "force-dynamic";

export default function NouveauBienPage() {
  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Nouveau bien</h1>
      <BienForm />
    </div>
  );
}
