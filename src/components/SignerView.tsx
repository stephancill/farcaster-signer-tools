import { UserDataType } from "@farcaster/hub-web";
import { signerMessagesToString, timeAgo, truncateAddress } from "../app/utils";
import { useBackfillData } from "../context/backfillContext";

export function SignerView({ signer }: { signer: string }) {
  const { messagesBySigner, data, signersByFid } = useBackfillData();

  return (
    <div>
      <div className="flex gap-1 items-center">
        {signersByFid?.signerToFid[signer] &&
          data?.signerProfiles[signersByFid?.signerToFid[signer]]?.[
            UserDataType.PFP
          ] && (
            <img
              src={
                data?.signerProfiles[signersByFid?.signerToFid[signer]]?.[
                  UserDataType.PFP
                ]
              }
              className="w-4 h-4 rounded-full"
              alt={`Profile picture for ${signer}`}
            />
          )}
        <pre>{truncateAddress(signer)}</pre>
      </div>
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
            : "new"}
        </div>
      </div>
    </div>
  );
}
