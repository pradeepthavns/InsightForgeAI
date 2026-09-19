"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

const UPLOAD_URL = "http://127.0.0.1:8000/upload";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [".csv", ".xlsx"] as const;

type UploadResponse = {
  message: string;
  dataset_id: string;
  filename: string;
  file_type: string;
  file_size_bytes: number;
};

function getExtension(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return filename.slice(dotIndex).toLowerCase();
}

function getErrorMessage(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  return "Upload failed. Please try again.";
}

export default function UploadSection() {
  const router = useRouter();

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [isUploading, setIsUploading] =
    useState(false);

  const [success, setSuccess] =
    useState<UploadResponse | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  function validateFile(file: File): string | null {
    const extension = getExtension(file.name);

    if (
      !ALLOWED_EXTENSIONS.includes(
        extension as (typeof ALLOWED_EXTENSIONS)[number]
      )
    ) {
      return "Please choose a CSV or XLSX file.";
    }

    if (file.size > MAX_FILE_SIZE) {
      return "File is too large. Maximum allowed size is 10 MB.";
    }

    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSuccess(null);
    setError(null);

    if (!selectedFile) {
      setError("Please select a file before uploading.");
      return;
    }

    const validationError =
      validateFile(selectedFile);

    if (validationError) {
      setError(validationError);
      return;
    }

    const formData = new FormData();

    formData.append("file", selectedFile);

    setIsUploading(true);

    try {
      const response = await fetch(
        UPLOAD_URL,
        {
          method: "POST",
          body: formData,
        }
      );

      const data: unknown =
        await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          data &&
          typeof data === "object" &&
          "detail" in data
            ? (data as { detail: unknown }).detail
            : null;

        throw new Error(
          getErrorMessage(detail)
        );
      }

      const uploadData =
        data as UploadResponse;

      setSuccess(uploadData);

    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Could not reach the backend. Make sure FastAPI is running on http://127.0.0.1:8000."
        );

        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Upload failed. Please try again."
      );

    } finally {
      setIsUploading(false);
    }
  }

  function openDashboard() {
    if (!success) {
      return;
    }

    router.push(
      `/dashboard?dataset_id=${encodeURIComponent(
        success.dataset_id
      )}`
    );
  }

  return (
    <section
      id="upload"
      className="scroll-mt-20 border-t border-border"
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">

        {/* Heading */}
        <h2 className="text-3xl font-semibold tracking-tight">
          Upload Your Dataset
        </h2>

        <p className="mt-3 text-muted">
          Choose a CSV or XLSX file up to 10 MB.
          InsightForgeAI will analyze your dataset
          automatically.
        </p>

        {/* Upload Form */}
        <form
          className="mt-8 max-w-xl rounded-2xl border border-border bg-card p-6 shadow-sm"
          onSubmit={handleSubmit}
        >
          <label
            htmlFor="dataset-file"
            className="block text-sm font-medium"
          >
            Dataset file
          </label>

          <input
            id="dataset-file"
            name="file"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-2 block w-full text-sm text-muted file:mr-4 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
            onChange={(event) => {
              const file =
                event.target.files?.[0] ?? null;

              setSelectedFile(file);
              setSuccess(null);
              setError(
                file
                  ? validateFile(file)
                  : null
              );
            }}
          />

          <button
            type="submit"
            disabled={isUploading}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isUploading
              ? "Uploading..."
              : "Upload Dataset"}
          </button>
        </form>

        {/* Error */}
        {error ? (
          <p
            className="mt-4 text-sm font-medium text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {/* Upload Success */}
        {success ? (
          <div
            className="mt-4 max-w-xl rounded-2xl border border-border bg-brand-soft p-5 text-sm"
            role="status"
          >
            <p className="font-medium text-brand-dark">
              {success.message}
            </p>

            <p className="mt-2 text-foreground">
              Filename:{" "}
              <span className="font-medium">
                {success.filename}
              </span>
            </p>

            <p className="mt-1 text-foreground">
              Dataset ID:{" "}
              <span className="font-mono text-xs sm:text-sm">
                {success.dataset_id}
              </span>
            </p>

            {/* Dashboard Button */}
            <button
              type="button"
              onClick={openDashboard}
              className="mt-5 inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Open Dashboard →
            </button>
          </div>
        ) : null}

      </div>
    </section>
  );
}