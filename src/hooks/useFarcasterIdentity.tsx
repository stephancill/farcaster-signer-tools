"use client";

import { Reducer, useCallback, useEffect, useReducer, useState } from "react";
import { LOCALSTORAGE_KEYS as LOCAL_STORAGE_KEYS } from "../app/const";
import * as ed from "@noble/ed25519";
import { bytesToHex } from "viem";

interface SignedKeyRequest {
  deeplinkUrl: string;
  isSponsored: boolean;
  key: string;
  requestFid: number;
  state: string;
  token: string;
  userFid: number;
  signerUser?: object;
  signerUserMetadata?: object;
}

type FarcasterSignerPendingApproval = {
  status: "pending_approval";
  deadline: number;
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
  requestFid: number;
  requestSigner: string;
  signature: string;
  signerApprovalUrl: string;
  token: string;
};

type FarcasterSignerApproved = {
  status: "approved";
  fid: number;
  privateKey: `0x${string}`;
  publicKey: `0x${string}`;
};

export type StoredIdentity = (
  | FarcasterSignerPendingApproval
  | (FarcasterSignerApproved & { signedKeyRequest: SignedKeyRequest })
) & { _id: number };

type State = {
  activeIdentity: StoredIdentity | null;
  identities: StoredIdentity[];
};

type Action =
  | { type: "SELECT_IDENTITY"; _id: number }
  | { type: "LOGOUT" }
  | { type: "REMOVE" }
  | {
      type: "START_FARCASTER_SIGN_IN";
      publicKey: `0x${string}`;
      privateKey: `0x${string}`;
      deadline: number;
      token: string;
      signerApprovalUrl: string;
      requestFid: number;
      requestSigner: string;
      signature: string;
    }
  | {
      type: "FARCASTER_SIGN_IN_SUCCESS";
      signedKeyRequest: SignedKeyRequest;
    };

export function convertKeypairToHex({
  privateKeyBytes,
  publicKeyBytes,
}: {
  privateKeyBytes: Uint8Array;
  publicKeyBytes: Uint8Array;
}): {
  publicKey: `0x${string}`;
  privateKey: `0x${string}`;
} {
  return {
    publicKey: bytesToHex(publicKeyBytes),
    privateKey: bytesToHex(privateKeyBytes),
  };
}

export async function createKeypairEDDSA(): Promise<{
  publicKeyBytes: Uint8Array;
  privateKeyBytes: Uint8Array;
}> {
  // store this securely!
  const privateKeyBytes = ed.utils.randomPrivateKey();
  const publicKeyBytes = await ed.getPublicKeyAsync(privateKeyBytes);

  return {
    privateKeyBytes,
    publicKeyBytes,
  };
}

const identityReducer: Reducer<State, Action> = (state, action) => {
  switch (action.type) {
    case "SELECT_IDENTITY": {
      const activeIdentity =
        state.identities.find((identity) => identity._id === action._id) ??
        null;

      return {
        ...state,
        activeIdentity,
      };
    }
    case "LOGOUT": {
      return {
        activeIdentity: null,
        identities: state.identities,
      };
    }
    case "REMOVE": {
      const { activeIdentity } = state;

      if (!activeIdentity) {
        return state;
      }

      return {
        activeIdentity: null,
        identities: state.identities.filter(
          (identity) => identity._id !== activeIdentity._id
        ),
      };
    }
    case "START_FARCASTER_SIGN_IN": {
      const _id = Date.now();
      const identity: StoredIdentity = {
        _id,
        status: "pending_approval",
        privateKey: action.privateKey,
        publicKey: action.publicKey,
        token: action.token,
        deadline: action.deadline,
        signerApprovalUrl: action.signerApprovalUrl,
        requestFid: action.requestFid,
        requestSigner: action.requestSigner,
        signature: action.signature,
      };

      const identities = [
        ...state.identities.filter(
          (identity) => identity.status !== "pending_approval"
        ),
        identity,
      ];

      return {
        activeIdentity: identity,
        identities: identities,
      };
    }
    case "FARCASTER_SIGN_IN_SUCCESS": {
      const { activeIdentity } = state;

      if (activeIdentity?.status !== "pending_approval") {
        console.warn(
          "Active identity must be selected and be in pending_approval status to be approved"
        );

        return state;
      }

      const updatedActiveIdentity: StoredIdentity = {
        ...activeIdentity,
        status: "approved",
        fid: action.signedKeyRequest.userFid,
        signedKeyRequest: action.signedKeyRequest,
      };

      return {
        activeIdentity: updatedActiveIdentity,
        identities: state.identities.map((identity) => {
          if (identity._id === activeIdentity._id) {
            return updatedActiveIdentity;
          }

          return identity;
        }),
      };
    }
    default:
      return state;
  }
};

function getSignerFromLocalStorage(): State {
  if (typeof window !== "undefined") {
    const storedData = localStorage.getItem(LOCAL_STORAGE_KEYS.SIGNERS);

    if (storedData) {
      const state: State = JSON.parse(storedData);

      const stateWithoutExpiredPendingApprovals: State = {
        activeIdentity: state.activeIdentity,
        identities: state.identities.filter(
          (signer) =>
            signer.status !== "pending_approval" ||
            (signer.deadline && signer.deadline > Math.floor(Date.now() / 1000))
        ),
      };

      if (stateWithoutExpiredPendingApprovals.activeIdentity) {
        if (
          !stateWithoutExpiredPendingApprovals.identities.some(
            (identity) =>
              identity._id ===
              stateWithoutExpiredPendingApprovals.activeIdentity?._id
          )
        ) {
          stateWithoutExpiredPendingApprovals.activeIdentity = null;
        }
      }

      return stateWithoutExpiredPendingApprovals;
    }

    return { activeIdentity: null, identities: [] };
  }

  return { activeIdentity: null, identities: [] };
}

