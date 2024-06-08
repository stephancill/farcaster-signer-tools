"use client";

import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

import "./globals.css";
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

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{ persister }}
      >
        <body>{children}</body>
      </PersistQueryClientProvider>
    </html>
  );
}
