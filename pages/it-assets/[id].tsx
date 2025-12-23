import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return { props: {} };
};

function ITAssetDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [asset, setAsset] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const [incidentTitle, setIncidentTitle] = useState("");
  const [incidentDescription, setIncidentDescription] = useState("");
  const [incidentType, setIncidentType] = useState("Hardware");
  const [incidentSeverity, setIncidentSeverity] = useState("Low");
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [incidentError, setIncidentError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/it/assets/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setAsset(data);
        setLoading(false);
      })
      .catch(() => {
        setAsset(null);
        setLoading(false);
      });
  }, [id]);

  const refresh = () => {
    if (!id) return;
    fetch(`/api/it/assets/${id}`)
      .then((r) => r.json())
      .then(setAsset)
      .catch(() => setAsset(null));
  };

  const createIncident = async () => {
    if (!id || !incidentTitle.trim()) return;

    setCreatingIncident(true);
    setIncidentError(null);
    try {
      const res = await fetch("/api/it-incidents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: Number(id),
          title: incidentTitle,
          description: incidentDescription,
          category: incidentType.toUpperCase(),
          severity: incidentSeverity.toUpperCase(),
          assignedToUserId: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create incident");
      }
      setIncidentTitle("");
      setIncidentDescription("");
      refresh();
    } catch (e: any) {
      setIncidentError(e.message || "Failed to create incident");
    } finally {
      setCreatingIncident(false);
    }
  };

  const updateIncidentStatus = async (incidentId: number, status: string) => {
    await fetch("/api/it-incidents/update-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: incidentId, status }),
    });
    refresh();
  };

  if (loading) {
    return (
      <div className="p-6">
        <Alert variant="info" message="Loading asset…" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="p-6 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/it-assets")}
        >
          ← Back to IT Assets
        </Button>
        <Alert variant="error" message="Asset not found." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="-ml-1"
        >
          ← Back
        </Button>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Asset ID:</span>
          <span className="font-mono">{asset.id}</span>
        </div>
      </div>

      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <span>{asset.tag}</span>
            <span className="text-gray-500 text-base">({asset.type})</span>
          </h1>
          <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
            <span>Status:</span>
            <Badge
              variant="neutral"
              value={String(asset.status || "UNKNOWN")}
              className="text-[11px]"
            />
            <span className="mx-1">•</span>
            <span>
              Assigned to:{" "}
              <span className="font-semibold">
                {asset.assignedToUser?.fullName || "Unassigned"}
              </span>
            </span>
            <span className="mx-1">•</span>
            <span>
              Venture:{" "}
              <span className="font-semibold">{asset.venture?.name || "-"}</span>
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold mb-2 text-gray-800">Hardware</h2>
          <p>Make: {asset.make || "-"}</p>
          <p>Model: {asset.model || "-"}</p>
          <p>Serial: {asset.serialNumber || "-"}</p>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold mb-2 text-gray-800">Lifecycle</h2>
          <p>
            Purchase Date:{" "}
            {asset.purchaseDate
              ? new Date(asset.purchaseDate).toLocaleDateString()
              : "-"}
          </p>
          <p>
            Warranty Expiry:{" "}
            {asset.warrantyExpiry
              ? new Date(asset.warrantyExpiry).toLocaleDateString()
              : "-"}
          </p>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold mb-2 text-gray-800">Notes</h2>
          <p className="text-gray-700 whitespace-pre-wrap">
            {asset.notes || "No notes."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-4 bg-white space-y-3">
          <h2 className="font-semibold text-gray-800">
            Log Incident for this Asset
          </h2>

          {incidentError && <Alert variant="error" message={incidentError} />}

          <div className="space-y-2 text-sm">
            <div>
              <label className="block text-gray-700 mb-1 text-sm">Title</label>
              <input
                value={incidentTitle}
                onChange={(e) => setIncidentTitle(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
                placeholder="Example: Screen flickering, battery not charging"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-1 text-sm">Description</label>
              <textarea
                value={incidentDescription}
                onChange={(e) => setIncidentDescription(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
                rows={4}
                placeholder="Describe what happened, when it started, steps to reproduce..."
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-gray-700 mb-1 text-sm">Type</label>
                <Select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value)}
                  className="w-full text-sm"
                >
                  <option>Hardware</option>
                  <option>Software</option>
                  <option>Network</option>
                  <option>Security</option>
                  <option>Other</option>
                </Select>
              </div>
              <div className="flex-1">
                <label className="block text-gray-700 mb-1 text-sm">Severity</label>
                <Select
                  value={incidentSeverity}
                  onChange={(e) => setIncidentSeverity(e.target.value)}
                  className="w-full text-sm"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </Select>
              </div>
            </div>

            <Button
              onClick={createIncident}
              disabled={creatingIncident || !incidentTitle.trim()}
              size="sm"
              className="mt-2"
            >
              {creatingIncident ? "Saving..." : "Create Incident"}
            </Button>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold text-gray-800 mb-2">
            Incidents ({asset.incidents?.length || 0})
          </h2>

          <div className="space-y-2 text-sm max-h-80 overflow-auto">
            {asset.incidents?.map((inc: any) => (
              <div
                key={inc.id}
                className="border rounded p-2 flex flex-col gap-1 bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="font-semibold text-sm">{inc.title}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(inc.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-xs text-gray-500 flex flex-wrap gap-1 items-center">
                  <span>{inc.type}</span>
                  <span className="mx-1">•</span>
                  <span>Severity: {inc.severity}</span>
                  <span className="mx-1">•</span>
                  <span>
                    Status: <span className="font-semibold">{inc.status}</span>
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Reported by: {inc.reportedBy?.name || "-"} • Assigned to:{" "}
                  {inc.assignedTo?.name || "-"}
                </div>
                <p className="text-xs text-gray-700 whitespace-pre-wrap">
                  {inc.description}
                </p>
                <div className="flex gap-2 mt-1">
                  {inc.status !== "Open" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => updateIncidentStatus(inc.id, "Open")}
                    >
                      Mark Open
                    </Button>
                  )}
                  {inc.status !== "In Progress" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => updateIncidentStatus(inc.id, "In Progress")}
                    >
                      In Progress
                    </Button>
                  )}
                  {inc.status !== "Resolved" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="text-xs px-2 py-1"
                      onClick={() => updateIncidentStatus(inc.id, "Resolved")}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {(!asset.incidents || asset.incidents.length === 0) && (
              <div className="text-gray-500 text-sm">
                No incidents logged for this asset.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

ITAssetDetailPage.title = "IT Asset Details";

export default ITAssetDetailPage;
