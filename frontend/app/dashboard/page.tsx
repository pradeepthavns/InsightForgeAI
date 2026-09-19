"use client";

import { useSearchParams } from "next/navigation";
import Dashboard from "@/components/Dashboard";

export default function DashboardPage() {
  const searchParams = useSearchParams();

  const datasetId = searchParams.get("dataset_id");

  if (!datasetId) {
    return (
      <main className="min-h-screen bg-background px-6 py-12">
        <div className="mx-auto max-w-7xl">

          <div className="rounded-xl border border-border bg-card p-8 text-center">

            <h1 className="text-2xl font-bold">
              No Dataset Selected
            </h1>

            <p className="mt-2 text-muted">
              Please upload a dataset first.
            </p>

          </div>

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12">

      <div className="mx-auto max-w-7xl">

        <Dashboard datasetId={datasetId} />

      </div>

    </main>
  );
}