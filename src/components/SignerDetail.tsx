import { useState } from "react";
import { isCastAddMessage } from "@farcaster/hub-web";
import { bytesToHex } from "viem";
import { signerMessagesToString, timeAgo, truncateAddress } from "../app/utils";
import { useBackfillData } from "../context/backfillContext";
import { BackButton } from "./BackButton";
import { CastView } from "./CastView";
import { PaginatedGrid } from "./PaginatedGrid";
import { ActionButton } from "./ActionButton";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { KEY_REGISTRY } from "../contracts/key-registry";
import { ID_REGISTRY } from "../contracts/id-registry";

export function SignerDetail({
  signer,
  appFid,
  handleBackup,
  onBack,
}: {
  signer: string;
  appFid: string;
  handleBackup: (signer: string) => void;
  onBack: () => void;
}) {
  const { data, messagesBySigner, signersByFid } = useBackfillData();

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

  const casts = messagesBySigner?.[signer].casts.filter(isCastAddMessage) || [];
  return (
    <div key={signer} className="text-left space-y-1">
      <BackButton onBack={onBack} />

      <pre className="mb-2">{truncateAddress(signer)}</pre>
      <div className="text-gray-500">
        {signerMessagesToString(messagesBySigner?.[signer])}
      </div>
      <div className="flex flex-col">
        <div>
          Last used:{" "}
          {messagesBySigner?.[signer]?.lastUsed
            ? `${timeAgo(messagesBySigner?.[signer]?.lastUsed!)} ago`
            : "never"}
        </div>
        <div>
          Created:{" "}
          {messagesBySigner?.[signer]?.createdAt
            ? `${timeAgo(messagesBySigner?.[signer]?.createdAt!)} ago`
            : "(this shouldn't happen)"}
        </div>
      </div>

      <div className="flex gap-2">
        <ActionButton onClick={() => handleBackup(signer)}>Backup</ActionButton>
        {walletFid ? (
          <div className="flex items-center gap-2">
            <ActionButton
              onClick={() => handleDeleteSigner(signer)}
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
          <div className="p-2 border border-gray-300 text-gray-500">No FID</div>
        )}
      </div>

      {casts.length > 0 && (
        <PaginatedGrid
          items={casts}
          renderItem={(cast) => (
            <CastView key={bytesToHex(cast.hash)} castAddMessage={cast} />
          )}
        />
      )}
    </div>
  );
}
