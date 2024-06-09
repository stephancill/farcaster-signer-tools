"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { AppDetail } from "../components/AppDetail";
import { UserDataView } from "../components/UserDataView";
import { useBackfillData } from "../context/backfillContext";
import {
  getFullProfileFromHub,
  getFullTime,
  signerMessagesToString,
  timeAgo,
} from "./utils";
import { twMerge } from "tailwind-merge";
import { border } from "../style/common";

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
      </div>

      {appFid ? (
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
