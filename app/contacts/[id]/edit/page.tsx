import { notFound } from "next/navigation";
import { getContact } from "@/lib/repo";
import ContactForm from "@/components/ContactForm";

export default function EditContactPage({ params }: { params: { id: string } }) {
  const contact = getContact(params.id);
  if (!contact) notFound();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">
        Modifier {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
      </h1>
      <ContactForm contact={contact} />
    </div>
  );
}
