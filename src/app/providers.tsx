"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { HashRouter } from "react-router-dom";
import { WagmiProvider, createConfig } from "wagmi";
import { optimism } from "wagmi/chains";
import { BackfillContextProvider } from "../context/backfillContext";
import { ConfigContextProvider } from "../context/configContext";
import "./globals.css";

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

export default function Providers({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          <ConfigContextProvider>
            <BackfillContextProvider>
              {typeof window !== "undefined" ? (
                <HashRouter>{children}</HashRouter>
              ) : null}
            </BackfillContextProvider>
          </ConfigContextProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
