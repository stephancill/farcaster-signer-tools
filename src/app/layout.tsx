"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import "./globals.css";
import { LOCALSTORAGE_KEYS } from "./const";
import { BackfillContextProvider } from "../context/backfillContext";
// export const metadata: Metadata = {
//   title: "Farcaster Signer Migration",
//   description: "Easily migrate/backup messages from your farcaster account.",
// };

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

// const persister = createSyncStoragePersister({
//   storage: window.localStorage,
//   key: LOCALSTORAGE_KEYS.BACKFILL_CACHE,
// });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      > */}
      <QueryClientProvider client={queryClient}>
        <BackfillContextProvider>
          <body className="p-2 md:p-10">{children}</body>
        </BackfillContextProvider>
      </QueryClientProvider>
      {/* </PersistQueryClientProvider> */}
    </html>
  );
}
