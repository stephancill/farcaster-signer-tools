import { Message } from "@farcaster/hub-web";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { bytesToHex } from "viem";
import { MessagesArchive } from "../app/types";
import {
  signMessageData,
  signerMessagesToString,
  submitMessage,
  truncateAddress,
} from "../app/utils";
import { messageTypeKeys, useBackfillData } from "../context/backfillContext";
import { useConfig } from "../context/configContext";
import { useFarcasterIdentity } from "../hooks/useFarcasterIdentity";
import { ActionButton } from "./ActionButton";
import { BackButton } from "./BackButton";
import { LocalSignerView } from "./LocalSignerView";

export function ImportDetail({
  importedData,
}: {
  importedData: MessagesArchive;
}) {
  const config = useConfig();
  const backfillData = useBackfillData();
  const farcasterIdentity = useFarcasterIdentity();
  const [submitting, setSubmitting] = useState(false);

  async function handleSignRebroadcast() {
    if (!farcasterIdentity.signer || !importedData) {
      return;
    }

    setSubmitting(true);

    try {
      const messages = messageTypeKeys.map((k) => importedData[k]).flat();

      if (!messages) {
        throw new Error("No messages found for signer");
      }

      const newMessages = (
        await Promise.all(
          messages.map(async (oldMessageJson) => {
            const oldMessage = Message.fromJSON(oldMessageJson);

            const signedMessage = signMessageData(
              oldMessage.data!,
              farcasterIdentity.signer!.privateKey
            );

            if (!signedMessage) {
              console.error("Failed to sign message", oldMessage.data!);
              return null;
            }

            return signedMessage;
          })
        )
      ).filter((m) => m) as Message[];

      // Batch messages
      // TODO: Actual rate limiting, but hubs can handle 20k messages/min by default so most people should be fine
      const batches = newMessages.reduce<Message[][]>(
        (acc, message, i) => {
          const batchIndex = Math.floor(i / 1000);
          if (!acc[batchIndex]) {
            acc[batchIndex] = [];
          }
          acc[batchIndex].push(message);
          return acc;
        },
        [[]]
      );

      let i = 0;
      // Submit batches sequentially
      for (const batch of batches) {
        console.log(`Submitting batch ${i++} of ${batches.length}`);
        const results = await Promise.all(
          batch.map(async (message) => {
            const submitMessageResponse = await submitMessage(message, {
              hubUrl: config.hubUrl,
            });

            if (!submitMessageResponse.ok) {
              console.error(
                `Failed to submit message: ${submitMessageResponse.statusText}`
              );
            }
          })
        );
      }
    } catch (error) {
      console.error("Failed to sign and rebroadcast", error);
      setSubmitting(false);
    }

    setSubmitting(false);
  }

  const readyToBroadcast = useMemo(() => {
    return !importedData?.signerPubKeys.some((signerPubKey) =>
      backfillData.data?.signers.find(
        (s) => bytesToHex(s.signerEventBody.key) === signerPubKey
      )
    );
  }, [importedData, backfillData.data]);

  return (
    <div className="space-y-4">
      <BackButton />
      <div className="flex gap-4">
        <div className="space-y-2">
          <div>
            <div className="font-bold">Imported Archive</div>
            <div className="text-gray-500">
              {signerMessagesToString(importedData)}
            </div>
          </div>
          <div className="space-y-2">
            <div>Signers in Archive</div>
            {importedData?.signerPubKeys.map((signerPubKey) =>
              backfillData.data?.signers.find(
                (s) => bytesToHex(s.signerEventBody.key) === signerPubKey
              ) ? (
                <Link
                  to={`/app/${backfillData.signersByFid?.signerToFid[signerPubKey]}/${signerPubKey}`}
                >
                  <div className="flex gap-2">
                    <pre className="underline">
                      {truncateAddress(signerPubKey)}
                    </pre>
                    <div>
                      <div title="This signer has not been deleted yet">❌</div>
                    </div>
                  </div>
                </Link>
              ) : (
                <div className="flex gap-2">
                  <pre>{truncateAddress(signerPubKey)}</pre>
                  <div title="Signer has been deleted and is ready to be imported">
                    ✅
                  </div>
                </div>
              )
            )}
            {!readyToBroadcast && (
              <div className="text-gray-500">
                *Delete signers that you want to migrate messages from
              </div>
            )}
          </div>
        </div>
        <div>→</div>
        {farcasterIdentity.signer && (
          <div className="space-y-2">
            <div className="font-bold">Selected signer</div>

            <LocalSignerView user={farcasterIdentity.signer} active />
            {farcasterIdentity.signer.status === "approved" && (
              <ActionButton
                onClick={handleSignRebroadcast}
                disabled={submitting || !readyToBroadcast}
              >
                Sign & Rebroadcast
              </ActionButton>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="font-bold">All Local Signers</div>
        <ActionButton onClick={() => farcasterIdentity.onCreateSignerPress()}>
          Create Signer
        </ActionButton>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {farcasterIdentity.identities.map((identity, i) => (
            <ActionButton
              className={twMerge(
                "text-left",
                identity._id === farcasterIdentity.signer?._id
                  ? "border-black"
                  : "border-gray-300"
              )}
              onClick={() => farcasterIdentity.selectIdentity(identity._id)}
              key={identity.publicKey}
            >
              <LocalSignerView user={identity} />
            </ActionButton>
          ))}
        </div>
      </div>
    </div>
  );
}
