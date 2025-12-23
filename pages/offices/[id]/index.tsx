import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

interface Office {
  id: number;
  name: string;
  city?: string | null;
  state?: string | null;
  venture: {
    id: number;
    name: string;
    type: string;
  };
  tasks: any[];
  policies: any[];
}

function OfficeDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [office, setOffice] = useState<Office | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/offices/${id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || `Error ${res.status}`);
          return;
        }
        const json = await res.json();
        setOffice(json.office);
      } catch (err: any) {
        setError(err.message || 'Failed to load office');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading office...</div>;
  }

  if (error || !office) {
    return (
      <div className="p-4">
        <p className="text-sm text-red-600">
          {error || "Office not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <Link
          href={`/ventures/${office.venture.id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          &larr; Back to {office.venture.name}
        </Link>
        <h1 className="text-2xl font-bold mt-1">{office.name}</h1>
        <p className="text-sm text-gray-500">
          Venture: {office.venture.name} ({office.venture.type})
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Location: {office.city || "Unknown"}
          {office.state ? `, ${office.state}` : ""}
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Tasks for this office</h2>
          <Link
            href={`/tasks?officeId=${office.id}`}
            className="text-xs text-blue-600 hover:underline"
          >
            View in Tasks
          </Link>
        </div>
        {office.tasks.length === 0 ? (
          <p className="text-xs text-gray-500">No tasks yet.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {office.tasks.map((t) => (
              <li key={t.id} className="flex justify-between">
                <span>
                  {t.title}{" "}
                  {t.dueDate && (
                    <span className="text-gray-400">
                      (due {new Date(t.dueDate).toLocaleDateString()})
                    </span>
                  )}
                </span>
                <span className="ml-2 uppercase text-[10px] text-gray-600">
                  {t.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border rounded-lg p-4 bg-white shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold">Policies for this office</h2>
          <Link
            href={`/admin/policies?officeId=${office.id}`}
            className="text-xs text-blue-600 hover:underline"
          >
            Manage Policies
          </Link>
        </div>
        {office.policies.length === 0 ? (
          <p className="text-xs text-gray-500">No policies yet.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {office.policies.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>
                  {p.name}{" "}
                  {p.endDate && (
                    <span className="text-gray-400">
                      (ends {new Date(p.endDate).toLocaleDateString()})
                    </span>
                  )}
                </span>
                <span className="ml-2 uppercase text-[10px] text-gray-600">
                  {p.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

OfficeDetailPage.title = "Office Details";

export default OfficeDetailPage;
