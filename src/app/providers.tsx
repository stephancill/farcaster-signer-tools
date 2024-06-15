"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectKitProvider, getDefaultConfig } from "connectkit";
import { HashRouter } from "react-router-dom";
import { WagmiProvider, createConfig } from "wagmi";
import { optimism } from "wagmi/chains";
import { BackfillContextProvider } from "../context/backfillContext";
import { ConfigContextProvider } from "../context/configContext";

const config = createConfig(
  getDefaultConfig({
    chains: [optimism],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    appName: "Farcaster Signer Manager",
  })
);

const queryClient = new QueryClient();

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
              <HashRouter>{children}</HashRouter>
            </BackfillContextProvider>
          </ConfigContextProvider>
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
