import { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";

const Providers = dynamic(() => import("./providers"), { ssr: false });

export const metadata: Metadata = {
  title: "Farcaster Signer Tools",
  description:
    "The easiest and safest way to manage your Farcaster account permissionlessly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="p-2 md:p-10">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
