"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { AppDetail } from "../components/AppDetail";
import { UserDataView } from "../components/UserDataView";
import {
  DataMessages,
  decodeJsonData,
  useBackfillData,
} from "../context/backfillContext";
import {
  getFullProfileFromHub,
  getFullTime,
  signerMessagesToString,
  timeAgo,
} from "./utils";
import { twMerge } from "tailwind-merge";
import { border } from "../style/common";
import { ActionButton } from "../components/ActionButton";
import { BackButton } from "../components/BackButton";
import { ConnectKitButton } from "connectkit";

export default function Home() {
  const [appFid, setAppFid] = useState<string | null>(null);

  const {
    data: dataRaw,
    isLoading: queryIsLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ["profile", 1689],
    queryFn: async () => getFullProfileFromHub(1689),
  });

  const {
    data,
    messageCountsByFid,
    signersByFid,
    lastUsedByFid,
    isLoading: processingIsLoading,
  } = useBackfillData(dataRaw);

  const [importedData, setImportedData] = useState<DataMessages | null>(null);

  const fidToSignerSorted = useMemo(() => {
    if (!signersByFid) return;
    return Object.entries(signersByFid.fidToSigner).sort(
      ([fidA], [fidB]) =>
        (lastUsedByFid?.[fidB] || new Date(0)).getTime() -
        (lastUsedByFid?.[fidA] || new Date(0)).getTime()
    );
  }, [data]);

  const inputFile = useRef<HTMLInputElement>(null);

  if (queryIsLoading)
    return <div>{process.env.NEXT_PUBLIC_HUB_REST_URL} Loading...</div>;

  if (processingIsLoading) return <div>Processing...</div>;

  if (isError || !data || !signersByFid || !fidToSignerSorted) {
    return (
      <div>Error {error instanceof Error && error.message + error.stack}</div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <UserDataView data={data.userDataAggregated} />
        <div className="text-gray-500">{signerMessagesToString(data)}</div>
        <div className="flex gap-2">
          <input
            type="file"
            id="file"
            ref={inputFile}
            style={{ display: "none" }}
            accept="application/json"
            onChange={(e) => {
              const files = e.target?.files;
              if (files && files[0]) {
                const file = files[0];
                var reader = new FileReader();
                reader.readAsText(file, "UTF-8");
                reader.onload = function (evt) {
                  if (evt.target?.result) {
                    if (typeof evt.target.result === "string") {
                      const json = JSON.parse(evt.target.result);
                      setImportedData(decodeJsonData(json));
                    }
                  }
                };
                reader.onerror = function (evt) {
                  console.error(`Error loading file`);
                  alert("Error loading file");
                };
              }
            }}
          />
          <ActionButton onClick={() => inputFile.current?.click()}>
            Import
          </ActionButton>
          <ConnectKitButton></ConnectKitButton>
        </div>
      </div>

      {importedData ? (
        <div>
          <BackButton
            onBack={() => {
              setImportedData(null);
            }}
          />
          <div>Imported signer</div>
          <div className="text-gray-500">
            {signerMessagesToString(importedData)}
          </div>
        </div>
      ) : appFid ? (
        <div>
          <AppDetail fid={appFid} onBack={() => setAppFid(null)}></AppDetail>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {fidToSignerSorted!.map(([fid, signers], i) => (
            <button key={fid}>
              <div
                className={twMerge(
                  "p-2 w-full h-full text-left flex flex-col gap-2",
                  border
                )}
                onClick={() => setAppFid(fid)}
              >
                <UserDataView data={data.signerProfiles[fid]} />
                <div>
                  {messageCountsByFid?.[fid] && (
                    <div>
                      <div>
                        {messageCountsByFid?.[fid].total.toLocaleString()}{" "}
                        messages
                      </div>
                      <div>
                        - {messageCountsByFid?.[fid].casts.toLocaleString()}{" "}
                        casts
                      </div>
                      <div>
                        - {messageCountsByFid?.[fid].reactions.toLocaleString()}{" "}
                        reactions
                      </div>
                      <div>
                        - {messageCountsByFid?.[fid].links.toLocaleString()}{" "}
                        links
                      </div>
                      <div>
                        -{" "}
                        {messageCountsByFid?.[
                          fid
                        ].verifications.toLocaleString()}{" "}
                        verifications
                      </div>
                    </div>
                  )}
                </div>
                <div className="w-full text-right mt-auto">
                  <div>{`${signers.length} signers`}</div>
                  <div className="text-gray-500">
                    {lastUsedByFid?.[fid] ? (
                      <div title={getFullTime(lastUsedByFid?.[fid])}>
                        Last used {timeAgo(lastUsedByFid?.[fid])} ago
                      </div>
                    ) : (
                      <div>Never used</div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
