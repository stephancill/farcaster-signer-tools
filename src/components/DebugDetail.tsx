"use client";

import {
  CastType,
  FarcasterNetwork,
  Message,
  NobleEd25519Signer,
  makeCastAdd,
  makeCastRemove,
} from "@farcaster/hub-web";
import { useEffect, useState } from "react";
import { submitMessage, transformHash } from "../app/utils";
import { useFarcasterIdentity } from "../hooks/useFarcasterIdentity";
import { SignerView } from "./SignerView";
import { ActionButton } from "./ActionButton";
import { hexToBytes } from "viem";
import { BackButton } from "./BackButton";

export function DebugPage() {
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { signer } = useFarcasterIdentity();
  const [castHashToDelete, setCastHashToDelete] = useState<string>("");
  const [castText, setCastText] = useState<string>("");

  useEffect(() => {
    if (!rawJson) return;

    try {
      const parsed = JSON.parse(rawJson);
      setMessage(
        JSON.stringify(
          transformHash(Message.toJSON(Message.fromJSON(parsed))),
          null,
          2
        )
      );
    } catch (e) {
      setMessage("Could not parse message");
    }
  }, [rawJson]);

  async function deleteCastHash(castHash: string) {
    if (!signer) return;

    const nobleSigner = new NobleEd25519Signer(hexToBytes(signer.privateKey));

    const hubResult = await makeCastRemove(
      {
        targetHash: hexToBytes(castHash as `0x${string}`),
      },
      {
        fid: 1689,
        network: FarcasterNetwork.MAINNET,
      },
      nobleSigner
    );

    const result = hubResult._unsafeUnwrap();
    await submitMessage(result, {
      hubRestUrl: process.env.NEXT_PUBLIC_HUB_REST_URL!,
    });
  }

  async function createCast(castText: string) {
    if (!signer) return;

    const nobleSigner = new NobleEd25519Signer(hexToBytes(signer.privateKey));

    const hubResult = await makeCastAdd(
      {
        text: castText,
        embeds: [],
        embedsDeprecated: [],
        mentions: [],
        mentionsPositions: [],
        type: CastType.CAST,
      },
      {
        fid: 1689,
        network: FarcasterNetwork.MAINNET,
      },
      nobleSigner
    );

    const result = hubResult._unsafeUnwrap();
    await submitMessage(result, {
      hubRestUrl: process.env.NEXT_PUBLIC_HUB_REST_URL!,
    });
  }

  return (
    <div className="space-y-4">
      <BackButton />
      <h1>Debug</h1>
      <div>
        <div>Decode message JSON</div>
        <textarea
          value={rawJson || ""}
          onChange={(e) => setRawJson(e.target.value)}
          placeholder="Paste Message JSON here"
          className="w-full h-32 border border-black"
        />
        {message && <pre className="border border-black">{message}</pre>}
      </div>
      {signer && (
        <div className="flex space-y-2 flex-col">
          <h2>Signer</h2>
          <SignerView signer={signer.publicKey}></SignerView>
          <div>
            <input
              type="text"
              value={castHashToDelete}
              className="border border-black p-2 w-[200px]"
              placeholder="Cast hash to delete"
              onChange={(e) => setCastHashToDelete(e.target.value)}
            />
            <ActionButton onClick={() => deleteCastHash(castHashToDelete)}>
              Delete
            </ActionButton>
          </div>
          <div>
            <input
              type="text"
              value={castText}
              className="border border-black p-2 w-[200px]"
              placeholder="Cast to post"
              onChange={(e) => setCastText(e.target.value)}
            />
            <ActionButton onClick={() => createCast(castText)}>
              Cast
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
