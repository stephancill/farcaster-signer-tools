import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

export type ConfigContextType = {
  fid: number | null;
  setFid: (fid: number | null) => void;
  hubUrl: string;
  setHubUrl: (hubRestUrl: string) => void;
};

export const ConfigContext = createContext<ConfigContextType | null>(null);

export function ConfigContextProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [fid, setFid] = useState<number | null>(null);
  const [hubUrl, setHubUrl] = useState<string>(
    process.env.NEXT_PUBLIC_HUB_REST_URL || "https://nemes.farcaster.xyz:2281"
  );

  const value: ConfigContextType = {
    fid,
    setFid,
    hubUrl,
    setHubUrl,
  };

  return (
    <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
  );
}

export function useConfig(): ConfigContextType {
  const context = useContext(ConfigContext);

  if (!context)
    throw new Error("useConfig must be used within an ConfigContextProvider");

  return context;
}
