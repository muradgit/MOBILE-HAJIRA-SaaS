"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

const App = dynamic(() => import("@/src/App"), { ssr: false });

export default function Page() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <App />
    </Suspense>
  );
}
