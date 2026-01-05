import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { GetServerSideProps } from "next";
import { Select } from "@/components/ui/Select";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

type Venture = { id: number; name: string; type: string };
type Office = { id: number; name: string; ventureId: number };

function NewITAssetPage() {
  const router = useRouter();
  const [ventures, setVentures] = useState<Venture[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initialFormData = {
    tag: '',
    type: '',
    make: '',
    model: '',
    serialNumber: '',
    status: 'AVAILABLE',
    purchaseDate: '',
    warrantyExpiry: '',
    notes: '',
    ventureId: '',
    officeId: '',
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [vRes, oRes] = await Promise.all([
          fetch('/api/ventures'),
          fetch('/api/offices'),
        ]);
        if (!vRes.ok || !oRes.ok) return;
        const [vJson, oJson] = await Promise.all([vRes.json(), oRes.json()]);
        if (!cancelled) {
          setVentures(vJson);
          setOffices(oJson);
        }
      } catch (e) {
        // ignore
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredOffices = offices.filter(
    (o) => !formData.ventureId || o.ventureId === Number(formData.ventureId)
  );

  const ASSET_TYPES = [
    "LAPTOP",
    "DESKTOP",
    "MONITOR",
    "PHONE",
    "ROUTER",
    "SERVER",
    "LICENSE",
    "OTHER",
  ];

  const registerNewAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/it-assets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: formData.tag,
          type: formData.type,
          make: formData.make || null,
          model: formData.model || null,
          serialNumber: formData.serialNumber || null,
          status: formData.status || 'AVAILABLE',
          purchaseDate: formData.purchaseDate || null,
          warrantyExpiry: formData.warrantyExpiry || null,
          notes: formData.notes || null,
          ventureId: formData.ventureId,
          officeId: formData.officeId || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        // Handle different error types with proper messages
        let errorMessage = "Failed to create asset";
        if (data.error === "VALIDATION_ERROR") {
          errorMessage = data.detail || "Validation error: Please check your input";
        } else if (data.error === "FORBIDDEN_VENTURE") {
          errorMessage = "You don't have permission to create assets for this venture";
        } else if (data.error === "FORBIDDEN_OFFICE") {
          errorMessage = "You don't have permission to create assets for this office";
        } else if (data.error === "UNAUTHENTICATED") {
          errorMessage = "You are not authenticated. Please log in and try again";
        } else if (data.detail) {
          errorMessage = data.detail;
        } else if (data.error) {
          errorMessage = data.error;
        }

        throw new Error(errorMessage);
      }

      const data = await res.json();

      // Clear form and show success message
      setFormData(initialFormData);
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (e: any) {
      setError(e.message || "Failed to create asset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/it?tab=assets")}
          className="-ml-1"
        >
          ← Back to IT Assets
        </Button>
      </div>

      <div className=" max-w-2xl">
        <h1 className="text-xl font-semibold mb-4">Register New IT Asset</h1>

        {error && <Alert variant="error" message={error} className="mb-4" />}
        {success && <Alert variant="success" message="IT Asset created successfully!" className="mb-4" />}

        <form onSubmit={registerNewAsset} className="space-y-4 text-sm bg-white p-4 rounded border">
          <div>
            <label className="block text-xs mb-1 text-gray-500">Tag *</label>
            <input
              name="tag"
              value={formData.tag}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
              required
            />
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-500">Type *</label>
            <Select
              value={formData.type}
              onChange={(e) => {
                setFormData((prev) => ({ ...prev, type: e.target.value }));
              }}
              className="w-full"
              required
            >
              <option value="">Select type</option>
              {ASSET_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>


          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1 text-gray-500">Asset name</label>
              <input
                name="make"
                value={formData.make}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1 text-gray-500">Model</label>
              <input
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-500">Serial Number</label>
            <input
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1 text-gray-500">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="ASSIGNED">ASSIGNED</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="RETIRED">RETIRED</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1 text-gray-500">Venture *</label>
              <select
                name="ventureId"
                value={formData.ventureId}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
                required
              >
                <option value="">Select venture...</option>
                {ventures.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-500">Office</label>
            <select
              name="officeId"
              value={formData.officeId}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
            >
              <option value="">Select office...</option>
              {filteredOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs mb-1 text-gray-500">Purchase Date</label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs mb-1 text-gray-500">Warranty Expiry</label>
              <input
                type="date"
                name="warrantyExpiry"
                value={formData.warrantyExpiry}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1 text-gray-500">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded bg-gray-50 border border-gray-300 min-h-[80px]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => router.push('/it?tab=assets')}
              className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white font-medium disabled:opacity-60"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
NewITAssetPage.title = "Register IT Asset";
export default NewITAssetPage;

