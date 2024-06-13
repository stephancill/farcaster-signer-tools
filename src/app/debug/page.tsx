"use client";

import { Message } from "@farcaster/hub-web";
import { useEffect, useState } from "react";
import { transformHash } from "../utils";

export default function DebugPage() {
  const [rawJson, setRawJson] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!rawJson) return;

    try {
      const parsed = JSON.parse(rawJson);
      setMessage(
        JSON.stringify(
          transformHash(Message.toJSON(Message.fromJSON(parsed))),
          null,
          2
        )
      );
    } catch (e) {
      setMessage("Could not parse message");
    }
  }, [rawJson]);

  return (
    <div>
      <h1>Debug</h1>
      <textarea
        value={rawJson || ""}
        onChange={(e) => setRawJson(e.target.value)}
        placeholder="Paste Message JSON here"
        className="w-full h-32"
      />
      <pre>{message}</pre>
    </div>
  );
}
