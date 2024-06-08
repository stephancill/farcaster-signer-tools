import { UserDataType } from "@farcaster/hub-web";
import { UserDataAggType } from "../app/utils";

export function UserAccount({ data }: { data: UserDataAggType }) {
  return (
    <div className="flex gap-3 items-center">
      <div>
        <img
          className="w-10 h-10 rounded-full border border-gray-500"
          src={data?.[UserDataType.PFP]}
        />
      </div>
      <div className="flex flex-col">
        <div className="font-bold">{data[UserDataType.DISPLAY]}</div>
        <div>@{data[UserDataType.USERNAME]}</div>
        <div>{data[UserDataType.BIO]}</div>
      </div>
    </div>
  );
}
