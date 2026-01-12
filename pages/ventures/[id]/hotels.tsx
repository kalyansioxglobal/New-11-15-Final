import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";

interface HotelProperty {
  id: number;
  name: string;
  rooms: number;
  city: string | null;
  state: string | null;
}

function AddHotelForm({ ventureId }: { ventureId: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [rooms, setRooms] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const resp = await fetch("/api/hospitality/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ventureId,
          name,
          code,
          rooms: rooms ? Number(rooms) : null,
          city,
          state,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || "Failed to create hotel");
      } else {
        setName("");
        setCode("");
        setRooms("");
        setCity("");
        setState("");
        router.replace(router.asPath);
      }
    } catch (err: any) {
      setError(err?.message || "Unexpected error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-lg p-4 bg-white shadow-sm space-y-3 mb-4"
    >
      <h3 className="text-sm font-semibold">Add Hotel Property</h3>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div>
          <label className="block text-xs font-medium mb-1">Name *</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Hotel name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Code</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Internal code"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Rooms</label>
          <input
            type="number"
            className="w-full border rounded px-2 py-1 text-sm"
            value={rooms}
            onChange={(e) => setRooms(e.target.value)}
            placeholder="120"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">City / State</label>
          <div className="flex gap-2">
            <input
              className="flex-1 border rounded px-2 py-1 text-sm"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="City"
            />
            <input
              className="w-20 border rounded px-2 py-1 text-sm"
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="GA"
            />
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="text-xs px-3 py-1.5 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-50"
      >
        {saving ? "Saving..." : "Add Hotel"}
      </button>
    </form>
  );
}

function VentureHotelsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [hotels, setHotels] = useState<HotelProperty[]>([]);
  const [ventureName, setVentureName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/ventures?id=${id}`)
      .then((r) => r.json())
      .then((d) => {
        setHotels(d.venture?.hotels || []);
        setVentureName(d.venture?.name || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <Skeleton className="w-full h-[85vh]" />;
  }

  const ventureId = id ? Number(id) : 0;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold mb-2">Hotels for {ventureName}</h1>

      <AddHotelForm ventureId={ventureId} />

      {hotels.length === 0 ? (
        <p className="text-gray-500">No hotel properties found for this venture.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotels.map((hotel) => (
            <div key={hotel.id} className="border rounded p-4 hover:shadow-md transition-shadow bg-white">
              <h3 className="font-semibold text-lg">{hotel.name}</h3>
              <p className="text-sm text-gray-500">
                {hotel.city && hotel.state ? `${hotel.city}, ${hotel.state}` : hotel.city || hotel.state || ""}
              </p>
              <p className="text-sm mt-2">
                <span className="font-medium">{hotel.rooms || 0}</span> rooms
              </p>
              <Link
                href={`/hospitality/hotels/${hotel.id}`}
                className="mt-3 inline-block text-sm text-blue-600 hover:underline"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

VentureHotelsPage.title = "Hotel Properties";

export default VentureHotelsPage;
