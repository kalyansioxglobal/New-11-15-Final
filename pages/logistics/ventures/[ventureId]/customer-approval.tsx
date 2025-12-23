import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../api/auth/[...nextauth]';
import { prisma } from '../../../../lib/prisma';
import { useState } from 'react';
import { useRouter } from 'next/router';

type CustomerOption = { id: number; name: string };

type Props = {
  ventureId: number;
  ventureName: string;
  customers: CustomerOption[];
  currentUserId: number;
};

export default function CustomerApprovalForm({
  ventureId,
  ventureName,
  customers,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/logistics/customer-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ventureId,
          customerId,
          requestedById: currentUserId,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create approval');
      }

      setSuccess('Customer approval submitted successfully.');
      setNotes('');
      setCustomerId('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-8 py-6 max-w-xl">
        <button
          onClick={() => router.back()}
          className="text-xs text-gray-500 mb-2 hover:underline"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-semibold mb-1">
          New Customer Approval – {ventureName}
        </h1>
        <p className="text-sm text-gray-500 mb-4">
          This approval is locked to <strong>{ventureName}</strong>. It will not
          be visible or routed to any other venture.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Customer
            </label>
            <select
              className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full"
              value={customerId}
              onChange={(e) => setCustomerId(Number(e.target.value) || '')}
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Notes (optional)
            </label>
            <textarea
              className="border border-gray-300 rounded-md px-2 py-1 text-sm w-full min-h-[80px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Credit limit, payment terms, lane info, etc."
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-2 py-1">
              {error}
            </p>
          )}
          {success && (
            <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-md px-2 py-1">
              {success}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md bg-gray-900 text-white text-sm font-medium disabled:opacity-60"
          >
            {loading ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </form>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const ventureId = Number(ctx.params?.ventureId);
  if (!ventureId) {
    return { notFound: true };
  }

  const sessionUserId = (session.user as any).id;
  const currentUserId = typeof sessionUserId === 'string' ? parseInt(sessionUserId, 10) : sessionUserId;

  if (!currentUserId || isNaN(currentUserId)) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  const userVenture = await prisma.ventureUser.findFirst({
    where: { userId: currentUserId, ventureId },
  });

  if (!userVenture) {
    return { notFound: true };
  }

  const venture = await prisma.venture.findUnique({
    where: { id: ventureId },
  });

  if (!venture) {
    return { notFound: true };
  }

  const customers = await prisma.customer.findMany({
    where: { ventureId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return {
    props: {
      ventureId,
      ventureName: venture.name,
      customers,
      currentUserId,
    },
  };
};
