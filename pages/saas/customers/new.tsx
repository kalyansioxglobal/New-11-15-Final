import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

type Venture = { id: number; name: string };

const SERVICE_TYPES = [
  { value: 'revenue', label: 'Revenue', description: 'Lead generation and sales optimization' },
  { value: 'reputation', label: 'Reputation', description: 'Review management and brand monitoring' },
  { value: 'combo', label: 'Combo', description: 'Revenue + Reputation bundle' },
];

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly', multiplier: 1 },
  { value: 'quarterly', label: 'Quarterly', multiplier: 3 },
  { value: 'annual', label: 'Annual', multiplier: 12 },
];

export default function NewCustomerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saasVentures, setSaasVentures] = useState<Venture[]>([]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    domain: '',
    notes: '',
    ventureId: '',
    serviceType: 'revenue',
    monthlyPrice: '',
    billingCycle: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    createSubscription: true,
  });

  useEffect(() => {
    fetch("/api/ventures?types=SAAS")
      .then((r) => r.json())
      .then((data) => {
        setSaasVentures(data || []);
        if (data && data.length > 0) {
          setForm(f => ({ ...f, ventureId: String(data[0].id) }));
        }
      })
      .catch(() => {});
  }, []);

  const calculateMRR = () => {
    const price = parseFloat(form.monthlyPrice) || 0;
    return price;
  };

  const calculateTotal = () => {
    const mrr = calculateMRR();
    const cycle = BILLING_CYCLES.find(b => b.value === form.billingCycle);
    return mrr * (cycle?.multiplier || 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.ventureId) {
      setError('Name and Venture are required');
      return;
    }

    if (form.createSubscription && !form.monthlyPrice) {
      setError('Monthly price is required when creating a subscription');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/saas/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email || null,
          domain: form.domain || null,
          notes: form.notes || null,
          ventureId: Number(form.ventureId),
          subscription: form.createSubscription ? {
            serviceType: form.serviceType,
            monthlyPrice: parseFloat(form.monthlyPrice),
            billingCycle: form.billingCycle,
            startDate: form.startDate,
          } : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to create customer');
      }

      router.push('/saas/customers');
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  };

  const selectedService = SERVICE_TYPES.find(s => s.value === form.serviceType);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">New SaaS Customer</h1>
        <p className="text-sm text-gray-500 mt-1">
          Add a new customer with subscription details
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg border p-5 space-y-4">
          <h2 className="font-medium text-gray-900 border-b pb-2">Customer Information</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="e.g., Acme Corporation"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g., contact@acme.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Domain
              </label>
              <input
                type="text"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="e.g., acme.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SaaS Venture *
            </label>
            <select
              value={form.ventureId}
              onChange={(e) => setForm({ ...form, ventureId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select venture...</option>
              {saasVentures.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Customer notes..."
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border p-5 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="font-medium text-gray-900">Subscription Details</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.createSubscription}
                onChange={(e) => setForm({ ...form, createSubscription: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-gray-600">Create subscription</span>
            </label>
          </div>

          {form.createSubscription && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Type *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {SERVICE_TYPES.map((service) => (
                    <button
                      key={service.value}
                      type="button"
                      onClick={() => setForm({ ...form, serviceType: service.value })}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        form.serviceType === service.value
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{service.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{service.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Price (MRR) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.monthlyPrice}
                      onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Billing Cycle
                  </label>
                  <select
                    value={form.billingCycle}
                    onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    {BILLING_CYCLES.map((cycle) => (
                      <option key={cycle.value} value={cycle.value}>
                        {cycle.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              {form.monthlyPrice && (
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{selectedService?.label}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Monthly (MRR):</span>
                    <span className="font-medium">${calculateMRR().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Billing Cycle:</span>
                    <span className="font-medium capitalize">{form.billingCycle}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600 font-medium">Total per Cycle:</span>
                    <span className="font-bold text-green-600">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Link
            href="/saas/customers"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Creating...' : form.createSubscription ? 'Create Customer & Subscription' : 'Create Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}

NewCustomerPage.title = 'New Customer';
