import type { Metadata } from "next";
import "./globals.css";
import { Suspense } from "react";
import { ToastProvider, ToastFromParams } from "@/components/ui";
import { DbProvider } from "@/components/db-provider";

export const metadata: Metadata = {
  title: "Shortlisting Platform",
  description: "Learner eligibility & shortlisting journey",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Suspense fallback={null}>
            <ToastFromParams />
          </Suspense>
          {/* All state lives in the browser (sql.js + IndexedDB); nothing
              renders until the database is open. */}
          <DbProvider>{children}</DbProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
