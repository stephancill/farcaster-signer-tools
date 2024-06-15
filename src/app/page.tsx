"use client";

import { useQuery } from "@tanstack/react-query";
import { ConnectKitButton } from "connectkit";
import { useEffect, useMemo, useRef, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { twMerge } from "tailwind-merge";
import { ActionButton } from "../components/ActionButton";
import { AppDetail } from "../components/AppDetail";
import { ImportDetail } from "../components/ImportDetail";
import { UserDataView } from "../components/UserDataView";
import { decodeJsonData, useBackfillData } from "../context/backfillContext";
import { border } from "../style/common";
import { MessagesArchive } from "./types";
import {
  getFullProfileFromHub,
  getFullTime,
  signerMessagesToString,
  timeAgo,
} from "./utils";
import { SignerDetail } from "../components/SignerDetail";
import { BackButton } from "../components/BackButton";
import { DebugPage } from "../components/DebugDetail";
import { useConfig } from "../context/configContext";

export default function Home() {
  const navigate = useNavigate();
  const config = useConfig();
  const { fid, hubUrl, setFid, setHubUrl } = useConfig();
  const [fidRaw, setFidRaw] = useState<string>("");
  const [hubUrlRaw, setHubUrlRaw] = useState<string>("");

  const [progressMessages, setProgressMessages] = useState<string[]>([]);

  const {
    data: dataRaw,
    isLoading: queryIsLoading,
    isFetching,
    error,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["profile", fid, hubUrl],
    queryFn: async () =>
      fid
        ? getFullProfileFromHub(fid, {
            hubUrl,
            onProgress(message) {
              setProgressMessages((prev) => [...prev, message]);
            },
          })
        : undefined,
    enabled: !!fid,
  });

  const {
    data,
    messageCountsByFid,
    signersByFid,
    lastUsedByFid,
    isLoading: processingIsLoading,
  } = useBackfillData(dataRaw);

  const [importedData, setImportedData] = useState<MessagesArchive | null>(
    null
  );
  const inputFile = useRef<HTMLInputElement>(null);

  const fidToSignerSorted = useMemo(() => {
    if (!signersByFid) return;
    return Object.entries(signersByFid.fidToSigner).sort(
      ([fidA], [fidB]) =>
        (lastUsedByFid?.[fidB] || new Date(0)).getTime() -
        (lastUsedByFid?.[fidA] || new Date(0)).getTime()
    );
  }, [data]);

  useEffect(() => {
    if (importedData) {
      navigate("/import");
    }
  }, [importedData]);

  useEffect(() => {
    if (data) {
      setProgressMessages([]);
    }
  }, [isFetching]);

  if (!fid) {
    return (
      <div className="flex gap-2">
        <input
          className="border border-black p-2"
          type="text"
          placeholder={"FID"}
          onChange={(e) => setFidRaw(e.target.value)}
        />
        <input
          className="border border-black p-2"
          type="text"
          placeholder={hubUrl}
          onChange={(e) => setHubUrlRaw(e.target.value)}
        />
        <ActionButton
          onClick={() => {
            if (fidRaw) {
              setFid(parseInt(fidRaw));
            }

            if (hubUrlRaw) {
              setHubUrl(hubUrlRaw);
            }
          }}
        >
          Load
        </ActionButton>
      </div>
    );
  }

  if (queryIsLoading || isFetching)
    return (
      <div>
        <div>
          Loading {config.fid} from {config.hubUrl}...
        </div>
        {progressMessages.map((message, i) => (
          <div key={i}>{message}</div>
        ))}
      </div>
    );

  if (isError) {
    return (
      <div>
        <button
          onClick={() => {
            setFid(null);
            setProgressMessages([]);
          }}
        >
          ← Back
        </button>
        <div>Error {error instanceof Error && error.message + error.stack}</div>
      </div>
    );
  }

  if (processingIsLoading || !data || !signersByFid || !fidToSignerSorted)
    return <div>Processing...</div>;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <button
          onClick={() => {
            setFid(null);
          }}
        >
          ← Config
        </button>
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
                      setImportedData({
                        ...decodeJsonData(json),
                        signerPubKeys: json.signerPubKeys,
                      });
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
          <ActionButton onClick={() => refetch()}>Refresh</ActionButton>
          <ActionButton onClick={() => inputFile.current?.click()}>
            Import
          </ActionButton>
          <ConnectKitButton></ConnectKitButton>
        </div>
      </div>

      <Routes>
        <Route path="/debug" element={<DebugPage />} />

        <Route
          path="/import"
          element={
            importedData ? (
              <ImportDetail importedData={importedData}></ImportDetail>
            ) : (
              <div>
                <BackButton></BackButton>
                <div>Data not imported</div>
              </div>
            )
          }
        />
        <Route path="/app/:fid" element={<AppDetail />}></Route>
        <Route path="/app/:fid/:signer" element={<SignerDetail />} />
        <Route path="/app/:signer" element={<SignerDetail />} />

        <Route
          path="/"
          element={
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {fidToSignerSorted!.map(([fid, signers], i) => (
                <button key={fid} onClick={() => navigate(`/app/${fid}`)}>
                  <div
                    className={twMerge(
                      "p-2 w-full h-full text-left flex flex-col gap-2",
                      border
                    )}
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
                            -{" "}
                            {messageCountsByFid?.[
                              fid
                            ].reactions.toLocaleString()}{" "}
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
          }
        />
      </Routes>
    </div>
  );
}
