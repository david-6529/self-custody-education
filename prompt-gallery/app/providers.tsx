"use client";

import { createAppKit } from "@reown/appkit/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type State } from "wagmi";
import { wagmiAdapter, projectId, networks } from "@/lib/wagmi";
import { mainnet } from "@reown/appkit/networks";
import { useState } from "react";

createAppKit({
  adapters: [wagmiAdapter],
  projectId,
  networks: [mainnet],
  defaultNetwork: mainnet,
  metadata: {
    name: "GVC Prompt Machine",
    description: "AI prompt tools for Good Vibes Club characters",
    url: "https://prompts.goodvibesclub.info",
    icons: ["/shaka.png"],
  },
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#FFE048",
    "--w3m-border-radius-master": "2px",
  },
});

export default function Providers({
  children,
  initialState,
}: {
  children: React.ReactNode;
  initialState?: State;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
