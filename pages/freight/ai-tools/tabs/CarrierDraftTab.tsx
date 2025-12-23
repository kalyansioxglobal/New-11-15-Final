import React, { useEffect, useState } from "react";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";

interface CarrierOption {
  id: number;
  name: string;
  mcNumber: string | null;
  code: string | null;
}

interface DispatcherOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

export default function CarrierDraftTab() {
  const [carrierName, setCarrierName] = useState("");
  const [carrierId, setCarrierId] = useState<number | null>(null);
  const [carrierSearchResults, setCarrierSearchResults] = useState<CarrierOption[]>([]);
  const [carrierSearchOpen, setCarrierSearchOpen] = useState(false);

  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [pickupDate, setPickupDate] = useState("");
  const [weight, setWeight] = useState("");
  const [equipment, setEquipment] = useState("");
  const [commodity, setCommodity] = useState("");
  const [contextNotes, setContextNotes] = useState("");
  const [draftType, setDraftType] = useState<"inquiry" | "coverage_request" | "relationship">("inquiry");
  const [contactRole, setContactRole] = useState<"carrier_owner" | "dispatcher">("carrier_owner");

  const [dispatcherId, setDispatcherId] = useState<string | null>(null);
  const [dispatchers, setDispatchers] = useState<DispatcherOption[]>([]);
  const [dispatcherLoading, setDispatcherLoading] = useState(false);
  const [dispatcherName, setDispatcherName] = useState("");
  const [dispatcherEmail, setDispatcherEmail] = useState("");

  const [draft, setDraft] = useState("");
  const [tokensEstimated, setTokensEstimated] = useState<number | null>(null);
  const [templateId, setTemplateId] = useState<string>("");
  const [toneId, setToneId] = useState<string>("neutral");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCarrierSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setCarrierSearchResults([]);
      setCarrierSearchOpen(false);
      return;
    }

    try {
      const res = await fetch(`/api/freight/carriers/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setCarrierSearchResults(data.carriers || []);
        setCarrierSearchOpen(true);
      }
    } catch (err) {
      console.error("Carrier search error:", err);
    }
  };

  const handleSelectCarrier = (carrier: CarrierOption) => {
    setCarrierName(carrier.name);
    setCarrierId(carrier.id);
    setCarrierSearchResults([]);
    setCarrierSearchOpen(false);
    setDispatcherId(null);
    setDispatchers([]);
    setDispatcherName("");
    setDispatcherEmail("");
  };

  useEffect(() => {
    if (contactRole === "dispatcher" && carrierId) {
      const fetchDispatchers = async () => {
        setDispatcherLoading(true);
        try {
          const res = await fetch(`/api/freight/carriers/${carrierId}/dispatchers`);
          const data = await res.json();
          if (res.ok) {
            setDispatchers(data.dispatchers || []);
          }
        } catch (err) {
          console.error("Dispatcher fetch error:", err);
        } finally {
          setDispatcherLoading(false);
        }
      };

      fetchDispatchers();
    } else {
      setDispatchers([]);
      setDispatcherId(null);
    }
  }, [contactRole, carrierId]);

  const handleGenerate = async () => {
    setError(null);
    setDraft("");
    setTokensEstimated(null);

    if (!carrierName || !origin || !destination) {
      setError("Carrier name, origin, and destination are required.");
      return;
    }

    const effectiveContactRole = contactRole || "carrier_owner";

    if (effectiveContactRole === "dispatcher" && !dispatcherId && !dispatcherName) {
      setError("Dispatcher name is required when contacting a dispatcher.");
      return;
    }

    const payload: any = {
      carrierName,
      lane: { origin, destination },
      load: {
        pickupDate: pickupDate || undefined,
        weight: weight ? Number(weight) : undefined,
        equipment: equipment || undefined,
        commodity: commodity || undefined,
      },
      contextNotes: contextNotes || undefined,
      draftType,
      templateId: templateId || undefined,
      toneId: toneId || undefined,
      contactRole: effectiveContactRole,
    };

    if (effectiveContactRole === "dispatcher") {
      if (dispatcherId) {
        payload.dispatcherId = dispatcherId;
      } else {
        payload.dispatcherName = dispatcherName || undefined;
        payload.dispatcherEmail = dispatcherEmail || undefined;
      }
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/freight-carrier-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Failed to generate draft.");
        return;
      }

      setDraft(data.draft || "");
      setTokensEstimated(typeof data.tokensEstimated === "number" ? data.tokensEstimated : null);
    } catch (err: any) {
      setError("Unexpected error while generating draft.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft);
    } catch {
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Carrier Outreach Draft</h2>
        <Badge variant="neutral" value="AI suggestion only — human must verify" />
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        This tool generates a draft-only carrier outreach message. It does not send any communication. Always review and edit the draft before using it with a carrier.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Carrier name</label>
          <Input
            data-testid="carrier-name-input"
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
            placeholder="Acme Logistics"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Draft type</label>
          <Select
            value={draftType}
            onChange={(e) =>
              setDraftType(e.target.value as "inquiry" | "coverage_request" | "relationship")
            }
          >
            <option value="inquiry">Lane availability inquiry</option>
            <option value="coverage_request">Load coverage request</option>
            <option value="relationship">Relationship follow-up</option>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Template (optional)</label>
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">None</option>
            <option value="freight_coverage_professional">Professional Coverage Request</option>
            <option value="freight_lane_inquiry_polite">Polite Lane Inquiry</option>
            <option value="freight_operational_clarity">Operational Clarity</option>
            <option value="freight_leadership_snapshot">Leadership Performance Snapshot</option>
            <option value="freight_risk_focus">Risk-Focused Overview</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tone (optional)</label>
          <select
            className="border rounded-md px-3 py-2 text-sm w-full"
            value={toneId}
            onChange={(e) => setToneId(e.target.value)}
          >
            <option value="neutral">Neutral</option>
            <option value="friendly">Friendly</option>
            <option value="professional_firm">Professional &amp; Firm</option>
          </select>
        </div>

        <div className="md:col-span-2 border-t pt-4 mt-2">
          <label className="block text-sm font-medium mb-2">Contact target</label>
          <div className="flex items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                value="carrier_owner"
                data-testid="contact-role-owner"
                checked={contactRole === "carrier_owner"}
                onChange={() => {
                  setContactRole("carrier_owner");
                  setDispatcherId(null);
                  setDispatcherName("");
                  setDispatcherEmail("");
                }}
              />
              <span>Carrier owner</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                className="h-4 w-4"
                value="dispatcher"
                data-testid="contact-role-dispatcher"
                checked={contactRole === "dispatcher"}
                onChange={() => setContactRole("dispatcher")}
              />
              <span>Dispatcher</span>
            </label>
          </div>

          {contactRole === "dispatcher" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Carrier (optional – link to DB)</label>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Input
                      data-testid="carrier-search-input"
                      value={carrierName}
                      onChange={(e) => {
                        setCarrierName(e.target.value);
                        handleCarrierSearch(e.target.value);
                      }}
                      placeholder="Search carriers by name or MC number"
                    />
                    <Button
                      type="button"
                      data-testid="carrier-search-button"
                      onClick={() => handleCarrierSearch(carrierName)}
                    >
                      Search
                    </Button>
                  </div>
                  {carrierSearchOpen && carrierSearchResults.length > 0 && (
                    <div className="border rounded-md max-h-40 overflow-y-auto text-sm" data-testid="carrier-search-results">
                      {carrierSearchResults.map((carrier) => (
                        <button
                          key={carrier.id}
                          type="button"
                          data-testid={`carrier-search-result-${carrier.id}`}
                          className={`w-full text-left px-3 py-1.5 hover:bg-gray-50 ${
                            carrierId === carrier.id ? "bg-gray-100 font-medium" : ""
                          }`}
                          onClick={() => handleSelectCarrier(carrier)}
                        >
                          <span>{carrier.name}</span>
                          {carrier.mcNumber && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">MC {carrier.mcNumber}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {carrierId && dispatchers.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Select dispatcher (from carrier)</label>
                  <select
                    className="border rounded-md px-3 py-2 text-sm w-full"
                    data-testid="dispatcher-select"
                    value={dispatcherId ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDispatcherId(val ? val : null);
                      setDispatcherName("");
                      setDispatcherEmail("");
                    }}
                  >
                    <option value="">None (use free-form dispatcher)</option>
                    {dispatchers.map((d) => (
                      <option key={d.id} value={d.id} data-testid={`dispatcher-option-${d.id}`}>
                        {d.name}
                        {d.email ? ` – ${d.email}` : ""}
                        {d.phone ? ` – ${d.phone}` : ""}
                        {d.isPrimary ? " (Primary)" : ""}
                      </option>
                    ))}
                  </select>
                  {dispatcherLoading && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400" data-testid="dispatcher-loading">
                      Loading dispatchers...
                    </p>
                  )}
                </div>
              )}

              {carrierId && dispatchers.length === 0 && contactRole === "dispatcher" && (
                <div className="md:col-span-2 text-xs text-gray-600 dark:text-gray-400" data-testid="dispatcher-empty">
                  No dispatchers found for this carrier. You can use the free-form dispatcher fields below.
                </div>
              )}

              {contactRole === "dispatcher" && !dispatcherId && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dispatcher name</label>
                    <Input
                      data-testid="dispatcher-name-input"
                      value={dispatcherName}
                      onChange={(e) => setDispatcherName(e.target.value)}
                      placeholder="Dispatcher name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Dispatcher email (optional)</label>
                    <Input
                      data-testid="dispatcher-email-input"
                      value={dispatcherEmail}
                      onChange={(e) => setDispatcherEmail(e.target.value)}
                      placeholder="dispatcher@example.com"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Origin</label>
          <Input
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Dallas, TX"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Destination</label>
          <Input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Los Angeles, CA"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Pickup date</label>
          <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Weight (lbs)</label>
          <Input value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="42000" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Equipment</label>
          <Input value={equipment} onChange={(e) => setEquipment(e.target.value)} placeholder="Dry Van" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Commodity</label>
          <Input value={commodity} onChange={(e) => setCommodity(e.target.value)} placeholder="Food Goods" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Context notes (internal)</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[80px]"
          value={contextNotes}
          onChange={(e) => setContextNotes(e.target.value)}
          placeholder="Internal hints for tone or situation. Do not paste sensitive data."
        />
      </div>

      {error && (
        <p className="text-sm text-red-600" data-testid="carrier-draft-error">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button data-testid="carrier-draft-generate-button" onClick={handleGenerate} disabled={loading}>
          {loading ? "Generating..." : "Generate Draft"}
        </Button>
        {draft && (
          <Button variant="secondary" type="button" onClick={handleCopy} data-testid="carrier-draft-copy-button">
            Copy draft
          </Button>
        )}
        {tokensEstimated != null && <span className="text-xs text-gray-500 dark:text-gray-400">~{tokensEstimated} tokens (estimated)</span>}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Draft output</label>
        <textarea
          className="w-full border rounded-md px-3 py-2 text-sm min-h-[180px] bg-gray-50"
          value={draft}
          readOnly
          data-testid="carrier-draft-output"
        />
      </div>
    </div>
  );
}
