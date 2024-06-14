import {
  CastId,
  FidRequest,
  HashScheme,
  Message,
  MessageData,
  NobleEd25519Signer,
  UserDataType,
  base58ToBytes,
  bytesToBase58,
  bytesToHexString,
  fromFarcasterTime,
  isUserDataAddMessage,
} from "@farcaster/hub-web";
import { bytesToHex, hexToBytes } from "viem";
import {
  getAllCastsByFid,
  getAllLinksByFid,
  getAllMessagesFromHubEndpoint,
  getAllReactionsByFid,
  getAllSignersByFid,
} from "./paginate";
import { blake3 } from "@noble/hashes/blake3";
import { BackfillContextType } from "../context/backfillContext";
import { SerializedMessagesArchive } from "./types";

export const MAX_PAGE_SIZE = 1_000;

/**
 * Index all messages from a profile
 * @param fid Farcaster ID
 */
export async function getFullProfileFromHub(
  _fid: number,
  {
    hubUrl,
    onProgress,
  }: { hubUrl: string; onProgress?: (message: string) => void }
) {
  const fid = FidRequest.create({ fid: _fid });

  onProgress?.("Fetching verifications...");

  const verifications = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/verificationsByFid",
    fid: fid.fid,
    hubUrl,
  });

  onProgress?.("Fetching signers...");

  const signers = await getAllSignersByFid(fid, { hubUrl });

  onProgress?.("Fetching user data...");

  const userData = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/userDataByFid",
    fid: fid.fid,
    hubUrl,
  });

  const signerFidsUnique = Array.from(
    new Set(
      signers.map(
        (s) => (s as { metadata: { requestFid: number } }).metadata.requestFid
      )
    )
  );

  onProgress?.("Fetching signera app profiles...");

  const signerProfiles: Record<
    string,
    Awaited<ReturnType<typeof getUserData>>
  > = {};
  for (const signerFid of signerFidsUnique) {
    signerProfiles[signerFid.toString()] = await getUserData(signerFid, {
      hubUrl,
    });
  }

  onProgress?.("Fetching casts...");
  const casts = await getAllCastsByFid(fid, { hubUrl });

  onProgress?.("Fetching reactions...");
  const reactions = await getAllReactionsByFid(fid, { hubUrl });

  onProgress?.("Fetching links...");
  const links = await getAllLinksByFid(fid, { hubUrl });

  const result = {
    casts,
    reactions,
    links,
    userData,
    userDataAggregated: aggregateUserData(userData),
    verifications: verifications,
    signers,
    signerProfiles,
  };

  return result;
}

function aggregateUserData(messagesJson: unknown[]) {
  return messagesJson.reduce(
    (acc: Partial<Record<UserDataType, string>>, messageJson) => {
      const decodedMessage = Message.fromJSON(messageJson);

      if (!isUserDataAddMessage(decodedMessage)) {
        return acc;
      }

      return {
        ...acc,
        [decodedMessage.data.userDataBody.type]:
          decodedMessage.data.userDataBody.value,
      };
    },
    {} as Partial<Record<UserDataType, string>>
  );
}

async function getUserData(fid: number, { hubUrl }: { hubUrl: string }) {
  const userData = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/userDataByFid",
    fid,
    hubUrl,
  });

  return aggregateUserData(userData);
}

export type UserDataAggType = ReturnType<typeof aggregateUserData>;

