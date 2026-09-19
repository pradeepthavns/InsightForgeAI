"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";

type DashboardProps = {
  datasetId: string;
};

/* =========================================================
   DATASET PROFILE TYPES
========================================================= */

type DatasetProfile = {
  dataset_id: string;
  filename: string;

  rows: number;
  columns: number;

  column_names: string[];

  data_types: Record<string, string>;

  missing_values: Record<string, number>;
  missing_percentages: Record<string, number>;

  total_missing_values: number;

  duplicate_rows: number;
  duplicate_percentage: number;

  constant_columns: string[];
  id_like_columns: string[];

  outlier_counts: Record<string, number>;
  outlier_percentages: Record<string, number>;

  data_quality_score: number;

  unique_values: Record<string, number>;
  memory_usage_bytes: number;
};

/* =========================================================
   EDA TYPES
========================================================= */

type NumericStatistic = {
  count: number;
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
};

type CategoricalValue = {
  value: string;
  count: number;
};

type CategoricalStatistic = {
  unique_values: number;
  top_values: CategoricalValue[];
};

type CorrelationMatrix = {
  columns: string[];
  values: number[][];
};

type EDAData = {
  dataset_id: string;
  filename: string;

  numeric_columns: string[];
  categorical_columns: string[];

  numeric_statistics: Record<string, NumericStatistic>;

  categorical_statistics: Record<
    string,
    CategoricalStatistic
  >;

  correlation_matrix: CorrelationMatrix;
};

/* =========================================================
   FINDINGS TYPES
========================================================= */

type Finding = {
  type:
    | "critical"
    | "warning"
    | "info"
    | "positive"
    | "negative";

  title: string;
  message: string;
};

/* =========================================================
   TARGET DETECTION TYPES
========================================================= */

type TargetCandidate = {
  column: string;
  score: number;
  problem_type: string;
  unique_values: number;
  missing_values: number;
  missing_percentage: number;
};

type TargetDetection = {
  recommended_target: string | null;
  problem_type: string;
  confidence: string;
  reason: string;
  candidates: TargetCandidate[];
};

/* =========================================================
   PREPROCESSING TYPES
========================================================= */

