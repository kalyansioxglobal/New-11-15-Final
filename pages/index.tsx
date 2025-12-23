import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  DISPATCHER: "/dispatcher/dashboard",
  CSR: "/csr/dashboard",
  EMPLOYEE: "/employee/dashboard",
  CONTRACTOR: "/employee/dashboard",
};

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const session = await getServerSession(ctx.req, ctx.res, authOptions);

  if (!session?.user?.id) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  const userRole = (session.user as any).role as string | undefined;

  if (userRole && ROLE_DASHBOARD_MAP[userRole]) {
    return {
      redirect: {
        destination: ROLE_DASHBOARD_MAP[userRole],
        permanent: false,
      },
    };
  }

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: Number(session.user.id) },
  });

  const landing = prefs?.landingPage ?? "freight";

  const routeMap: Record<string, string> = {
    freight: "/logistics/dashboard",
    hotels: "/hospitality/dashboard",
    bpo: "/bpo/dashboard",
    holdings: "/holdings/bank",
  };

  const destination = routeMap[landing] ?? "/logistics/dashboard";

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
};

export default function IndexRedirect(): null {
  return null;
}
