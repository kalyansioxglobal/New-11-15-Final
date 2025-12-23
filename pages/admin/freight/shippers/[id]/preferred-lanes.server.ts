import { GetServerSideProps } from 'next';
import prisma from '@/lib/prisma';
import { requireAdminUserSSR } from '@/lib/authGuard';

// Dummy default export to satisfy Next.js 15 page type validation for files under `pages/`
// This file is only used for getServerSideProps re-exported by preferred-lanes.tsx.
// The default component is never actually rendered.
const PreferredShipperLanesServerPage = (): any => null;
export default PreferredShipperLanesServerPage;

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const { query } = ctx;
  const auth = await requireAdminUserSSR(ctx);
  if (!auth) return { redirect: { destination: '/overview', permanent: false } };

  const id = typeof query.id === 'string' ? parseInt(query.id, 10) : NaN;
  if (isNaN(id)) return { notFound: true };

  const shipper = await prisma.logisticsShipper.findUnique({ where: { id } });
  if (!shipper) return { notFound: true };

  const lanes = await prisma.shipperPreferredLane.findMany({ where: { shipperId: id }, orderBy: { createdAt: 'desc' } });

  return { props: { shipper: { id: shipper.id, name: shipper.name }, lanes: JSON.parse(JSON.stringify(lanes)) } };
};
