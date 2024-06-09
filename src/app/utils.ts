import {
  FidRequest,
  Message,
  UserDataType,
  fromFarcasterTime,
  isUserDataAddMessage,
} from "@farcaster/hub-web";
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

  return {
    casts: await getAllCastsByFid(fid),
    reactions: await getAllReactionsByFid(fid),
    links: await getAllLinksByFid(fid),
    userData,
    userDataAggregated: aggregateUserData(userData),
    verifications: verifications,
    signers,
    signerProfiles,
  };
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
