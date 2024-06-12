"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { WagmiProvider, createConfig } from "wagmi";
import { optimism } from "wagmi/chains";
import { BackfillContextProvider } from "../context/backfillContext";
import "./globals.css";
import { HashRouter, Route, Link, Routes } from "react-router-dom";

const config = createConfig(
  getDefaultConfig({
    chains: [optimism],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: "Farcaster Signer Manager",
  })
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <ConnectKitProvider>
            <BackfillContextProvider>
              <HashRouter>
                <body className="p-2 md:p-10">{children}</body>
              </HashRouter>
            </BackfillContextProvider>
          </ConnectKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </html>
  );
}
