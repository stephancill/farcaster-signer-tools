"use client";

import { Message, OnChainEvent, SignerOnChainEvent } from "@farcaster/hub-web";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { bytesToHex } from "viem";
import { UserAccount } from "../components/UserData";
import { getFullProfileFromHub } from "./utils";

export default function Home() {
  // Queries
  const {
    data: dataRaw,
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["profile", 1689],
    queryFn: async () => getFullProfileFromHub(1689),
  });

  const data = useMemo(() => {
    if (!dataRaw) return;
    return {
      ...dataRaw,
      casts: dataRaw.casts.map((cast) => Message.fromJSON(cast)),
      reactions: dataRaw.reactions.map((reaction) =>
        Message.fromJSON(reaction)
      ),
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
  }, [dataRaw]);

  const signersByFid = useMemo(() => {
    // Group signers by requestFid
    return data?.signers.reduce(
      (acc, signer) => {
        if (!acc.fidToSigner[signer.metadata.requestFid]) {
          acc.fidToSigner[signer.metadata.requestFid.toString()] = [];
        }
        acc.fidToSigner[signer.metadata.requestFid.toString()].push(signer);

        if (!acc.signerToFid[bytesToHex(signer.signerEventBody.key)]) {
          acc.signerToFid[signer.metadata.requestFid.toString()] =
            signer.metadata.requestFid.toString();
        }

        return acc;
      },
      { fidToSigner: {}, signerToFid: {} } as {
        fidToSigner: Record<string, OnChainEvent[]>;
        signerToFid: Record<string, string>;
      }
    );
  }, [data]);

  const messagesBySigner = useMemo(() => {
    if (!data) return;

    const messages = {} as Record<
      string,
      Omit<typeof data, "signerProfiles" | "signers" | "userDataAggregated">
    >;
    data.casts.map((cast) => {
      const signer = bytesToHex(cast.signer);
      if (!messages[signer]) {
        messages[signer] = {
          casts: [],
          reactions: [],
          links: [],
          verifications: [],
          userData: [],
        };
      }
      messages[signer].casts.push(cast);
    });

    data.reactions.map((reaction) => {
      const signer = bytesToHex(reaction.signer);
      if (!messages[signer]) {
        messages[signer] = {
          casts: [],
          reactions: [],
          links: [],
          verifications: [],
          userData: [],
        };
      }
      messages[signer].reactions.push(reaction);
    });

    data.links.map((link) => {
      const signer = bytesToHex(link.signer);
      if (!messages[signer]) {
        messages[signer] = {
          casts: [],
          reactions: [],
          links: [],
          verifications: [],
          userData: [],
        };
      }
      messages[signer].links.push(link);
    });

    data.verifications.map((verification) => {
      const signer = bytesToHex(verification.signer);
      if (!messages[signer]) {
        messages[signer] = {
          casts: [],
          reactions: [],
          links: [],
          verifications: [],
          userData: [],
        };
      }
      messages[signer].verifications.push(verification);
    });

    return messages;
  }, [data]);

  const messageCountsByFid = useMemo(() => {
    if (!messagesBySigner) return;

    return Object.entries(messagesBySigner).reduce(
      (acc, [signer, messages]) => {
        if (!signersByFid) return acc;

        const fid = signersByFid.signerToFid[signer];
        if (!acc[fid]) {
          acc[fid] = {
            casts: 0,
            reactions: 0,
            links: 0,
            verifications: 0,
          };
        }
        acc[fid].casts += messages.casts.length;
        acc[fid].reactions += messages.reactions.length;
        acc[fid].links += messages.links.length;
        acc[fid].verifications += messages.verifications.length;

        return acc;
      },
      {} as Record<
        string,
        {
          casts: number;
          reactions: number;
          links: number;
          verifications: number;
        }
      >
    );
  }, [messagesBySigner]);

  if (isLoading)
    return <div>{process.env.NEXT_PUBLIC_HUB_REST_URL} Loading...</div>;

  if (isError || !data || !signersByFid)
    return (
      <div>Error {error instanceof Error && error.message + error.stack}</div>
    );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <UserAccount data={data.userDataAggregated} />
        <div>
          {`${data.casts.length} casts, ${data.reactions.length} reactions, ${data.links.length} links, ${data.signers.length} signers, ${data.verifications.length} verifications`}
        </div>
      </div>
      <div className="space-y-4">
        {Object.entries(signersByFid.fidToSigner).map(([fid, signers], i) => (
          <div key={fid}>
            <UserAccount data={data.signerProfiles[fid]} />
            <div>
              <div>{`${signers.length} signers`}</div>
              {/* <div>{`${messageCountsByFid?.[fid].casts} casts, ${messageCountsByFid?.[fid].reactions} reactions, ${messageCountsByFid?.[fid].links} links, ${messageCountsByFid?.[fid].verifications} verifications`}</div> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
