import { Message, OnChainEvent, SignerOnChainEvent } from "@farcaster/hub-web";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { bytesToHex } from "viem";
import { farcasterTimeToDate, getFullProfileFromHub } from "../app/utils";

type BackfillContextType = {
  /** Decode JSON data to `Message`/`OnChainEvent` objects */
  data?: ReturnType<typeof decodeJsonData>;
  /** Signers grouped by `requestFid` */
  signersByFid?: ReturnType<typeof indexSignersByFid>;
  /** Messages grouped by signer key */
  messagesBySigner?: ReturnType<typeof indexMessagesBySigner>;
  /** Message counts grouped by app FID */
  messageCountsByFid?: ReturnType<typeof indexMessageCountsByFid>;
  /** Last used by app FID */
  lastUsedByFid?: ReturnType<typeof indexLastUsedByFid>;
  /** Set the raw data */
  setDataRaw: (data: any) => void;
  /** Loading indicator status */
  isLoading: boolean;
};

export const BackfillContext = createContext<BackfillContextType | null>(null);

export function BackfillContextProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  const [dataRaw, setDataRaw] = useState<Awaited<
    ReturnType<typeof getFullProfileFromHub>
  > | null>(null);

  const {
    data,
    signersByFid,
    messagesBySigner,
    messageCountsByFid,
    lastUsedByFid,
  } = useMemo(() => {
    console.log(`Decode JSON data`);
    if (!dataRaw) return {} as BackfillContextType;
    setIsLoading(true);
    const data = decodeJsonData(dataRaw);
    const signersByFid = indexSignersByFid(data.signers);
    const messagesBySigner = indexMessagesBySigner(data);
    const messageCountsByFid = indexMessageCountsByFid(
      messagesBySigner,
      signersByFid
    );
    const lastUsedByFid = indexLastUsedByFid(messagesBySigner, signersByFid);
    setIsLoading(false);
    return {
      data,
      signersByFid,
      messagesBySigner,
      messageCountsByFid,
      lastUsedByFid,
    };
  }, [dataRaw]);

  const value: BackfillContextType = {
    data,
    signersByFid,
    messagesBySigner,
    messageCountsByFid,
    lastUsedByFid,
    setDataRaw,
    isLoading,
  };

  return (
    <BackfillContext.Provider value={value}>
      {children}
    </BackfillContext.Provider>
  );
}

export function useBackfillData(
  initialDataRaw?: Awaited<ReturnType<typeof getFullProfileFromHub>> | undefined
): BackfillContextType {
  const context = useContext(BackfillContext);

  if (!context)
    throw new Error(
      "useBackfillData must be used within an BackfillContextProvider"
    );

  useEffect(() => {
    if (initialDataRaw) {
      context.setDataRaw(initialDataRaw);
    }
  }, [initialDataRaw]);

  return context;
}

function decodeJsonData(
  dataRaw: Awaited<ReturnType<typeof getFullProfileFromHub>>
) {
  return {
    ...dataRaw,
    casts: dataRaw.casts
      .map((cast) => Message.fromJSON(cast))
      .sort((a, b) => (b.data?.timestamp || 0) - (a.data?.timestamp || 0)),
    reactions: dataRaw.reactions.map((reaction) => Message.fromJSON(reaction)),
    links: dataRaw.links.map((link) => Message.fromJSON(link)),
    verifications: dataRaw.verifications.map((verification) =>
      Message.fromJSON(verification)
    ),
    userData: dataRaw.userData.map((userData) => Message.fromJSON(userData)),
    signers: dataRaw.signers.map((signer) => {
      const { metadata, ...event } = signer as any;
      const eventDecoded = OnChainEvent.fromJSON(
        event
      ) as unknown as SignerOnChainEvent;
      return {
        ...eventDecoded,
        metadata: metadata as {
          requestFid: number;
          requestSigner: string;
          signature: string;
          deadline: number;
        },
      };
    }),
  };
}

