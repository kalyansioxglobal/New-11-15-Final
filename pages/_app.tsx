import type { AppProps } from "next/app";
import Head from "next/head";
import { SessionProvider, useSession } from "next-auth/react";
import { TestModeProvider } from "@/contexts/TestModeContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
import Layout from "@/components/Layout";
import { First30DaysModal } from "@/components/First30DaysModal";
import { APP_NAME, APP_TAGLINE } from "@/lib/appMeta";
import "@/styles/globals.css";

function AppContent({
  Component,
  pageProps,
}: {
  Component: any;
  pageProps: any;
}) {
  const { data: session } = useSession();
  const getLayout =
    Component.getLayout ||
    ((page: React.ReactNode) => <Layout title={Component.title}>{page}</Layout>);

  return (
    <>
      <Head>
        <title>{APP_NAME}</title>
        <meta name="description" content={APP_TAGLINE} />
      </Head>
      <TestModeProvider>
        <UserPreferencesProvider>
          {session?.user && (
            <First30DaysModal userCreatedAt={(session.user as any).createdAt} />
          )}
          {getLayout(<Component {...pageProps} />)}
        </UserPreferencesProvider>
      </TestModeProvider>
    </>
  );
}

export default function MyApp({
  Component,
  pageProps: { session, ...pageProps },
}: AppProps & { Component: any }) {
  return (
    <SessionProvider session={session}>
      <AppContent Component={Component} pageProps={pageProps} />
    </SessionProvider>
  );
}
