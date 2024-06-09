import { useState } from "react";
import { isCastAddMessage } from "@farcaster/hub-web";
import { bytesToHex } from "viem";
import { signerMessagesToString, timeAgo, truncateAddress } from "../app/utils";
import { useBackfillData } from "../context/backfillContext";
import { BackButton } from "./BackButton";
import { CastView } from "./CastView";
import { PaginatedGrid } from "./PaginatedGrid";

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

  const casts = messagesBySigner?.[signer].casts.filter(isCastAddMessage) || [];
  return (
    <div key={signer} className="text-left space-y-2">
      <BackButton onBack={onBack} />
      <pre>{truncateAddress(signer)}</pre>
      <div>
        <div>{signerMessagesToString(messagesBySigner?.[signer])}</div>
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
      </div>
      <button
        className="p-2 border border-black"
        onClick={() => handleBackup(signer)}
      >
        Backup
      </button>
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
