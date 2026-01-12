import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import toast from 'react-hot-toast';

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
      toast.error('Customer name and venture are required');
      return;
    }

    if (form.createSubscription && !form.monthlyPrice) {
      toast.error('Monthly price is required when creating a subscription');
      return;
    }

    setSaving(true);

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
        toast.error(data.error || 'Failed to create customer');
        setSaving(false);
        return;
      }

      toast.success('Customer created successfully');
      router.push('/saas/customers');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create customer');
      setSaving(false);
    }
  };

  const selectedService = SERVICE_TYPES.find(s => s.value === form.serviceType);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Create New SaaS Customer</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Add a new customer with subscription details</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border-b border-gray-200 dark:border-gray-700 pb-4 mb-6">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Customer Information</h2>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Customer Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                placeholder="e.g., Acme Corporation"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="e.g., contact@acme.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Domain
                </label>
                <input
                  type="text"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                  placeholder="e.g., acme.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                SaaS Venture <span className="text-red-500">*</span>
              </label>
              <select
                value={form.ventureId}
                onChange={(e) => setForm({ ...form, ventureId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                required
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
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 min-h-[80px] focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-y"
                placeholder="Customer notes..."
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">Subscription Details</h2>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.createSubscription}
                    onChange={(e) => setForm({ ...form, createSubscription: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
                  />
                  <span className="text-gray-600 dark:text-gray-300 font-medium">Create subscription</span>
                </label>
              </div>

              {form.createSubscription && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Service Type <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {SERVICE_TYPES.map((service) => (
                        <button
                          key={service.value}
                          type="button"
                          onClick={() => setForm({ ...form, serviceType: service.value })}
                          className={`p-4 rounded-lg border text-left transition-all ${
                            form.serviceType === service.value
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-200 dark:ring-blue-800'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 bg-white dark:bg-gray-700'
                          }`}
                        >
                          <div className="font-semibold text-sm text-gray-900 dark:text-white">{service.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{service.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Monthly Price (MRR) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={form.monthlyPrice}
                          onChange={(e) => setForm({ ...form, monthlyPrice: e.target.value })}
                          className="w-full px-4 py-2.5 pl-7 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                          placeholder="0.00"
                          required={form.createSubscription}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Billing Cycle
                      </label>
                      <select
                        value={form.billingCycle}
                        onChange={(e) => setForm({ ...form, billingCycle: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
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
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mt-4 mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
                    />
                  </div>

                  {form.monthlyPrice && (
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mt-4 border border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Service:</span>
                        <span className="font-medium text-gray-900 dark:text-white">{selectedService?.label}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Monthly (MRR):</span>
                        <span className="font-medium text-gray-900 dark:text-white">${calculateMRR().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Billing Cycle:</span>
                        <span className="font-medium text-gray-900 dark:text-white capitalize">{form.billingCycle}</span>
                      </div>
                      <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-600">
                        <span className="text-gray-600 dark:text-gray-400 font-semibold">Total per Cycle:</span>
                        <span className="font-bold text-green-600 dark:text-green-400">${calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => router.push('/saas/customers')}
                className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {form.createSubscription ? 'Create Customer & Subscription' : 'Create Customer'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

NewCustomerPage.title = 'New Customer';