type PreprocessingSummary = {
  problem_type: string;

  original_rows: number;
  train_rows: number;
  test_rows: number;

  numeric_columns: string[];
  categorical_columns: string[];

  processed_features: number;

  feature_names: string[];

  steps: string[];
};

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(2)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFindingStyle(type: Finding["type"]) {
  switch (type) {
    case "critical":
      return {
        container:
          "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-950/20",
        badge:
          "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      };

    case "warning":
      return {
        container:
          "border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-950/20",
        badge:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
      };

    case "positive":
      return {
        container:
          "border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20",
        badge:
          "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
      };

    case "negative":
      return {
        container:
          "border-purple-200 bg-purple-50 dark:border-purple-900/40 dark:bg-purple-950/20",
        badge:
          "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
      };

    default:
      return {
        container:
          "border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20",
        badge:
          "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
      };
  }
}

function getFindingLabel(type: Finding["type"]) {
  switch (type) {
    case "critical":
      return "Critical";

    case "warning":
      return "Warning";

    case "positive":
      return "Positive";

    case "negative":
      return "Negative";

    default:
      return "Information";
  }
}

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export default function Dashboard({
  datasetId,
}: DashboardProps) {
  /* -------------------------------------------------------
     MAIN DATA STATES
  ------------------------------------------------------- */

  const [profile, setProfile] =
    useState<DatasetProfile | null>(null);

  const [eda, setEda] =
    useState<EDAData | null>(null);

  const [findings, setFindings] =
    useState<Finding[]>([]);

  const [targetDetection, setTargetDetection] =
    useState<TargetDetection | null>(null);

  /* -------------------------------------------------------
     TARGET / PREPROCESSING STATES
  ------------------------------------------------------- */

  const [selectedTarget, setSelectedTarget] =
    useState<string>("");

  const [preprocessing, setPreprocessing] =
    useState<PreprocessingSummary | null>(null);

  const [isPreparing, setIsPreparing] =
    useState(false);

  const [preprocessingError, setPreprocessingError] =
    useState("");

  /* -------------------------------------------------------
     PAGE STATES
  ------------------------------------------------------- */

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /* =======================================================
     FETCH DASHBOARD DATA
  ======================================================= */

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setIsLoading(true);
        setError("");

        const [
          profileResponse,
          edaResponse,
          findingsResponse,
          targetResponse,
        ] = await Promise.all([
          fetch(
            `${API_URL}/dataset/${datasetId}`
          ),

          fetch(
            `${API_URL}/dataset/${datasetId}/eda`
          ),

          fetch(
            `${API_URL}/dataset/${datasetId}/findings`
          ),

          fetch(
            `${API_URL}/dataset/${datasetId}/target`
          ),
        ]);

        if (!profileResponse.ok) {
          throw new Error(
            "Could not load dataset profile."
          );
        }

        if (!edaResponse.ok) {
          throw new Error(
            "Could not load EDA information."
          );
        }

        if (!findingsResponse.ok) {
          throw new Error(
            "Could not load automated findings."
          );
        }

        if (!targetResponse.ok) {
          throw new Error(
            "Could not load target detection."
          );
        }

        const profileData =
          await profileResponse.json();

        const edaData =
          await edaResponse.json();

        const findingsData =
          await findingsResponse.json();

        const targetData =
          await targetResponse.json();

        setProfile(profileData);

        setEda(edaData);

        setFindings(
          findingsData.findings || []
        );

        setTargetDetection(targetData);

        /*
         * Automatically select the recommended
         * target when target detection succeeds.
         */
        if (targetData.recommended_target) {
          setSelectedTarget(
            targetData.recommended_target
          );
        }
      } catch (requestError) {
        console.error(requestError);

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Something went wrong while loading the dashboard."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [datasetId]);

  /* =======================================================
     PREPARE DATASET
  ======================================================= */

  async function handlePrepareDataset() {
    if (!selectedTarget) {
      setPreprocessingError(
        "Please select a target column first."
      );

      return;
    }

    try {
      setIsPreparing(true);
      setPreprocessingError("");
      setPreprocessing(null);

      const response = await fetch(
        `${API_URL}/dataset/${datasetId}/preprocess?target=${encodeURIComponent(
          selectedTarget
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Could not preprocess the dataset."
        );
      }

      setPreprocessing(data);
    } catch (requestError) {
      console.error(requestError);

      setPreprocessingError(
        requestError instanceof Error
          ? requestError.message
          : "Could not preprocess the dataset."
      );
    } finally {
      setIsPreparing(false);
    }
  }

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-border border-t-primary" />

          <p className="text-sm text-muted">
            Loading your dataset analysis...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR STATE
  ======================================================= */

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-900/40 dark:bg-red-950/20">
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-300">
          Dashboard Error
        </h1>

        <p className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>

        <p className="mt-4 text-xs text-muted">
          Make sure the InsightForgeAI backend is
          running on port 8000.
        </p>
      </div>
    );
  }

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  if (!profile || !eda) {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <h1 className="text-2xl font-bold">
          No Dataset Information
        </h1>

        <p className="mt-2 text-muted">
          Dataset analysis could not be loaded.
        </p>
      </div>
    );
  }

  /* =======================================================
     PREPARE CHART DATA
  ======================================================= */

  const numericRangeData =
    eda.numeric_columns.map((column) => {
      const stats =
        eda.numeric_statistics[column];

      return {
        column,
        min: stats?.min ?? 0,
        q1: stats?.q1 ?? 0,
        median: stats?.median ?? 0,
        q3: stats?.q3 ?? 0,
        max: stats?.max ?? 0,
      };
    });

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="space-y-10 pb-16">

      {/* =================================================
          HEADER
      ================================================= */}

      <section>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-primary">
              InsightForgeAI Dashboard
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {profile.filename}
            </h1>

            <p className="mt-2 text-sm text-muted">
              Automated data analysis, quality
              assessment, EDA and machine-learning
              preparation.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted">
              Dataset ID
            </p>

            <p className="mt-1 max-w-[280px] truncate font-mono text-xs">
              {datasetId}
            </p>
          </div>
        </div>
      </section>

      {/* =================================================
          DATASET OVERVIEW
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Dataset Overview
          </h2>

          <p className="mt-1 text-sm text-muted">
            A high-level summary of your uploaded
            dataset.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          {/* Rows */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted">
              Rows
            </p>

            <p className="mt-2 text-3xl font-bold">
              {profile.rows.toLocaleString()}
            </p>
          </div>

          {/* Columns */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted">
              Columns
            </p>

            <p className="mt-2 text-3xl font-bold">
              {profile.columns}
            </p>
          </div>

          {/* Duplicates */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted">
              Duplicate Rows
            </p>

            <p className="mt-2 text-3xl font-bold">
              {profile.duplicate_rows}
            </p>

            <p className="mt-1 text-xs text-muted">
              {profile.duplicate_percentage}%
              of dataset
            </p>
          </div>

          {/* Missing */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted">
              Missing Values
            </p>

            <p className="mt-2 text-3xl font-bold">
              {profile.total_missing_values}
            </p>
          </div>

          {/* Quality */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted">
              Quality Score
            </p>

            <p className="mt-2 text-3xl font-bold">
              {profile.data_quality_score}
              <span className="text-lg text-muted">
                /100
              </span>
            </p>
          </div>

        </div>
      </section>

      {/* =================================================
          AUTOMATED FINDINGS
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Automated Findings
          </h2>

          <p className="mt-1 text-sm text-muted">
            InsightForgeAI automatically identifies
            important patterns and potential data issues.
          </p>
        </div>

        {findings.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted">
              No automated findings were generated.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">

            {findings.map(
              (finding, index) => {
                const style =
                  getFindingStyle(
                    finding.type
                  );

                return (
                  <div
                    key={`${finding.title}-${index}`}
                    className={`rounded-2xl border p-5 ${style.container}`}
                  >
                    <div className="flex items-start justify-between gap-4">

                      <h3 className="font-semibold">
                        {finding.title}
                      </h3>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${style.badge}`}
                      >
                        {getFindingLabel(
                          finding.type
                        )}
                      </span>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {finding.message}
                    </p>
                  </div>
                );
              }
            )}

          </div>
        )}
      </section>

      {/* =================================================
          TARGET DETECTION + MANUAL OVERRIDE
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Target & ML Preparation
          </h2>

          <p className="mt-1 text-sm text-muted">
            Select the column you want the machine-learning
            models to predict.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Recommended Target */}
          <div className="rounded-2xl border border-border bg-card p-6">

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Recommended Target
              </h3>

              {targetDetection && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {targetDetection.confidence
                    .charAt(0)
                    .toUpperCase() +
                    targetDetection.confidence.slice(
                      1
                    )}{" "}
                  confidence
                </span>
              )}
            </div>

            {targetDetection?.recommended_target ? (
              <>
                <div className="mt-5 rounded-xl border border-border bg-background p-5">
                  <p className="text-xs uppercase tracking-wider text-muted">
                    Recommended Column
                  </p>

                  <p className="mt-2 text-2xl font-bold">
                    {
                      targetDetection.recommended_target
                    }
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {
                        targetDetection.problem_type
                      }
                    </span>

                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                      Automatically detected
                    </span>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-muted">
                  {targetDetection.reason}
                </p>
              </>
            ) : (
              <div className="mt-5 rounded-xl border border-yellow-200 bg-yellow-50 p-5 dark:border-yellow-900/40 dark:bg-yellow-950/20">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  No suitable target was detected
                  automatically. Please select one
                  manually.
                </p>
              </div>
            )}

          </div>

          {/* Manual Target Selection */}
          <div className="rounded-2xl border border-border bg-card p-6">

            <h3 className="text-lg font-semibold">
              Choose Target Column
            </h3>

            <p className="mt-2 text-sm text-muted">
              You can override the automatic
              recommendation and choose another
              column.
            </p>

            <div className="mt-5">
              <label
                htmlFor="target-column"
                className="mb-2 block text-sm font-medium"
              >
                Target column
              </label>

              <select
                id="target-column"
                value={selectedTarget}
                onChange={(event) => {
                  setSelectedTarget(
                    event.target.value
                  );

                  setPreprocessing(null);
                  setPreprocessingError("");
                }}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="">
                  Select a target column
                </option>

                {profile.column_names.map(
                  (column) => (
                    <option
                      key={column}
                      value={column}
                    >
                      {column}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mt-5 rounded-xl bg-secondary/50 p-4">
              <p className="text-xs text-muted">
                Selected target
              </p>

              <p className="mt-1 font-semibold">
                {selectedTarget ||
                  "No target selected"}
              </p>
            </div>

            <button
              type="button"
              onClick={
                handlePrepareDataset
              }
              disabled={
                !selectedTarget ||
                isPreparing
              }
              className="mt-5 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPreparing
                ? "Preparing Dataset..."
                : "Prepare Dataset →"}
            </button>

          </div>

        </div>

        {/* Target Candidates */}
        {targetDetection &&
          targetDetection.candidates.length >
            0 && (
            <div className="mt-6 rounded-2xl border border-border bg-card p-6">

              <h3 className="text-lg font-semibold">
                Target Candidates
              </h3>

              <p className="mt-1 text-sm text-muted">
                These are the columns considered by
                the automatic target-detection system.
              </p>

              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">

                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-3 font-semibold">
                        Column
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Score
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Problem Type
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Unique Values
                      </th>

                      <th className="px-4 py-3 font-semibold">
                        Missing
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {targetDetection.candidates.map(
                      (candidate) => (
                        <tr
                          key={candidate.column}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 font-medium">
                            {candidate.column}
                          </td>

                          <td className="px-4 py-3">
                            {candidate.score}
                          </td>

                          <td className="px-4 py-3 capitalize">
                            {
                              candidate.problem_type
                            }
                          </td>

                          <td className="px-4 py-3">
                            {
                              candidate.unique_values
                            }
                          </td>

                          <td className="px-4 py-3">
                            {
                              candidate.missing_percentage
                            }
                            %
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>

                </table>
              </div>
            </div>
          )}

        {/* Preprocessing Error */}
        {preprocessingError && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {preprocessingError}
            </p>
          </div>
        )}

        {/* =================================================
            PREPROCESSING SUMMARY
        ================================================= */}

        {preprocessing && (
          <div className="mt-6 space-y-6">

            <div>
              <h3 className="text-xl font-bold">
                Preprocessing Summary
              </h3>

              <p className="mt-1 text-sm text-muted">
                InsightForgeAI has prepared the
                selected dataset for machine-learning
                training.
              </p>
            </div>

            {/* Summary Cards */}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted">
                  Problem Type
                </p>

                <p className="mt-2 text-xl font-bold capitalize">
                  {preprocessing.problem_type}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted">
                  Original Rows
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {preprocessing.original_rows}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted">
                  Training Rows
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {preprocessing.train_rows}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted">
                  Testing Rows
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {preprocessing.test_rows}
                </p>
              </div>

              <div className="rounded-2xl border border-border bg-card p-5">
                <p className="text-sm text-muted">
                  Processed Features
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {
                    preprocessing.processed_features
                  }
                </p>
              </div>

            </div>

            {/* Feature Types */}

            <div className="grid gap-6 lg:grid-cols-2">

              <div className="rounded-2xl border border-border bg-card p-6">

                <h4 className="font-semibold">
                  Numerical Features
                </h4>

                <div className="mt-4 flex flex-wrap gap-2">
                  {preprocessing.numeric_columns
                    .length > 0 ? (
                    preprocessing.numeric_columns.map(
                      (column) => (
                        <span
                          key={column}
                          className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                        >
                          {column}
                        </span>
                      )
                    )
                  ) : (
                    <p className="text-sm text-muted">
                      No numerical features.
                    </p>
                  )}
                </div>

              </div>

              <div className="rounded-2xl border border-border bg-card p-6">

                <h4 className="font-semibold">
                  Categorical Features
                </h4>

                <div className="mt-4 flex flex-wrap gap-2">
                  {preprocessing
                    .categorical_columns
                    .length > 0 ? (
                    preprocessing.categorical_columns.map(
                      (column) => (
                        <span
                          key={column}
                          className="rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        >
                          {column}
                        </span>
                      )
                    )
                  ) : (
                    <p className="text-sm text-muted">
                      No categorical features.
                    </p>
                  )}
                </div>

              </div>

            </div>

            {/* What happened */}

            <div className="rounded-2xl border border-border bg-card p-6">

              <h4 className="text-lg font-semibold">
                What InsightForgeAI Did
              </h4>

              <div className="mt-5 grid gap-3 md:grid-cols-2">

                {preprocessing.steps.map(
                  (step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 rounded-xl bg-secondary/40 p-4"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        ✓
                      </span>

                      <p className="text-sm leading-6">
                        {step}
                      </p>
                    </div>
                  )
                )}

              </div>

            </div>

            {/* Generated Features */}

            {preprocessing.feature_names
              .length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-6">

                <h4 className="text-lg font-semibold">
                  Generated Features
                </h4>

                <p className="mt-1 text-sm text-muted">
                  Features created after preprocessing
                  and categorical encoding.
                </p>

                <div className="mt-4 max-h-64 overflow-y-auto rounded-xl bg-secondary/30 p-4">

                  <div className="flex flex-wrap gap-2">
                    {preprocessing.feature_names.map(
                      (feature) => (
                        <span
                          key={feature}
                          className="rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-xs"
                        >
                          {feature}
                        </span>
                      )
                    )}
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

      </section>

      {/* =================================================
          DATA QUALITY
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Data Quality
          </h2>

          <p className="mt-1 text-sm text-muted">
            Potential issues detected in the uploaded
            dataset.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Missing Values */}

          <div className="rounded-2xl border border-border bg-card p-6">

            <h3 className="text-lg font-semibold">
              Missing Values
            </h3>

            <div className="mt-5 space-y-3">
              {Object.entries(
                profile.missing_percentages
              ).map(
                ([column, percentage]) => (
                  <div
                    key={column}
                    className="flex items-center justify-between rounded-xl bg-secondary/40 p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {column}
                      </p>

                      <p className="text-xs text-muted">
                        {
                          profile.missing_values[
                            column
                          ]
                        }{" "}
                        missing values
                      </p>
                    </div>

                    <span className="font-semibold">
                      {percentage}%
                    </span>
                  </div>
                )
              )}
            </div>

          </div>

          {/* Duplicate Analysis */}

          <div className="rounded-2xl border border-border bg-card p-6">

            <h3 className="text-lg font-semibold">
              Duplicate Analysis
            </h3>

            <div className="mt-5 rounded-xl bg-secondary/40 p-5">

              <p className="text-sm text-muted">
                Duplicate rows
              </p>

              <p className="mt-2 text-3xl font-bold">
                {profile.duplicate_rows}
              </p>

              <p className="mt-2 text-sm text-muted">
                {profile.duplicate_percentage}%
                of all rows
              </p>

            </div>

          </div>

          {/* Constant Columns */}

          <div className="rounded-2xl border border-border bg-card p-6">

            <h3 className="text-lg font-semibold">
              Constant Columns
            </h3>

            {profile.constant_columns.length >
            0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.constant_columns.map(
                  (column) => (
                    <span
                      key={column}
                      className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300"
                    >
                      {column}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                No constant columns detected.
              </p>
            )}

          </div>

          {/* ID-like Columns */}

          <div className="rounded-2xl border border-border bg-card p-6">

            <h3 className="text-lg font-semibold">
              Potential ID-like Columns
            </h3>

            {profile.id_like_columns.length >
            0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {profile.id_like_columns.map(
                  (column) => (
                    <span
                      key={column}
                      className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {column}
                    </span>
                  )
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                No obvious ID-like columns detected.
              </p>
            )}

          </div>

        </div>
      </section>

      {/* =================================================
          AUTOMATED EDA
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Automated EDA
          </h2>

          <p className="mt-1 text-sm text-muted">
            Automatically generated exploratory data
            analysis.
          </p>
        </div>

        {/* Column Types */}

        <div className="grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted">
              Numerical Columns
            </p>

            <p className="mt-2 text-3xl font-bold">
              {eda.numeric_columns.length}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted">
              Categorical Columns
            </p>

            <p className="mt-2 text-3xl font-bold">
              {eda.categorical_columns.length}
            </p>
          </div>

        </div>

        {/* Numeric Statistics */}

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">

          <h3 className="text-lg font-semibold">
            Numeric Statistics
          </h3>

          {eda.numeric_columns.length ===
          0 ? (
            <p className="mt-4 text-sm text-muted">
              No numerical columns available.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">

              <table className="w-full min-w-[850px] text-left text-sm">

                <thead>
                  <tr className="border-b border-border">

                    <th className="px-4 py-3 font-semibold">
                      Column
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Mean
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Median
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Std
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Min
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Q1
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Q3
                    </th>

                    <th className="px-4 py-3 font-semibold">
                      Max
                    </th>

                  </tr>
                </thead>

                <tbody>
                  {eda.numeric_columns.map(
                    (column) => {
                      const stats =
                        eda.numeric_statistics[
                          column
                        ];

                      return (
                        <tr
                          key={column}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-4 py-3 font-medium">
                            {column}
                          </td>

                          <td className="px-4 py-3">
                            {stats?.mean ?? "-"}
                          </td>

                          <td className="px-4 py-3">
                            {stats?.median ?? "-"}
                          </td>

                          <td className="px-4 py-3">
                            {stats?.std ?? "-"}
                          </td>

                          <td className="px-4 py-3">
                            {stats?.min ?? "-"}
                          </td>

                          <td className="px-4 py-3">
                            {stats?.q1 ?? "-"}
                          </td>

                          <td className="px-4 py-3">
                            {stats?.q3 ?? "-"}
                          </td>

                          <td className="px-4 py-3">
                            {stats?.max ?? "-"}
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* Categorical Distributions */}

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">

          <h3 className="text-lg font-semibold">
            Categorical Distributions
          </h3>

          <p className="mt-1 text-sm text-muted">
            Top categories for each categorical
            column.
          </p>

          {eda.categorical_columns.length ===
          0 ? (
            <p className="mt-4 text-sm text-muted">
              No categorical columns available.
            </p>
          ) : (
            <div className="mt-6 grid gap-8 lg:grid-cols-2">

              {eda.categorical_columns.map(
                (column) => {
                  const statistics =
                    eda.categorical_statistics[
                      column
                    ];

                  const chartData =
                    statistics?.top_values.map(
                      (item) => ({
                        value: item.value,
                        count: item.count,
                      })
                    ) || [];

                  return (
                    <div
                      key={column}
                      className="rounded-xl border border-border p-5"
                    >

                      <h4 className="font-semibold">
                        {column}
                      </h4>

                      <p className="mt-1 text-xs text-muted">
                        {
                          statistics?.unique_values
                        }{" "}
                        unique values
                      </p>

                      <div className="mt-5 h-[260px]">
                        <ResponsiveContainer
                          width="100%"
                          height="100%"
                        >
                          <BarChart
                            data={chartData}
                            margin={{
                              top: 10,
                              right: 10,
                              left: 0,
                              bottom: 10,
                            }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              opacity={0.2}
                            />

                            <XAxis
                              dataKey="value"
                              tick={{
                                fontSize: 11,
                              }}
                            />

                            <YAxis
                              allowDecimals={false}
                              tick={{
                                fontSize: 11,
                              }}
                            />

                            <Tooltip />

                            <Bar
                              dataKey="count"
                              name="Count"
                              radius={[
                                5,
                                5,
                                0,
                                0,
                              ]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

        {/* Numeric Range Overview */}

        <div className="mt-6 rounded-2xl border border-border bg-card p-6">

          <h3 className="text-lg font-semibold">
            Numeric Range Overview
          </h3>

          <p className="mt-1 text-sm text-muted">
            Comparison of minimum, median and maximum
            values across numerical columns.
          </p>

          {numericRangeData.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No numerical columns available.
            </p>
          ) : (
            <div className="mt-6 h-[360px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <LineChart
                  data={numericRangeData}
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 60,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    opacity={0.2}
                  />

                  <XAxis
                    dataKey="column"
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <YAxis
                    tick={{
                      fontSize: 11,
                    }}
                  />

                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="min"
                    name="Minimum"
                    strokeWidth={2}
                  />

                  <Line
                    type="monotone"
                    dataKey="median"
                    name="Median"
                    strokeWidth={2}
                  />

                  <Line
                    type="monotone"
                    dataKey="max"
                    name="Maximum"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

        </div>

      </section>

      {/* =================================================
          CORRELATION HEATMAP
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Correlation Analysis
          </h2>

          <p className="mt-1 text-sm text-muted">
            Pearson correlation between numerical
            variables.
          </p>
        </div>

        {eda.correlation_matrix.columns.length <
        2 ? (
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted">
              At least two numerical columns are
              required to calculate correlations.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-6">

            <div className="overflow-x-auto">

              <div className="min-w-[700px]">

                {/* Header */}

                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `180px repeat(${eda.correlation_matrix.columns.length}, minmax(70px, 1fr))`,
                  }}
                >

                  <div />

                  {eda.correlation_matrix.columns.map(
                    (column) => (
                      <div
                        key={column}
                        className="px-2 py-3 text-center text-xs font-semibold"
                      >
                        <span className="block rotate-[-35deg] whitespace-nowrap">
                          {column}
                        </span>
                      </div>
                    )
                  )}

                </div>

                {/* Heatmap */}

                {eda.correlation_matrix.columns.map(
                  (rowColumn, rowIndex) => (
                    <div
                      key={rowColumn}
                      className="grid"
                      style={{
                        gridTemplateColumns: `180px repeat(${eda.correlation_matrix.columns.length}, minmax(70px, 1fr))`,
                      }}
                    >

                      <div className="flex items-center px-3 py-3 text-xs font-semibold">
                        {rowColumn}
                      </div>

                      {eda.correlation_matrix.columns.map(
                        (
                          column,
                          columnIndex
                        ) => {
                          const value =
                            eda
                              .correlation_matrix
                              .values[
                              rowIndex
                            ][
                              columnIndex
                            ] ?? 0;

                          const intensity =
                            Math.abs(value);

                          let background =
                            "rgba(148,163,184,0.10)";

                          if (value > 0) {
                            background = `rgba(59,130,246,${Math.max(
                              0.12,
                              intensity * 0.75
                            )})`;
                          } else if (
                            value < 0
                          ) {
                            background = `rgba(239,68,68,${Math.max(
                              0.12,
                              intensity * 0.75
                            )})`;
                          }

                          return (
                            <div
                              key={`${rowColumn}-${column}`}
                              title={`${rowColumn} vs ${column}: ${value.toFixed(
                                3
                              )}`}
                              className="m-0.5 flex min-h-[58px] items-center justify-center rounded-md border border-border/40 text-xs font-semibold"
                              style={{
                                backgroundColor:
                                  background,
                              }}
                            >
                              {value.toFixed(2)}
                            </div>
                          );
                        }
                      )}

                    </div>
                  )
                )}

              </div>

            </div>

            {/* Legend */}

            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs text-muted">

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-blue-500" />
                Positive correlation
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-red-500" />
                Negative correlation
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-slate-300" />
                Weak / near-zero
              </div>

            </div>

          </div>
        )}

      </section>

      {/* =================================================
          OUTLIER ANALYSIS
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Outlier Analysis
          </h2>

          <p className="mt-1 text-sm text-muted">
            Potential numerical outliers detected using
            the IQR method.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">

          {Object.keys(
            profile.outlier_counts
          ).length === 0 ? (
            <p className="text-sm text-muted">
              No numerical columns available for
              outlier analysis.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">

              {Object.entries(
                profile.outlier_counts
              ).map(
                ([column, count]) => (
                  <div
                    key={column}
                    className="rounded-xl bg-secondary/40 p-5"
                  >

                    <div className="flex items-center justify-between gap-4">

                      <p className="font-medium">
                        {column}
                      </p>

                      <span className="text-lg font-bold">
                        {count}
                      </span>

                    </div>

                    <p className="mt-1 text-xs text-muted">
                      Potential outliers
                    </p>

                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-background">

                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(
                            profile
                              .outlier_percentages[
                              column
                            ] || 0,
                            100
                          )}%`,
                        }}
                      />

                    </div>

                    <p className="mt-2 text-xs text-muted">
                      {
                        profile
                          .outlier_percentages[
                          column
                        ]
                      }
                      % of rows
                    </p>

                  </div>
                )
              )}

            </div>
          )}

        </div>
      </section>

      {/* =================================================
          COLUMN INFORMATION
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Column Information
          </h2>

          <p className="mt-1 text-sm text-muted">
            Detailed information about every dataset
            column.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-card">

          <table className="w-full min-w-[850px] text-left text-sm">

            <thead>
              <tr className="border-b border-border">

                <th className="px-5 py-4 font-semibold">
                  Column
                </th>

                <th className="px-5 py-4 font-semibold">
                  Data Type
                </th>

                <th className="px-5 py-4 font-semibold">
                  Unique Values
                </th>

                <th className="px-5 py-4 font-semibold">
                  Missing
                </th>

                <th className="px-5 py-4 font-semibold">
                  Missing %
                </th>

              </tr>
            </thead>

            <tbody>

              {profile.column_names.map(
                (column) => (
                  <tr
                    key={column}
                    className="border-b border-border last:border-0"
                  >

                    <td className="px-5 py-4 font-medium">
                      {column}
                    </td>

                    <td className="px-5 py-4">
                      {profile.data_types[
                        column
                      ] || "-"}
                    </td>

                    <td className="px-5 py-4">
                      {
                        profile.unique_values[
                          column
                        ]
                      }
                    </td>

                    <td className="px-5 py-4">
                      {
                        profile.missing_values[
                          column
                        ]
                      }
                    </td>

                    <td className="px-5 py-4">
                      {
                        profile
                          .missing_percentages[
                          column
                        ]
                      }
                      %
                    </td>

                  </tr>
                )
              )}

            </tbody>

          </table>

        </div>
      </section>

      {/* =================================================
          FUTURE MODULES
      ================================================= */}

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-bold">
            Next Analysis Modules
          </h2>

          <p className="mt-1 text-sm text-muted">
            More automated intelligence will be added
            to the platform.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">

          {/* AutoML */}

          <div className="rounded-2xl border border-border bg-card p-6">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg">
              ML
            </div>

            <h3 className="mt-5 font-semibold">
              AutoML
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted">
              Train multiple machine-learning models
              and compare their performance.
            </p>

            <span className="mt-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              Coming next
            </span>

          </div>

          {/* AI Insights */}

          <div className="rounded-2xl border border-border bg-card p-6">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg">
              AI
            </div>

            <h3 className="mt-5 font-semibold">
              AI Insights
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted">
              Convert statistical findings into
              human-readable explanations.
            </p>

            <span className="mt-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              Coming soon
            </span>

          </div>

          {/* Explainability */}

          <div className="rounded-2xl border border-border bg-card p-6">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg">
              XAI
            </div>

            <h3 className="mt-5 font-semibold">
              Explainability
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted">
              Understand which features influence
              machine-learning predictions.
            </p>

            <span className="mt-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              Coming soon
            </span>

          </div>

          {/* Report */}

          <div className="rounded-2xl border border-border bg-card p-6">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg">
              PDF
            </div>

            <h3 className="mt-5 font-semibold">
              PDF Report
            </h3>

            <p className="mt-2 text-sm leading-6 text-muted">
              Generate a professional downloadable
              analytical report.
            </p>

            <span className="mt-4 inline-block rounded-full bg-secondary px-3 py-1 text-xs font-medium">
              Coming soon
            </span>

          </div>

        </div>
      </section>

    </div>
  );
}