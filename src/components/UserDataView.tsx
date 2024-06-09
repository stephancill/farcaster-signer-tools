import { UserDataType } from "@farcaster/hub-web";
import { UserDataAggType } from "../app/utils";

export function UserDataView({ data }: { data: UserDataAggType }) {
  return (
    <div className="flex gap-3">
      <img
        className="w-10 h-10 rounded-full border border-gray-300 mt-1"
        src={data?.[UserDataType.PFP]}
      />
      <div className="flex flex-col">
        <div className="font-bold">{data[UserDataType.DISPLAY]}</div>
        <div className="text-gray-500">@{data[UserDataType.USERNAME]}</div>
        <div className="line-clamp-2" title={data[UserDataType.BIO]}>
          {data[UserDataType.BIO]}
        </div>
      </div>
    </div>
  );
}
