import { Message, UserDataType } from "@farcaster/hub-web";
import { useNavigate, useParams } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { SerializedMessagesArchive } from "../app/types";
import { downloadJsonFile } from "../app/utils";
import { useBackfillData } from "../context/backfillContext";
import { border } from "../style/common";
import { ActionButton } from "./ActionButton";
import { BackButton } from "./BackButton";
import { SignerView } from "./SignerView";
import { UserDataView } from "./UserDataView";

export function AppDetail() {
  const navigate = useNavigate();
  const { fid } = useParams<{ fid: string }>();

  const { data, messagesBySigner, signersByFid } = useBackfillData();

  function handleBackupAll() {
    try {
      const allMessagesJson = {} as SerializedMessagesArchive;

      const backedUpSigners: string[] = [];

      for (const signer of signersByFid?.fidToSigner?.[fid!] || []) {
        const messages = messagesBySigner?.[signer];

        if (!messages) {
          console.error("No messages found for signer", signer);
          continue;
        }

        let totalMessagesFromSigner = 0;

        for (const key of [
          "casts",
          "reactions",
          "links",
          "verifications",
          "userData",
        ] as const) {
          const messagesToAppend = messages[key].map((m) => Message.toJSON(m));
          allMessagesJson[key] = [
            ...(allMessagesJson[key] || []),
            ...messagesToAppend,
          ];
          totalMessagesFromSigner += messagesToAppend.length;
        }

        if (totalMessagesFromSigner > 0) {
          backedUpSigners.push(signer);
        }
      }

      allMessagesJson["signerPubKeys"] = backedUpSigners;

      downloadJsonFile(
        `fsm-backup-${new Date().toISOString()}-${
          data?.signerProfiles[fid!][UserDataType.USERNAME]
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
      <BackButton />
      <UserDataView data={data!.signerProfiles[fid!]} />
      <div>
        <div className="flex gap-2 mb-4">
          <ActionButton onClick={() => handleBackupAll()}>
            Consolidate & Backup All
          </ActionButton>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {signersByFid?.fidToSigner?.[fid!]
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
                className={twMerge("text-left p-2 space-y-2", border)}
                onClick={() => navigate(`/app/${fid}/${signer}`)}
              >
                <SignerView signer={signer} />
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