export function getFullTime(date: Date): string {
  const fullDate = new Intl.DateTimeFormat("en-gb", {
    hour: "numeric",
    minute: "numeric",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);

  let splittedDate = fullDate.split(", ");

  // Safari workaround
  if (splittedDate.length === 1) splittedDate = fullDate.split(" at ");

  const formattedDate =
    splittedDate.length === 2
      ? [...splittedDate].reverse().join(" · ")
      : [splittedDate.slice(0, 2).join(", "), splittedDate.slice(-1)]
          .reverse()
          .join(" · ");

  return formattedDate;
}

export function timeAgo(date: Date) {
  var seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  var interval = seconds / 31536000;

  if (interval > 1) {
    const years = Math.floor(interval);
    return years + " year" + (years !== 1 ? "s" : "");
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    const months = Math.floor(interval);
    return months + " month" + (months !== 1 ? "s" : "");
  }
  interval = seconds / 86400;
  if (interval > 1) {
    const days = Math.floor(interval);
    return days + " day" + (days !== 1 ? "s" : "");
  }
  interval = seconds / 3600;
  if (interval > 1) {
    const hours = Math.floor(interval);
    return hours + " hour" + (hours !== 1 ? "s" : "");
  }
  interval = seconds / 60;
  if (interval > 1) {
    const minutes = Math.floor(interval);
    return minutes + " minute" + (minutes !== 1 ? "s" : "");
  }
  const sec = Math.floor(seconds);
  return sec + " second" + (sec !== 1 ? "s" : "");
}

export function farcasterTimeToDate(time: number): Date {
  const result = fromFarcasterTime(time);
  if (result.isErr()) throw result.error;
  return new Date(result.value);
}

export function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function signerMessagesToString(obj: any) {
  return `${(obj?.casts || []).length.toLocaleString()} casts • ${(
    obj?.reactions || []
  ).length.toLocaleString()} reactions • ${(
    obj?.links || []
  ).length.toLocaleString()} links • ${(
    obj?.verifications || []
  ).length.toLocaleString()} verifications`;
}

export function castIdToUrl({ hash }: CastId) {
  return `https://warpcast.com/~/conversations/${bytesToHex(hash)}`;
}

export function downloadJsonFile(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function signMessageData(
  messageData: MessageData,
  privateKey: `0x${string}`
) {
  const signer = new NobleEd25519Signer(hexToBytes(privateKey));

  const dataBytes = MessageData.encode(messageData).finish();

  const hash = blake3(dataBytes, { dkLen: 20 });

  const signature = await signer.signMessageHash(hash);
  if (signature.isErr()) return null;

  const signerKey = await signer.getSignerKey();
  if (signerKey.isErr()) return null;

  const message = Message.create({
    data: messageData,
    hash,
    hashScheme: HashScheme.BLAKE3,
    signature: signature.value,
    signatureScheme: signer.scheme,
    signer: signerKey.value,
  });

  return message;
}

export async function submitMessage(
  message: Message,
  { hubUrl }: { hubUrl: string }
) {
  const messageBytes = Buffer.from(Message.encode(message).finish());

  const submitMessageResponse = await fetch(`${hubUrl}/v1/submitMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
    },
    body: messageBytes,
  });

  return submitMessageResponse;
}

export function handleBackup(
  signer: string,
  { messagesBySigner, data, signersByFid }: BackfillContextType
) {
  try {
    const messages = messagesBySigner?.[signer];
    const fid = signersByFid?.signerToFid[signer];

    if (!messages) {
      console.error("No messages found for signer", signer);
      return;
    }

    const messagesJson = {} as SerializedMessagesArchive;

    for (const key of [
      "casts",
      "reactions",
      "links",
      "verifications",
      "userData",
    ] as const) {
      messagesJson[key] = messages[key].map((m) => Message.toJSON(m));
    }

    messagesJson["signerPubKeys"] = [signer];

    downloadJsonFile(
      `fsm-backup-${new Date().toISOString()}-${
        data?.signerProfiles[fid!][UserDataType.USERNAME]
      }-${signer}.json`,
      messagesJson
    );
  } catch (error) {
    console.error(error);
    alert("Error backing up messages");
  }
}

// Map of current key names to old key names that we want to preserve for backwards compatibility reasons
// If you are renaming a protobuf field, add the current name as the key, and the old name as the value, and we
// will copy the contents of the current field to the old field
const BACKWARDS_COMPATIBILITY_MAP: Record<string, string> = {
  verificationAddAddressBody: "verificationAddEthAddressBody",
  claimSignature: "ethSignature",
};

/**
 * The protobuf format specifies encoding bytes as base64 strings, but we want to return hex strings
 * to be consistent with the rest of the API, so we need to convert the base64 strings to hex strings
 * before returning them.
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function transformHashReverse(objRaw: any): any {
  const obj = structuredClone(objRaw);

  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // These are the target keys that are base64 encoded, which should be converted to hex
  const toHexKeys = [
    "hash",
    "signer",
    "transactionHash",
    "key",
    "owner",
    "to",
    "from",
    "recoveryAddress",
  ];

  // Convert these target keys to strings
  const toStringKeys = ["name"];

  const toHexOrBase58Keys = ["address", "blockHash"];

  for (const key in obj) {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
    if (obj.hasOwnProperty(key)) {
      if (toHexKeys.includes(key) && typeof obj[key] === "string") {
        // obj[key] = convertB64ToHex(obj[key]);
        // Reverse: convert hex to base64
        obj[key] = Buffer.from(obj[key].slice(2), "hex").toString("base64");
      } else if (toStringKeys.includes(key) && typeof obj[key] === "string") {
        // obj[key] = Buffer.from(obj[key], "base64").toString("utf-8");
        // Reverse: convert string to base64
        obj[key] = Buffer.from(obj[key]).toString("base64");
      } else if (
        toHexOrBase58Keys.includes(key) &&
        typeof obj[key] === "string"
      ) {
        // We need to convert solana related bytes to base58
        if (obj["protocol"] === "PROTOCOL_SOLANA") {
          // obj[key] = convertB64ToB58(obj[key]);
          // Reverse: convert base58 to base64
          obj[key] = Buffer.from(
            base58ToBytes(obj[key]).unwrapOr(new Uint8Array())
          ).toString("base64");
        } else {
          // obj[key] = convertB64ToHex(obj[key]);
          // Reverse: convert hex to base64
          obj[key] = Buffer.from(obj[key].slice(2), "hex").toString("base64");
        }
      } else if (typeof obj[key] === "object") {
        obj[key] = transformHashReverse(obj[key]);
      }

      const backwardsCompatibleName = BACKWARDS_COMPATIBILITY_MAP[key];
      if (backwardsCompatibleName) {
        obj[backwardsCompatibleName] = obj[key];
      }
    }
  }

  return obj;
}

/**
 * The protobuf format specifies encoding bytes as base64 strings, but we want to return hex strings
 * to be consistent with the rest of the API, so we need to convert the base64 strings to hex strings
 * before returning them.
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function transformHash(obj: any): any {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // These are the target keys that are base64 encoded, which should be converted to hex
  const toHexKeys = [
    "hash",
    "signer",
    "transactionHash",
    "key",
    "owner",
    "to",
    "from",
    "recoveryAddress",
  ];

  // Convert these target keys to strings
  const toStringKeys = ["name"];

  const toHexOrBase58Keys = ["address", "blockHash"];

  for (const key in obj) {
    // biome-ignore lint/suspicious/noPrototypeBuiltins: <explanation>
    if (obj.hasOwnProperty(key)) {
      if (toHexKeys.includes(key) && typeof obj[key] === "string") {
        obj[key] = convertB64ToHex(obj[key]);
      } else if (toStringKeys.includes(key) && typeof obj[key] === "string") {
        obj[key] = Buffer.from(obj[key], "base64").toString("utf-8");
      } else if (
        toHexOrBase58Keys.includes(key) &&
        typeof obj[key] === "string"
      ) {
        // We need to convert solana related bytes to base58
        if (obj["protocol"] === "PROTOCOL_SOLANA") {
          obj[key] = convertB64ToB58(obj[key]);
        } else {
          obj[key] = convertB64ToHex(obj[key]);
        }
      } else if (typeof obj[key] === "object") {
        transformHash(obj[key]);
      }

      const backwardsCompatibleName = BACKWARDS_COMPATIBILITY_MAP[key];
      if (backwardsCompatibleName) {
        obj[backwardsCompatibleName] = obj[key];
      }
    }
  }

  return obj;
}

export function convertB64ToHex(str: string): string {
  if (str.length === 0) {
    return str;
  }

  try {
    // Try to convert the string from base64 to hex
    const bytesBuf = Buffer.from(str, "base64");

    // Check if the decoded base64 string can be converted back to the original base64 string
    // If it can, return the hex string, otherwise return the original string
    return bytesBuf.toString("base64") === str
      ? bytesToHexString(bytesBuf).unwrapOr("")
      : str;
  } catch {
    // If an error occurs, return the original string
    return str;
  }
}

export function convertB64ToB58(str: string): string {
  try {
    const bytesBuf = Buffer.from(str, "base64");

    // Check if the decoded base64 string can be converted back to the original base64 string
    // If it can, return the base58 string, otherwise return the original string
    return bytesBuf.toString("base64") === str
      ? bytesToBase58(bytesBuf).unwrapOr("")
      : str;
  } catch {
    // If an error occurs, return the original string
    return str;
  }
}
