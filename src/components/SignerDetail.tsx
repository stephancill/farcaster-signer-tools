import {
  CastAddMessage,
  CastRemoveMessage,
  isCastAddMessage,
  isCastRemoveMessage,
} from "@farcaster/hub-web";
import { useParams } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { bytesToHex } from "viem";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import {
  farcasterTimeToDate,
  getFullTime,
  handleBackup,
  signerMessagesToString,
  timeAgo,
  truncateAddress,
} from "../app/utils";
import { useBackfillData } from "../context/backfillContext";
import { ID_REGISTRY } from "../contracts/id-registry";
import { KEY_REGISTRY } from "../contracts/key-registry";
import { border } from "../style/common";
import { ActionButton } from "./ActionButton";
import { BackButton } from "./BackButton";
import { CastView } from "./CastView";
import { PaginatedGrid } from "./PaginatedGrid";
import { UserDataView } from "./UserDataView";

export function SignerDetail({ signer: signerProp }: { signer?: string }) {
  const { signer: signerRoute } = useParams<{ signer: string }>();
  const signer = signerRoute || signerProp;

  const backfillData = useBackfillData();
  const { data, messagesBySigner, signersByFid, messagesByHash } = backfillData;

  const { data: hash, writeContract, isPending, isIdle } = useWriteContract();

  const { address: walletAddress } = useAccount();

  const { data: walletFid } = useReadContract({
    ...ID_REGISTRY,
    functionName: walletAddress ? "idOf" : undefined,
    args: walletAddress ? [walletAddress] : undefined,
  });

  function handleDeleteSigner(signer: string) {
    writeContract({
      ...KEY_REGISTRY,
      functionName: "remove",
      args: [signer as `0x${string}`],
    });
  }

  if (!signer || !signersByFid?.signerToFid[signer]) {
    return (
      <div>
        <BackButton />
        <div>Signer does not exist</div>
      </div>
    );
  }

  const casts = (messagesBySigner?.[signer!].casts.filter(
    (c) => isCastAddMessage(c) || isCastRemoveMessage(c)
  ) || []) as (CastAddMessage | CastRemoveMessage)[];

  const signerFidProfile =
    signer && signersByFid?.signerToFid[signer!]
      ? data?.signerProfiles[signersByFid?.signerToFid[signer!]]
      : undefined;

  return (
    <div key={signer} className="text-left space-y-2">
      <BackButton />

      <div className="space-y-2">
        {signerFidProfile && <UserDataView data={signerFidProfile} />}

        <div>
          <pre className="mb-2">{truncateAddress(signer!)}</pre>
          <div className="text-gray-500">
            {signerMessagesToString(messagesBySigner?.[signer!])}
          </div>
          <div className="flex flex-col">
            <div>
              Last used:{" "}
              {messagesBySigner?.[signer!]?.lastUsed
                ? `${timeAgo(messagesBySigner?.[signer!]?.lastUsed!)} ago`
                : "never"}
            </div>
            <div>
              Created:{" "}
              {messagesBySigner?.[signer!]?.createdAt
                ? `${timeAgo(messagesBySigner?.[signer!]?.createdAt!)} ago`
                : "(this shouldn't happen)"}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <ActionButton onClick={() => handleBackup(signer!, backfillData)}>
          Backup
        </ActionButton>
        {walletFid ? (
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={() => handleDeleteSigner(signer!)}
              disabled={isPending}
            >
              {isPending ? "Deleting..." : "Delete"}
            </ActionButton>
            {hash && (
              <a
                href={`https://optimistic.etherscan.io/tx/${hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                tx
              </a>
            )}
          </div>
        ) : (
          <div
            className="p-2 border border-gray-300 text-gray-500 cursor-not-allowed"
            title={
              walletAddress
                ? "No FID associated with this wallet. Are you using the seed phrase from Warpcast?"
                : "Connect the wallet that custodies your FID"
            }
          >
            Delete
          </div>
        )}
      </div>

      {casts.length > 0 && (
        <PaginatedGrid
          items={casts}
          renderItem={(cast) =>
            isCastAddMessage(cast) ? (
              <CastView key={bytesToHex(cast.hash)} castAddMessage={cast} />
            ) : (
              <div
                className={twMerge(
                  "flex flex-col p-2 break-word [overflow-wrap:anywhere] gap-2",
                  border
                )}
                key={bytesToHex(cast.hash)}
              >
                <div className="text-gray-500 line-through">
                  {bytesToHex(cast.data.castRemoveBody.targetHash)}
                </div>
                <div className="flex">
                  <div
                    className="text-gray-500"
                    title={getFullTime(
                      farcasterTimeToDate(cast.data.timestamp)
                    )}
                  >
                    {timeAgo(farcasterTimeToDate(cast.data.timestamp))} ago
                  </div>
                  <div className="ml-auto text-gray-500">Removed</div>
                </div>
              </div>
            )
          }
        />
      )}
    </div>
  );
}
