import {
  FarcasterNetwork,
  FrameActionBody,
  FrameActionMessage,
  Message,
  NobleEd25519Signer,
  makeFrameAction,
} from "@farcaster/core";
import { bytesToHex } from "viem";

export async function createFrameMessage({
  signerHex,
  inputs,
  fid,
}: {
  fid: number;
  signerHex: `0x${string}`;
  inputs: FrameActionBody;
}): Promise<{
  untrustedData: {
    fid: number;
    url: FrameActionMessage;
    messageHash: string;
    timestamp: number;
    network: number;
    buttonIndex: number;
    castId: {
      fid: number;
      hash: `0x${string}`;
    };
    inputText: string;
    address: `0x${string}`;
    transactionId: `0x${string}`;
    state: string;
  };
  trustedData: {
    messageBytes: string;
  };
}> {
  const signer = new NobleEd25519Signer(Buffer.from(signerHex.slice(2), "hex"));

  const messageResult = await makeFrameAction(
    FrameActionBody.create(inputs),
    { fid: fid, network: FarcasterNetwork.MAINNET },
    signer
  );

  const message = messageResult.unwrapOr(null);

  if (!message) {
    if (messageResult.isErr()) console.error(messageResult.error);
    throw new Error("Failed to create message");
  }

  const trustedBytes = Buffer.from(Message.encode(message).finish()).toString(
    "hex"
  );

  const body = {
    untrustedData: {
      fid: fid,
      url: message,
      messageHash: `0x${Buffer.from(message.hash).toString("hex")}`,
      timestamp: message.data.timestamp,
      network: 1,
      buttonIndex: Number(message.data.frameActionBody.buttonIndex),
      castId: {
        fid: message.data.frameActionBody.castId!.fid,
        hash: bytesToHex(message.data.frameActionBody.castId!.hash),
      },
      inputText: Buffer.from(message.data.frameActionBody.inputText).toString(
        "utf-8"
      ),
      address: bytesToHex(message.data.frameActionBody.address),
      transactionId: bytesToHex(message.data.frameActionBody.transactionId),
      state: Buffer.from(message.data.frameActionBody.inputText).toString(
        "utf-8"
      ),
    },
    trustedData: {
      messageBytes: trustedBytes,
    },
  };

  return body;
}
