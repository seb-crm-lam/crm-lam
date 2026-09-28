import Link from "next/link";
import { listBiens } from "@/lib/repo";
import BiensTable from "@/components/BiensTable";


// Données lues à chaque affichage (sinon la page serait figée au moment de la construction).
export const dynamic = "force-dynamic";

export default function BiensPage() {
  const biens = listBiens();
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold">Biens</h1>
        <div className="flex gap-2">
          <a href="/api/export/biens" className="btn-secondary">
            Exporter en CSV
          </a>
          <Link href="/biens/nouveau" className="btn-primary">
            Nouveau bien
          </Link>
        </div>
      </div>
      <BiensTable biens={biens} />
    </div>
  );
}
