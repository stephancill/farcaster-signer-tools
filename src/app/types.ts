import { DataMessages } from "../context/backfillContext";

export type MessagesArchive = DataMessages & {
  signerPubKeys: string[];
};

export type SerializedMessagesArchive = Record<
  keyof DataMessages,
  unknown[]
> & {
  signerPubKeys: string[];
};
