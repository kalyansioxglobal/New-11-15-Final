import { GetServerSideProps } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminUserSSR } from '@/lib/authGuard';

// Dummy default export to satisfy Next.js 15 page type validation for files under `pages/`
// This file is only used for getServerSideProps re-exported by preferred-lanes.tsx.
// The default component is never actually rendered.
const PreferredLanesServerPage = (): any => null;
export default PreferredLanesServerPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { query } = ctx;
  const auth = await requireAdminUserSSR(ctx);
  if (!auth) return { redirect: { destination: '/overview', permanent: false } };

  const id = typeof query.id === 'string' ? parseInt(query.id, 10) : NaN;
  if (isNaN(id)) return { notFound: true };

  const carrier = await prisma.carrier.findUnique({ where: { id } });
  if (!carrier) return { notFound: true };

  const lanes = await prisma.carrierPreferredLane.findMany({ where: { carrierId: id }, orderBy: { createdAt: 'desc' } });

  return { props: { carrier: { id: carrier.id, name: carrier.name }, lanes: JSON.parse(JSON.stringify(lanes)) } };
};
