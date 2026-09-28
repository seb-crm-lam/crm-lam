import Link from "next/link";
import { listContactsAvecRechercheActive } from "@/lib/repo";
import ContactsTable from "@/components/ContactsTable";


// Données lues à chaque affichage (sinon la page serait figée au moment de la construction).
export const dynamic = "force-dynamic";

export default function ContactsPage() {
  const contacts = listContactsAvecRechercheActive();
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold">Contacts</h1>
        <div className="flex gap-2">
          <a href="/api/export/contacts" className="btn-secondary">
            Exporter en CSV
          </a>
          <Link href="/contacts/nouveau" className="btn-primary">
            Nouveau contact
          </Link>
        </div>
      </div>
      <ContactsTable contacts={contacts} />
    </div>
  );
}
