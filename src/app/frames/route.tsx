import { frames } from "./frames";
import { redirect } from "frames.js/core";

const handler = frames(async (ctx) => {
  if (
    ctx.message?.requesterFid &&
    ctx.pressedButton?.action === "post_redirect"
  ) {
    return redirect(`${process.env.APP_URL}?fid=${ctx.message.requesterFid}`);
  }

  const imageIndex = parseInt(ctx.searchParams.imageIndex || "1");

  return {
    image: `/frame${imageIndex}.png`,
    buttons: [
      {
        label: "Manage my signers",
        action: "post_redirect",
        target: "/frames",
      },
      {
        label: "Next →",
        action: "post",
        target: `/frames?imageIndex=${imageIndex === 4 ? 1 : imageIndex + 1}`,
      },
    ],
  };
});

export const GET = handler;
export const POST = handler;
