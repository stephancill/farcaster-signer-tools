import QRCode from "qrcode.react";
import { StoredIdentity } from "../hooks/useFarcasterIdentity";
import { ActionButton } from "./ActionButton";
import { SignerView } from "./SignerView";

export function LocalSignerView({
  onLogout,
  onRemove,
  user,
  active = false,
}: {
  user: StoredIdentity;
  onLogout?: () => void;
  onRemove?: () => void;
  active?: boolean;
}) {
  return (
    <div className="space-y-2">
      {user.status === "pending_approval" ? (
        active ? (
          <div className="signer-approval-container flex flex-col gap-2 items-center border border-black p-2">
            Scan with your camera app
            <QRCode value={user.signerApprovalUrl} size={128} />
            <div className="or-divider text-muted-foreground">OR</div>
            <a
              href={user.signerApprovalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Open URL
            </a>
            <hr />
          </div>
        ) : (
          <div className="text-center">Continue sign in</div>
        )
      ) : (
        <div className="flex flex-col gap-2">
          <SignerView signer={user.publicKey} />
          <div className="flex gap-2">
            {onLogout && (
              <ActionButton className="w-full" onClick={onLogout}>
                Logout
              </ActionButton>
            )}
            {onRemove && (
              <ActionButton
                className="w-full"
                onClick={() => {
                  if (
                    window.confirm(
                      "Are you sure you want to remove this identity?"
                    )
                  ) {
                    onRemove();
                  }
                }}
              >
                Remove
              </ActionButton>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
