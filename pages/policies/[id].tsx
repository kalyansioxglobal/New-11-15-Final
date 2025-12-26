import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Link from 'next/link';

function PolicyDetailsPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/policies');
    }, 1000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="p-6 max-w-2xl">
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 mb-4">
          This page has been moved. Please use the policies list to view policy details.
        </p>
        <Link
          href="/policies"
          className="text-sm text-blue-600 hover:underline"
        >
          Go to Policies →
        </Link>
      </div>
    </div>
  );
}

export default PolicyDetailsPage;
