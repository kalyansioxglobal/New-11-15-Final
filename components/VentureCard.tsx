import Link from "next/link";

interface VentureCardProps {
  id: string;
  name: string;
  type: string;
  officesCount: number;
  health: "Healthy" | "Attention" | "Critical";
}

const healthColors = {
  Healthy: "bg-green-100 text-green-800 border-green-200",
  Attention: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Critical: "bg-red-100 text-red-800 border-red-200",
};

const typeLabels: Record<string, string> = {
  LOGISTICS: "Logistics",
  TRANSPORT: "Transport",
  HOSPITALITY: "Hospitality",
  BPO: "BPO",
  SAAS: "SaaS",
};

export default function VentureCard({
  id,
  name,
  type,
  officesCount,
  health,
}: VentureCardProps) {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{name}</h3>
        <span
          className={`px-2 py-0.5 text-xs rounded border ${healthColors[health]}`}
        >
          {health}
        </span>
      </div>
      <div className="text-sm text-gray-600 mb-3">
        <span className="inline-block bg-gray-100 px-2 py-0.5 rounded text-xs mr-2">
          {typeLabels[type] || type}
        </span>
        <span>{officesCount} office{officesCount !== 1 ? "s" : ""}</span>
      </div>
      <Link
        href={`/ventures/${id}`}
        className="text-sm text-blue-600 hover:underline"
      >
        View Details
      </Link>
    </div>
  );
}
