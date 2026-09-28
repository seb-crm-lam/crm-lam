import ContactForm from "@/components/ContactForm";


// Données lues à chaque affichage (sinon la page serait figée au moment de la construction).
export const dynamic = "force-dynamic";

export default function NouveauContactPage() {
  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">Nouveau contact</h1>
      <ContactForm />
    </div>
  );
}
