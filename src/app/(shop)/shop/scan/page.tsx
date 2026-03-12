import { ScanClient } from "@/components/shop/scan-client";

export default function ScanPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Scanner un retrait</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Saisissez le code de retrait du client pour confirmer la collecte
        </p>
      </div>
      <ScanClient />
    </div>
  );
}
