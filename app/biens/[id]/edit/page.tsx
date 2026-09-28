import { notFound } from "next/navigation";
import { getBien } from "@/lib/repo";
import BienForm from "@/components/BienForm";



export const dynamic = "force-dynamic";

export default function EditBienPage({ params }: { params: { id: string } }) {
  const bien = getBien(params.id);
  if (!bien) notFound();

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-6">
        Modifier {bien.reference} — {bien.titre}
      </h1>
      <BienForm bien={bien} />
    </div>
  );
}
