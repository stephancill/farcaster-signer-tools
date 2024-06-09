import {
  CastId,
  FidRequest,
  Message,
  UserDataType,
  base58ToBytes,
  fromFarcasterTime,
  isUserDataAddMessage,
} from "@farcaster/hub-web";
import { bytesToHex } from "viem";
import {
  getAllCastsByFid,
  getAllLinksByFid,
  getAllMessagesFromHubEndpoint,
  getAllReactionsByFid,
  getAllSignersByFid,
} from "./paginate";

export const MAX_PAGE_SIZE = 1_000;

/**
 * Index all messages from a profile
 * @param fid Farcaster ID
 */
export async function getFullProfileFromHub(_fid: number) {
  const fid = FidRequest.create({ fid: _fid });

  const verifications = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/verificationsByFid",
    fid: fid.fid,
  });

  const signers = await getAllSignersByFid(fid);

  const userData = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/userDataByFid",
    fid: fid.fid,
  });

  const signerFidsUnique = Array.from(
    new Set(
      signers.map(
        (s) => (s as { metadata: { requestFid: number } }).metadata.requestFid
      )
    )
  );

  const signerProfiles: Record<
    string,
    Awaited<ReturnType<typeof getUserData>>
  > = {};
  for (const signerFid of signerFidsUnique) {
    signerProfiles[signerFid.toString()] = await getUserData(signerFid);
  }

  const result = {
    casts: await getAllCastsByFid(fid),
    reactions: await getAllReactionsByFid(fid),
    links: await getAllLinksByFid(fid),
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

async function getUserData(fid: number) {
  const userData = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/userDataByFid",
    fid,
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
  return `${obj.casts.length.toLocaleString()} casts • ${obj.reactions.length.toLocaleString()} reactions • ${obj.links.length.toLocaleString()} links • ${obj.verifications.length.toLocaleString()} verifications`;
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

/**
 * The protobuf format specifies encoding bytes as base64 strings, but we want to return hex strings
 * to be consistent with the rest of the API, so we need to convert the base64 strings to hex strings
 * before returning them.
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function transformHashReverse(objRaw: any): any {
  const obj = structuredClone(objRaw);
  // Map of current key names to old key names that we want to preserve for backwards compatibility reasons
  // If you are renaming a protobuf field, add the current name as the key, and the old name as the value, and we
  // will copy the contents of the current field to the old field
  const BACKWARDS_COMPATIBILITY_MAP: Record<string, string> = {
    verificationAddAddressBody: "verificationAddEthAddressBody",
    claimSignature: "ethSignature",
  };

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
