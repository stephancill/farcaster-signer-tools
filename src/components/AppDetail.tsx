import { Message, UserDataType } from "@farcaster/hub-web";
import { useBackfillData } from "../context/backfillContext";
import { UserAccount } from "./UserData";
import { signerMessagesToString, timeAgo, truncateAddress } from "../app/utils";
import { useState } from "react";
import { SignerDetail } from "./SignerDetail";
import { BackButton } from "./BackButton";
import { twMerge } from "tailwind-merge";
import { border } from "../style/common";

export function AppDetail({
  fid,
  onBack,
}: {
  fid: string;
  onBack: () => void;
}) {
  const [selectedSigner, setSelectedSigner] = useState<string | null>(null);
  const { data, messagesBySigner, signersByFid } = useBackfillData();

  function handleBackup(signer: string) {
    try {
      const messages = messagesBySigner?.[signer];

      if (!messages) {
        console.error("No messages found for signer", signer);
        return;
      }

      const messagesJson = {} as Record<string, unknown[]>;

      for (const key of [
        "casts",
        "reactions",
        "links",
        "verifications",
        "userData",
      ] as const) {
        messagesJson[key] = messages[key].map((m) => Message.toJSON(m));
      }

      const blob = new Blob([JSON.stringify(messagesJson)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `fsm-backup-${
          data?.signerProfiles[fid][UserDataType.USERNAME]
        }-${signer}-${new Date().toISOString()}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <div className="space-y-2">
      <BackButton onBack={onBack} />
      <UserAccount data={data!.signerProfiles[fid]} />
      {selectedSigner ? (
        <div className="ml-10">
          <SignerDetail
            appFid={fid}
            signer={selectedSigner}
            handleBackup={handleBackup}
            onBack={() => setSelectedSigner(null)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {signersByFid?.fidToSigner?.[fid]
            .sort(
              (signerA, signerB) =>
                (
                  messagesBySigner?.[signerB]?.lastUsed || new Date(0)
                ).getTime() -
                (messagesBySigner?.[signerA]?.lastUsed || new Date(0)).getTime()
            )
            .map((signer) => (
              <button
                key={signer}
                className={twMerge("text-left p-2", border)}
                onClick={() => setSelectedSigner(signer)}
              >
                <pre className="mb-2">{truncateAddress(signer)}</pre>
                <div>
                  <div>
                    {signerMessagesToString(messagesBySigner?.[signer])}
                  </div>
                  <div className="flex flex-col">
                    <div>
                      Last used:{" "}
                      {messagesBySigner?.[signer]?.lastUsed
                        ? `${timeAgo(
                            messagesBySigner?.[signer]?.lastUsed!
                          )} ago`
                        : "never"}
                    </div>
                    <div>
                      Created:{" "}
                      {messagesBySigner?.[signer]?.createdAt
                        ? `${timeAgo(
                            messagesBySigner?.[signer]?.createdAt!
                          )} ago`
                        : "(this shouldn't happen)"}
                    </div>
                  </div>

                  <button
                    className="p-2 border border-black"
                    onClick={() => handleBackup(signer)}
                  >
                    Backup
                  </button>
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
