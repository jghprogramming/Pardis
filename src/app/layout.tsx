import type { ReactNode } from "react";
import { Vazirmatn } from "next/font/google";

// Vazirmatn is loaded here (not just declared): every page under this
// layout renders Persian text in Vazirmatn, right-to-left.
const vazirmatn = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
      </head>
      <body className={vazirmatn.className}>{children}</body>
    </html>
  );
}
