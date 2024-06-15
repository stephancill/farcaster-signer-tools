import { fetchMetadata } from "frames.js/next";
import { Metadata } from "next";
import dynamic from "next/dynamic";
import "./globals.css";

const Providers = dynamic(() => import("./providers"), { ssr: false });

export async function generateMetadata(): Promise<Metadata> {
  const frameMetadata = await fetchMetadata(`${process.env.APP_URL}/frames`);
  return {
    title: "Farcaster Signer Tools",
    description:
      "The easiest and safest way to manage your Farcaster account permissionlessly.",
    other: {
      ...frameMetadata,
    },
  };
}

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
