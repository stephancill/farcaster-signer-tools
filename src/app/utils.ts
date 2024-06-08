import {
  FidRequest,
  Message,
  UserDataType,
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

    // Onchain events
    // registrations: getAllRegistrationsByFid(_fid),
    // storage: getAllStorageByFid(_fid),
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