function indexSignersByFid(
  signers: ReturnType<typeof decodeJsonData>["signers"]
) {
  return signers.reduce(
    (acc, signer) => {
      const fid = signer.metadata.requestFid.toString();
      const signerKey = bytesToHex(signer.signerEventBody.key);

      if (!acc.fidToSigner[fid]) {
        acc.fidToSigner[fid] = [];
      }
      acc.fidToSigner[fid].push(signerKey);

      if (!acc.signerToFid[signerKey]) {
        acc.signerToFid[signerKey] = fid;
      }

      return acc;
    },
    { fidToSigner: {}, signerToFid: {} } as {
      fidToSigner: Record<string, string[]>;
      signerToFid: Record<string, string>;
    }
  );
}

function indexMessagesBySigner(data: ReturnType<typeof decodeJsonData>) {
  type DataMessageFields = Omit<
    typeof data,
    "signerProfiles" | "signers" | "userDataAggregated"
  >;
  type SignerMessagesType = DataMessageFields & {
    lastUsed?: Date;
    createdAt?: Date;
  };
  const messages = {} as Record<string, SignerMessagesType>;

  function processMessages(
    newMessages: Message[],
    key: keyof DataMessageFields
  ) {
    newMessages.forEach((message) => {
      const signer = bytesToHex(message.signer);
      if (!messages[signer]) {
        messages[signer] = {
          casts: [],
          reactions: [],
          links: [],
          verifications: [],
          userData: [],
        };
      }

      // Update latest timestamp
      if (
        message.data?.timestamp &&
        (!messages[signer].lastUsed ||
          (messages[signer].lastUsed || new Date(0)) <
            farcasterTimeToDate(message.data.timestamp))
      ) {
        messages[signer].lastUsed = farcasterTimeToDate(message.data.timestamp);
      }

      messages[signer]![key]!.push(message);
    });
  }

  for (const key of [
    "casts",
    "reactions",
    "links",
    "verifications",
    "userData",
  ] as const) {
    processMessages(data[key], key);
  }

  for (const signer of data.signers) {
    if (!messages[bytesToHex(signer.signerEventBody.key)]) {
      messages[bytesToHex(signer.signerEventBody.key)] = {
        casts: [],
        reactions: [],
        links: [],
        verifications: [],
        userData: [],
      };
    }

    messages[bytesToHex(signer.signerEventBody.key)].createdAt = new Date(
      signer.blockTimestamp * 1000
    );
  }

  return messages;
}

function indexMessageCountsByFid(
  messagesBySigner: ReturnType<typeof indexMessagesBySigner>,
  signersByFid: ReturnType<typeof indexSignersByFid>
) {
  return Object.entries(messagesBySigner).reduce(
    (acc, [signer, messages]) => {
      const fid = signersByFid.signerToFid[signer];
      if (!acc[fid]) {
        acc[fid] = {
          casts: 0,
          reactions: 0,
          links: 0,
          verifications: 0,
          total: 0,
        };
      }
      acc[fid].casts += messages.casts.length;
      acc[fid].reactions += messages.reactions.length;
      acc[fid].links += messages.links.length;
      acc[fid].verifications += messages.verifications.length;
      acc[fid].total +=
        messages.casts.length +
        messages.reactions.length +
        messages.links.length +
        messages.verifications.length;

      return acc;
    },
    {} as Record<
      string,
      {
        casts: number;
        reactions: number;
        links: number;
        verifications: number;
        total: number;
      }
    >
  );
}

function indexLastUsedByFid(
  messagesBySigner: ReturnType<typeof indexMessagesBySigner>,
  signersByFid: ReturnType<typeof indexSignersByFid>
) {
  return Object.entries(messagesBySigner).reduce((acc, [signer, messages]) => {
    const fid = signersByFid.signerToFid[signer];
    if (messages.lastUsed && messages.lastUsed > (acc[fid] || new Date(0))) {
      acc[fid] = messages.lastUsed;
    }
    return acc;
  }, {} as Record<string, Date>);
}
