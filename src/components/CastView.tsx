import { CastAddMessage } from "@farcaster/hub-web";
import { twMerge } from "tailwind-merge";
import { bytesToHex } from "viem";
import { border } from "../style/common";
import {
  castIdToUrl,
  farcasterTimeToDate,
  getFullTime,
  timeAgo,
  truncateAddress,
} from "../app/utils";

function splitAndInsert(
  input: string,
  indices: number[],
  insertions: string[]
) {
  let result = [];
  let lastIndex = 0;

  indices.forEach((index, i) => {
    result.push(Buffer.from(input).slice(lastIndex, index).toString());
    result.push(insertions[i]);
    lastIndex = index;
  });

  result.push(Buffer.from(input).slice(lastIndex).toString()); // get remaining part of string

  return result;
}

export function CastView({
  castAddMessage: cast,
}: {
  castAddMessage: CastAddMessage;
}) {
  return (
    <div
      key={bytesToHex(cast.hash)}
      className={twMerge(
        "flex flex-col p-2 break-word [overflow-wrap:anywhere] gap-2",
        border
      )}
    >
      {cast.data.castAddBody.parentCastId && (
        <div>
          <a
            target="_blank"
            href={castIdToUrl(cast.data.castAddBody.parentCastId)}
            className="text-gray-500 hover:underline"
          >
            Replying to{" "}
            {truncateAddress(
              bytesToHex(cast.data.castAddBody.parentCastId.hash)
            )}{" "}
            by @!{cast.data.castAddBody.parentCastId.fid}
          </a>
        </div>
      )}
      <div className="break-words">
        {splitAndInsert(
          cast.data.castAddBody.text,
          cast.data.castAddBody.mentionsPositions,
          cast.data.castAddBody.mentions.map((m) => `@!${m.toString()}`)
        )}
      </div>

      {cast.data.castAddBody.embeds.length > 0 &&
        cast.data.castAddBody.embeds.map((embed, i) => (
          <div className="italic" key={i}>
            {embed.url ? (
              <div>
                <a
                  href={embed.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue"
                >
                  {embed.url}
                </a>{" "}
              </div>
            ) : embed.castId ? (
              <div>
                {truncateAddress(bytesToHex(embed.castId.hash))} by @!
                {embed.castId.fid}
              </div>
            ) : (
              JSON.stringify(embed)
            )}
          </div>
        ))}
      <div className="flex mt-auto ">
        <div
          className="text-gray-500"
          title={getFullTime(farcasterTimeToDate(cast.data.timestamp))}
        >
          {timeAgo(farcasterTimeToDate(cast.data.timestamp))} ago
        </div>
        <div className="ml-auto">
          <a
            target="_blank"
            href={castIdToUrl({ fid: cast.data.fid, hash: cast.hash })}
            className="text-gray-500 hover:underline"
          >
            Link
          </a>
        </div>
      </div>
    </div>
  );
}
