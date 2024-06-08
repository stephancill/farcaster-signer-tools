import { FidRequest, OnChainEvent, SignerEventType } from "@farcaster/hub-web";

import { bytesToHex, decodeAbiParameters } from "viem";
import { MAX_PAGE_SIZE } from "./utils";

export const signedKeyRequestAbi = [
  {
    components: [
      {
        name: "requestFid",
        type: "uint256",
      },
      {
        name: "requestSigner",
        type: "address",
      },
      {
        name: "signature",
        type: "bytes",
      },
      {
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "SignedKeyRequest",
    type: "tuple",
  },
] as const;

export async function getAllMessagesFromHubEndpoint({
  endpoint,
  fid,
}: {
  endpoint: string;
  fid: number;
}) {
  const messages: unknown[] = new Array();
  let nextPageToken: string | undefined;

  while (true) {
    const params = new URLSearchParams({
      fid: fid.toString(),
      pageSize: MAX_PAGE_SIZE.toString(),
    });

    if (nextPageToken) {
      params.append("pageToken", nextPageToken);
    }

    const url = `${process.env.NEXT_PUBLIC_HUB_REST_URL}${endpoint}?${params}`;

    const res = await fetch(url);
    const { messages: resMessages, nextPageToken: _nextPageToken } =
      await res.json();

    nextPageToken = _nextPageToken;

    messages.push(...resMessages);

    if (resMessages.length < MAX_PAGE_SIZE) {
      break;
    }
  }

  return messages;
}

export async function getAllCastsByFid(fid: FidRequest) {
  const casts: unknown[] = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/castsByFid",
    fid: fid.fid,
  });

  return casts;
}

export async function getAllReactionsByFid(fid: FidRequest) {
  const reactions: unknown[] = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/reactionsByFid",
    fid: fid.fid,
  });

  return reactions;
}

export async function getAllLinksByFid(fid: FidRequest) {
  const links: unknown[] = await getAllMessagesFromHubEndpoint({
    endpoint: "/v1/linksByFid",
    fid: fid.fid,
  });

  return links;
}

export function decodeSignedKeyRequestMetadata(metadata: Uint8Array) {
  return decodeAbiParameters(signedKeyRequestAbi, bytesToHex(metadata))[0];
}

export async function getAllSignersByFid(fid: FidRequest) {
  const events: unknown[] = new Array();
  let nextPageToken: string | undefined;

  while (true) {
    const params = new URLSearchParams({
      fid: fid.fid.toString(),
      pageSize: MAX_PAGE_SIZE.toString(),
    });

    if (nextPageToken) {
      params.append("pageToken", nextPageToken);
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_HUB_REST_URL}/v1/onChainSignersByFid?${params}`
    );
    const { events: resEvents, ..._nextPageToken } = await res.json();

    nextPageToken = _nextPageToken;

    for (const signerJson of resEvents) {
      const signer = OnChainEvent.fromJSON(signerJson);
      const body = signer.signerEventBody;
      const timestamp = new Date(signer.blockTimestamp * 1000);

      switch (body?.eventType) {
        case SignerEventType.ADD: {
          const signedKeyRequestMetadata = decodeSignedKeyRequestMetadata(
            body.metadata
          );
          const metadataJson = {
            requestFid: Number(signedKeyRequestMetadata.requestFid),
            requestSigner: signedKeyRequestMetadata.requestSigner,
            signature: signedKeyRequestMetadata.signature,
            deadline: Number(signedKeyRequestMetadata.deadline),
          };

          events.push({
            ...signerJson,
            metadata: metadataJson,
          });

          break;
        }
        case SignerEventType.REMOVE: {
          break;
        }
      }
    }

    if (resEvents.length < MAX_PAGE_SIZE) {
      break;
    }
  }

  return events;
}
