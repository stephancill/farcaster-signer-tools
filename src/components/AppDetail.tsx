import { Message, UserDataType } from "@farcaster/hub-web";
import { useBackfillData } from "../context/backfillContext";
import { UserDataView } from "./UserDataView";
import {
  downloadJsonFile,
  signerMessagesToString,
  timeAgo,
  truncateAddress,
} from "../app/utils";
import { useState } from "react";
import { SignerDetail } from "./SignerDetail";
import { BackButton } from "./BackButton";
import { twMerge } from "tailwind-merge";
import { border } from "../style/common";
import { ActionButton } from "./ActionButton";
import { useSendTransaction } from "wagmi";

export function AppDetail({
  fid,
  onBack,
}: {
  fid: string;
  onBack: () => void;
}) {
  const [selectedSigner, setSelectedSigner] = useState<string | null>(null);
  const { data, messagesBySigner, signersByFid } = useBackfillData();

  const { data: hash, sendTransaction } = useSendTransaction();

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

      downloadJsonFile(
        `fsm-backup-${new Date().toISOString()}-${
          data?.signerProfiles[fid][UserDataType.USERNAME]
        }-${signer}.json`,
        messagesJson
      );
    } catch (error) {
      console.error(error);
      alert("Error backing up messages");
    }
  }

  function handleBackupAll() {
    try {
      const allMessagesJson = {} as Record<string, unknown[]>;

      for (const signer of signersByFid?.fidToSigner?.[fid] || []) {
        const messages = messagesBySigner?.[signer];

        if (!messages) {
          console.error("No messages found for signer", signer);
          continue;
        }

        for (const key of [
          "casts",
          "reactions",
          "links",
          "verifications",
          "userData",
        ] as const) {
          allMessagesJson[key] = [
            ...(allMessagesJson[key] || []),
            ...messages[key].map((m) => Message.toJSON(m)),
          ];
        }
      }

      downloadJsonFile(
        `fsm-backup-${new Date().toISOString()}-${
          data?.signerProfiles[fid][UserDataType.USERNAME]
        }-all.json`,
        allMessagesJson
      );
    } catch (error) {
      console.error(error);
      alert("Error backing up messages");
    }
  }

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} />
      <UserDataView data={data!.signerProfiles[fid]} />
      {selectedSigner ? (
        <div className="md:ml-10">
          <SignerDetail
            appFid={fid}
            signer={selectedSigner}
            handleBackup={handleBackup}
            onBack={() => setSelectedSigner(null)}
          />
        </div>
      ) : (
        <div>
          <div className="flex gap-2 mb-4">
            <ActionButton onClick={() => handleBackupAll()}>
              Consolidate & Backup All
            </ActionButton>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {signersByFid?.fidToSigner?.[fid]
              .sort(
                (signerA, signerB) =>
                  (
                    messagesBySigner?.[signerB]?.lastUsed || new Date(0)
                  ).getTime() -
                  (
                    messagesBySigner?.[signerA]?.lastUsed || new Date(0)
                  ).getTime()
              )
              .map((signer) => (
                <button
                  key={signer}
                  className={twMerge("text-left p-2 space-y-2", border)}
                  onClick={() => setSelectedSigner(signer)}
                >
                  <pre className="mb-2">{truncateAddress(signer)}</pre>
                  <div className="text-gray-500">
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
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