export function useFarcasterIdentity(): {
  signer: StoredIdentity | null;
  hasSigner: boolean;
  onCreateSignerPress: () => Promise<void>;
  logout: () => void;
  removeIdentity: () => void;
  identities: StoredIdentity[];
  selectIdentity: (id: number) => void;
  isLoadingSigner: boolean;
} {
  const [isLoading, setLoading] = useState(false);
  const [state, dispatch] = useReducer(identityReducer, {}, () =>
    getSignerFromLocalStorage()
  );

  const createFarcasterSigner = useCallback(async () => {
    try {
      const keypair = await createKeypairEDDSA();
      const keypairString = convertKeypairToHex(keypair);
      const authorizationResponse = await fetch(
        // real signer or local one are handled by local route so we don't need to expose anything to client side bundle
        "/signer",
        {
          method: "POST",
          body: JSON.stringify({
            publicKey: keypairString.publicKey,
          }),
        }
      );
      const authorizationBody:
        | {
            signature: string;
            requestFid: string;
            deadline: number;
            requestSigner: string;
          }
        | { code: number; message: string } =
        await authorizationResponse.json();
      if (authorizationResponse.status === 200) {
        const { signature, requestFid, deadline, requestSigner } =
          authorizationBody as {
            signature: string;
            requestFid: string;
            deadline: number;
            requestSigner: string;
          };

        const {
          result: { signedKeyRequest },
        } = (await (
          await fetch(`https://api.warpcast.com/v2/signed-key-requests`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              key: keypairString.publicKey,
              signature,
              requestFid,
              deadline,
            }),
          })
        ).json()) as {
          result: { signedKeyRequest: { token: string; deeplinkUrl: string } };
        };

        // this deeplink works only on iOS, make sure it works on android too by using app link
        const deepLinkUrl = new URL(signedKeyRequest.deeplinkUrl);
        const signedKeyRequestToken = deepLinkUrl.searchParams.get("token");
        const signerApprovalUrl = new URL(
          "https://client.warpcast.com/deeplinks/signed-key-request"
        );

        if (!signedKeyRequestToken) {
          throw new Error("No token found in the deep link URL");
        }

        signerApprovalUrl.searchParams.set("token", signedKeyRequestToken);

        dispatch({
          type: "START_FARCASTER_SIGN_IN",
          publicKey: keypairString.publicKey,
          privateKey: keypairString.privateKey,
          deadline,
          token: signedKeyRequest.token,
          signerApprovalUrl: signerApprovalUrl.toString(),
          requestFid: parseInt(requestFid, 10),
          requestSigner,
          signature,
        });
      } else if (
        (authorizationBody as { code: number; message: string }).code === 1
      ) {
        window.alert(
          (authorizationBody as { code: number; message: string }).message
        );
      }
    } catch (error) {
      console.error("frames.js: API Call failed", error);
    }
  }, [dispatch]);

  const onCreateSignerPress = useCallback(async () => {
    setLoading(true);
    await createFarcasterSigner();
    setLoading(false);
  }, [createFarcasterSigner]);

  const logout = useCallback(() => {
    dispatch({ type: "LOGOUT" });
  }, [dispatch]);

  const removeIdentity = useCallback(() => {
    dispatch({ type: "REMOVE" });
  }, [dispatch]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.SIGNERS, JSON.stringify(state));
  }, [state]);

  const farcasterUser = state.activeIdentity;

  useEffect(() => {
    if (farcasterUser && farcasterUser.status === "pending_approval") {
      let intervalId: any;

      const startPolling = () => {
        intervalId = setInterval(async () => {
          try {
            const fcSignerRequestResponse = await fetch(
              `https://api.warpcast.com/v2/signed-key-request?token=${farcasterUser.token}`,
              {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              }
            );
            const responseBody = (await fcSignerRequestResponse.json()) as {
              result: { signedKeyRequest: SignedKeyRequest };
            };
            if (responseBody.result.signedKeyRequest.state !== "completed") {
              throw new Error("hasnt succeeded yet");
            }

            dispatch({
              type: "FARCASTER_SIGN_IN_SUCCESS",
              signedKeyRequest: responseBody.result.signedKeyRequest,
            });

            clearInterval(intervalId);
          } catch (error) {
            console.info(error);
          }
        }, 2000);
      };

      const stopPolling = () => {
        clearInterval(intervalId);
      };

      const handleVisibilityChange = () => {
        if (document.hidden) {
          stopPolling();
        } else {
          startPolling();
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Start the polling when the effect runs.
      startPolling();

      // Cleanup function to remove the event listener and clear interval.
      return () => {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
        clearInterval(intervalId);
      };
    }
  }, [farcasterUser]);

  const selectIdentity = useCallback(
    (id: number) => {
      dispatch({ type: "SELECT_IDENTITY", _id: id });
    },
    [dispatch]
  );

  return {
    signer: farcasterUser,
    hasSigner: farcasterUser?.status === "approved",
    isLoadingSigner: isLoading,
    onCreateSignerPress,
    logout,
    removeIdentity,
    identities: state.identities,
    selectIdentity,
  };
}
