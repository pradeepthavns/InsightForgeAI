"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";


// ============================================================
// TYPES
// ============================================================

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


type EDAData = {
  dataset_id: string;
  filename: string;

  numeric_columns: string[];
  categorical_columns: string[];

  numeric_statistics: Record<
    string,
    NumericStatistic
  >;

  categorical_statistics: Record<
    string,
    CategoricalStatistic
  >;

  correlation_matrix: {
    columns: string[];
    values: number[][];
  };
};


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


type AutoMLResult = {
  model: string;

  accuracy: number;

  precision: number;

  recall: number;

  f1_score: number;
};


type AutoMLResponse = {
  problem_type: string;

  models_tested: number;

  results: AutoMLResult[];
};


type AutoMLData = {
  dataset_id: string;

  filename: string;

  target: string;

  preprocessing: PreprocessingSummary;

  automl: AutoMLResponse;
};


type DashboardProps = {
  datasetId: string;
};


// ============================================================
// MAIN DASHBOARD
// ============================================================

export default function Dashboard({
  datasetId,
}: DashboardProps) {

  const [profile, setProfile] =
    useState<DatasetProfile | null>(null);

  const [eda, setEda] =
    useState<EDAData | null>(null);

  const [findings, setFindings] =
    useState<Finding[]>([]);

  const [targetDetection, setTargetDetection] =
    useState<TargetDetection | null>(null);

  const [selectedTarget, setSelectedTarget] =
    useState("");

  const [preprocessing, setPreprocessing] =
    useState<PreprocessingSummary | null>(null);

  const [automlData, setAutomlData] =
    useState<AutoMLData | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isPreparing, setIsPreparing] =
    useState(false);

  const [isRunningAutoML, setIsRunningAutoML] =
    useState(false);

  const [error, setError] =
    useState("");

  const [automlError, setAutomlError] =
    useState("");


  // ============================================================
  // FETCH DASHBOARD DATA
  // ============================================================

  useEffect(() => {

    async function loadDashboard() {

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
            "Could not detect target column."
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
          findingsData.findings ?? []
        );

        setTargetDetection(
          targetData
        );


        if (
          targetData.recommended_target
        ) {
          setSelectedTarget(
            targetData.recommended_target
          );
        }

      } catch (err) {

        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );

      } finally {

        setIsLoading(false);

      }
    }


    loadDashboard();

  }, [datasetId]);


  // ============================================================
  // PREPARE DATASET
  // ============================================================

  async function handlePrepareDataset() {

    if (!selectedTarget) {
      return;
    }

    try {

      setIsPreparing(true);

      setError("");

      const response =
        await fetch(
          `${API_URL}/dataset/${datasetId}/preprocess?target=${encodeURIComponent(
            selectedTarget
          )}`
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
            "Could not prepare dataset."
        );

      }


      setPreprocessing(data);

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Could not prepare dataset."
      );

    } finally {

      setIsPreparing(false);

    }
  }


  // ============================================================
  // RUN AUTOML
  // ============================================================

  async function handleRunAutoML() {

    if (!selectedTarget) {
      return;
    }

    try {

      setIsRunningAutoML(true);

      setAutomlError("");

      const response =
        await fetch(
          `${API_URL}/dataset/${datasetId}/automl?target=${encodeURIComponent(
            selectedTarget
          )}`
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.detail ||
            "Could not run AutoML."
        );

      }


      setAutomlData(data);

      setPreprocessing(
        data.preprocessing
      );

    } catch (err) {

      setAutomlError(
        err instanceof Error
          ? err.message
          : "Could not run AutoML."
      );

    } finally {

      setIsRunningAutoML(false);

    }
  }


  // ============================================================
  // LOADING STATE
  // ============================================================

  if (isLoading) {

    return (
      <div className="flex min-h-[400px] items-center justify-center">

        <div className="text-center">

          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-primary" />

          <p className="text-muted">
            Loading dashboard...
          </p>

        </div>

      </div>
    );
  }


  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error && !profile) {

    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">

        <h2 className="text-xl font-semibold text-red-500">
          Unable to Load Dashboard
        </h2>

        <p className="mt-2 text-muted">
          {error}
        </p>

      </div>
    );
  }


  if (!profile || !eda) {

    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">

        <h2 className="text-xl font-semibold">
          No Dashboard Data
        </h2>

        <p className="mt-2 text-muted">
          Dataset information could not be loaded.
        </p>

      </div>
    );
  }


  // ============================================================
  // MISSING VALUES
  // ============================================================

  const missingValues =
    Object.entries(
      profile.missing_percentages
    );


  const maxMissingPercentage =
    Math.max(
      ...missingValues.map(
        ([, percentage]) =>
          percentage
      ),
      0
    );


  // ============================================================
  // CORRELATION HEATMAP HELPERS
  // ============================================================

  function getCorrelationColor(
    value: number
  ) {

    if (value >= 0) {

      const intensity =
        Math.min(
          Math.abs(value),
          1
        );

      return `rgba(34, 197, 94, ${0.12 + intensity * 0.75})`;

    }

    const intensity =
      Math.min(
        Math.abs(value),
        1
      );

    return `rgba(239, 68, 68, ${0.12 + intensity * 0.75})`;
  }


  function getCorrelationTextColor(
    value: number
  ) {

    return Math.abs(value) >= 0.55
      ? "white"
      : "inherit";
  }


  // ============================================================
  // CHART DATA
  // ============================================================

  const categoricalChartData =
    eda.categorical_columns
      .slice(0, 6)
      .map((column) => {

        const statistics =
          eda.categorical_statistics[
            column
          ];

        const first =
          statistics?.top_values?.[0];

        return {
          column,
          count:
            first?.count ?? 0,
        };
      });


  const numericRangeData =
    eda.numeric_columns
      .slice(0, 8)
      .map((column) => {

        const statistics =
          eda.numeric_statistics[
            column
          ];

        return {
          column,
          min:
            statistics?.min ?? 0,
          max:
            statistics?.max ?? 0,
          mean:
            statistics?.mean ?? 0,
        };
      });


  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="space-y-8">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">

          <div>

            <p className="text-sm font-medium text-primary">
              INSIGHTFORGEAI DASHBOARD
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              {profile.filename}
            </h1>

            <p className="mt-2 text-muted">
              Automated data analysis, quality assessment,
              EDA and machine-learning preparation.
            </p>

          </div>


          <div className="rounded-xl border border-border bg-card px-4 py-3">

            <p className="text-xs text-muted">
              Dataset ID
            </p>

            <p className="mt-1 max-w-[260px] truncate font-mono text-xs">
              {profile.dataset_id}
            </p>

          </div>

        </div>

      </div>


      {/* ======================================================
          GLOBAL ERROR
      ====================================================== */}

      {error && (

        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500">

          {error}

        </div>

      )}


      {/* ======================================================
          DATASET OVERVIEW
      ====================================================== */}

      <section>

        <SectionTitle
          title="Dataset Overview"
          description="A high-level summary of the uploaded dataset."
        />


        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <StatCard
            label="Rows"
            value={profile.rows}
          />

          <StatCard
            label="Columns"
            value={profile.columns}
          />

          <StatCard
            label="Duplicates"
            value={profile.duplicate_rows}
          />

          <StatCard
            label="Missing Values"
            value={profile.total_missing_values}
          />

          <StatCard
            label="Quality Score"
            value={`${profile.data_quality_score}/100`}
          />

        </div>

      </section>


      {/* ======================================================
          DATA QUALITY
      ====================================================== */}

      <section>

        <SectionTitle
          title="Data Quality"
          description="Potential issues detected in the dataset."
        />


        <div className="grid gap-6 lg:grid-cols-2">


          {/* MISSING VALUES */}

          <DashboardCard
            title="Missing Values"
            description="Percentage of missing values in each column."
          >

            {missingValues.length === 0 ? (

              <EmptyMessage text="No columns found." />

            ) : (

              <div className="mt-5 space-y-5">

                {missingValues.map(
                  ([column, percentage]) => {

                    const relativeWidth =
                      maxMissingPercentage > 0
                        ? (
                            percentage /
                            maxMissingPercentage
                          ) * 100
                        : 0;


                    const visibleWidth =
                      percentage === 0
                        ? 0
                        : Math.max(
                            relativeWidth,
                            4
                          );


                    return (
                      <div key={column}>

                        <div className="flex items-center justify-between gap-4 text-sm">

                          <span className="truncate font-medium">
                            {column}
                          </span>

                          <span className="shrink-0 font-semibold">
                            {percentage}%
                          </span>

                        </div>


                        {/* Progress track */}

                        <div
                          className="mt-2 w-full overflow-hidden rounded-full"
                          style={{
                            height: "10px",
                            backgroundColor:
                              "rgba(148, 163, 184, 0.20)",
                          }}
                        >

                          {/* Progress fill */}

                          <div
                            className="rounded-full transition-all duration-700"
                            style={{
                              width:
                                percentage === 0
                                  ? "0%"
                                  : `${visibleWidth}%`,

                              height: "100%",

                              minWidth:
                                percentage > 0
                                  ? "6px"
                                  : "0px",

                              backgroundColor:
                                percentage >= 20
                                  ? "#ef4444"
                                  : percentage > 0
                                  ? "#f59e0b"
                                  : "transparent",
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            )}

          </DashboardCard>


          {/* DUPLICATES */}

          <DashboardCard
            title="Duplicate Analysis"
            description="Duplicate rows detected in the dataset."
          >

            <div className="mt-5 grid grid-cols-2 gap-4">

              <MiniMetric
                label="Duplicate Rows"
                value={
                  profile.duplicate_rows
                }
              />

              <MiniMetric
                label="Duplicate %"
                value={`${profile.duplicate_percentage}%`}
              />

            </div>


            <div className="mt-5 rounded-xl bg-muted/10 p-4">

              {profile.duplicate_rows === 0 ? (

                <p className="text-sm text-muted">
                  No duplicate rows were detected.
                </p>

              ) : (

                <p className="text-sm text-muted">
                  Duplicate records were detected.
                  Consider reviewing them before
                  model training.
                </p>

              )}

            </div>

          </DashboardCard>


          {/* CONSTANT COLUMNS */}

          <DashboardCard
            title="Constant Columns"
            description="Columns containing only one unique value."
          >

            {profile.constant_columns.length === 0 ? (

              <EmptyMessage text="No constant columns detected." />

            ) : (

              <div className="mt-5 flex flex-wrap gap-2">

                {profile.constant_columns.map(
                  (column) => (

                    <Badge
                      key={column}
                      variant="warning"
                    >
                      {column}
                    </Badge>

                  )
                )}

              </div>

            )}

          </DashboardCard>


          {/* ID-LIKE COLUMNS */}

          <DashboardCard
            title="Potential ID-like Columns"
            description="High-cardinality columns that may represent identifiers."
          >

            {profile.id_like_columns.length === 0 ? (

              <EmptyMessage text="No obvious ID-like columns detected." />

            ) : (

              <div className="mt-5 flex flex-wrap gap-2">

                {profile.id_like_columns.map(
                  (column) => (

                    <Badge
                      key={column}
                      variant="info"
                    >
                      {column}
                    </Badge>

                  )
                )}

              </div>

            )}

          </DashboardCard>

        </div>

      </section>


      {/* ======================================================
          OUTLIERS
      ====================================================== */}

      <section>

        <SectionTitle
          title="Outlier Analysis"
          description="Potential numeric outliers detected using the IQR method."
        />


        <DashboardCard
          title="Numeric Outliers"
          description="Columns with values outside the IQR-based boundaries."
        >

          {Object.keys(
            profile.outlier_counts
          ).length === 0 ? (

            <EmptyMessage text="No numeric columns found." />

          ) : (

            <div className="mt-5 space-y-4">

              {Object.entries(
                profile.outlier_counts
              ).map(
                ([column, count]) => (

                  <div
                    key={column}
                    className="flex items-center justify-between rounded-xl border border-border p-4"
                  >

                    <div>

                      <p className="font-medium">
                        {column}
                      </p>

                      <p className="mt-1 text-sm text-muted">
                        {profile.outlier_percentages[
                          column
                        ] ?? 0}
                        % of rows
                      </p>

                    </div>


                    <div className="text-right">

                      <p className="text-lg font-bold">
                        {count}
                      </p>

                      <p className="text-xs text-muted">
                        potential outliers
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </DashboardCard>

      </section>


      {/* ======================================================
          AUTOMATED FINDINGS
      ====================================================== */}

      <section>

        <SectionTitle
          title="Automated Findings"
          description="Rule-based insights generated from the dataset."
        />


        {findings.length === 0 ? (

          <DashboardCard
            title="No Findings"
            description="No significant patterns were detected."
          >

            <EmptyMessage text="The analysis did not generate any findings." />

          </DashboardCard>

        ) : (

          <div className="grid gap-4 lg:grid-cols-2">

            {findings.map(
              (finding, index) => (

                <FindingCard
                  key={`${finding.title}-${index}`}
                  finding={finding}
                />

              )
            )}

          </div>

        )}

      </section>


      {/* ======================================================
          TARGET + PREPROCESSING
      ====================================================== */}

      <section>

        <SectionTitle
          title="Machine Learning Preparation"
          description="Identify the prediction target and prepare the dataset for machine learning."
        />


        <div className="grid gap-6 lg:grid-cols-2">


          {/* TARGET DETECTION */}

          <DashboardCard
            title="Target Detection"
            description="Automatically identify a likely target column."
          >

            {targetDetection ? (

              <div className="mt-5 space-y-5">

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                    <div>

                      <p className="text-xs font-medium uppercase tracking-wide text-muted">
                        Recommended Target
                      </p>

                      <p className="mt-1 text-2xl font-bold">
                        {targetDetection.recommended_target ??
                          "None detected"}
                      </p>

                    </div>


                    <div className="flex gap-2">

                      <Badge variant="info">
                        {targetDetection.problem_type}
                      </Badge>

                      <Badge variant="positive">
                        {targetDetection.confidence}
                      </Badge>

                    </div>

                  </div>


                  <p className="mt-4 text-sm leading-6 text-muted">
                    {targetDetection.reason}
                  </p>

                </div>


                <div>

                  <label className="text-sm font-medium">
                    Select Target Column
                  </label>

                  <select
                    value={selectedTarget}
                    onChange={(event) =>
                      setSelectedTarget(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary"
                  >

                    <option value="">
                      Select a target
                    </option>

                    {targetDetection.candidates.map(
                      (candidate) => (

                        <option
                          key={candidate.column}
                          value={candidate.column}
                        >
                          {candidate.column} —{" "}
                          {candidate.problem_type}
                        </option>

                      )
                    )}

                  </select>

                </div>


                <div className="grid grid-cols-2 gap-4">

                  <MiniMetric
                    label="Problem Type"
                    value={
                      targetDetection.problem_type
                    }
                  />

                  <MiniMetric
                    label="Confidence"
                    value={
                      targetDetection.confidence
                    }
                  />

                </div>

              </div>

            ) : (

              <EmptyMessage text="Target detection unavailable." />

            )}

          </DashboardCard>


          {/* PREPROCESSING */}

          <DashboardCard
            title="Preprocessing"
            description="Transform the raw dataset into machine-learning-ready data."
          >

            {!preprocessing ? (

              <div className="mt-5">

                <p className="text-sm leading-6 text-muted">
                  Select a target column and prepare the
                  dataset. InsightForgeAI will handle
                  missing values, encoding, scaling and
                  train/test splitting.
                </p>


                <button
                  onClick={
                    handlePrepareDataset
                  }
                  disabled={
                    !selectedTarget ||
                    isPreparing
                  }
                  className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {isPreparing
                    ? "Preparing Dataset..."
                    : "Prepare Dataset"}

                </button>

              </div>

            ) : (

              <div className="mt-5 space-y-5">

                <div className="grid grid-cols-2 gap-4">

                  <MiniMetric
                    label="Train Rows"
                    value={
                      preprocessing.train_rows
                    }
                  />

                  <MiniMetric
                    label="Test Rows"
                    value={
                      preprocessing.test_rows
                    }
                  />

                  <MiniMetric
                    label="Features"
                    value={
                      preprocessing.processed_features
                    }
                  />

                  <MiniMetric
                    label="Problem"
                    value={
                      preprocessing.problem_type
                    }
                  />

                </div>


                <div>

                  <p className="text-sm font-semibold">
                    Applied Steps
                  </p>

                  <div className="mt-3 space-y-2">

                    {preprocessing.steps.map(
                      (step, index) => (

                        <div
                          key={index}
                          className="rounded-lg bg-muted/10 px-3 py-2 text-sm text-muted"
                        >
                          ✓ {step}
                        </div>

                      )
                    )}

                  </div>

                </div>


                <button
                  onClick={
                    handlePrepareDataset
                  }
                  disabled={
                    !selectedTarget ||
                    isPreparing
                  }
                  className="w-full rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-muted/20 disabled:opacity-50"
                >

                  {isPreparing
                    ? "Preparing..."
                    : "Prepare Again"}

                </button>

              </div>

            )}

          </DashboardCard>

        </div>

      </section>


      {/* ======================================================
          AUTOML
      ====================================================== */}

      <section>

        <SectionTitle
          title="AutoML"
          description="Train and compare multiple machine-learning models automatically."
        />


        <DashboardCard
          title="Automated Model Comparison"
          description="InsightForgeAI trains several baseline classification models and compares their performance."
        >

          <div className="mt-5">


            {!automlData ? (

              <div>

                <div className="rounded-xl border border-border bg-muted/5 p-5">

                  <p className="font-medium">
                    Ready to train models
                  </p>

                  <p className="mt-2 text-sm leading-6 text-muted">
                    Target column:{" "}
                    <span className="font-semibold text-foreground">
                      {selectedTarget ||
                        "Not selected"}
                    </span>
                  </p>

                </div>


                {automlError && (

                  <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-500">
                    {automlError}
                  </div>

                )}


                <button
                  onClick={
                    handleRunAutoML
                  }
                  disabled={
                    !selectedTarget ||
                    isRunningAutoML
                  }
                  className="mt-5 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >

                  {isRunningAutoML
                    ? "Training Models..."
                    : "Run AutoML"}

                </button>

              </div>

            ) : (

              <div className="space-y-6">


                {/* Leaderboard */}

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[650px] text-left text-sm">

                    <thead>

                      <tr className="border-b border-border">

                        <th className="px-4 py-3 font-semibold">
                          Model
                        </th>

                        <th className="px-4 py-3 font-semibold">
                          Accuracy
                        </th>

                        <th className="px-4 py-3 font-semibold">
                          Precision
                        </th>

                        <th className="px-4 py-3 font-semibold">
                          Recall
                        </th>

                        <th className="px-4 py-3 font-semibold">
                          F1 Score
                        </th>

                      </tr>

                    </thead>


                    <tbody>

                      {automlData.automl.results.map(
                        (result, index) => (

                          <tr
                            key={result.model}
                            className="border-b border-border last:border-0"
                          >

                            <td className="px-4 py-4">

                              <div className="flex items-center gap-3">

                                {index === 0 && (

                                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                    Best
                                  </span>

                                )}

                                <span className="font-medium">
                                  {result.model}
                                </span>

                              </div>

                            </td>

                            <td className="px-4 py-4">
                              {formatMetric(
                                result.accuracy
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {formatMetric(
                                result.precision
                              )}
                            </td>

                            <td className="px-4 py-4">
                              {formatMetric(
                                result.recall
                              )}
                            </td>

                            <td className="px-4 py-4 font-semibold">
                              {formatMetric(
                                result.f1_score
                              )}
                            </td>

                          </tr>

                        )
                      )}

                    </tbody>

                  </table>

                </div>


                <div className="grid gap-4 sm:grid-cols-3">

                  <MiniMetric
                    label="Models Tested"
                    value={
                      automlData.automl
                        .models_tested
                    }
                  />

                  <MiniMetric
                    label="Target"
                    value={
                      automlData.target
                    }
                  />

                  <MiniMetric
                    label="Problem"
                    value={
                      automlData.automl
                        .problem_type
                    }
                  />

                </div>


                <button
                  onClick={
                    handleRunAutoML
                  }
                  disabled={
                    !selectedTarget ||
                    isRunningAutoML
                  }
                  className="w-full rounded-xl border border-border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-muted/20 disabled:opacity-50"
                >

                  {isRunningAutoML
                    ? "Training..."
                    : "Run AutoML Again"}

                </button>

              </div>

            )}

          </div>

        </DashboardCard>

      </section>


      {/* ======================================================
          AUTOMATED EDA
      ====================================================== */}

      <section>

        <SectionTitle
          title="Automated EDA"
          description="Automatically generated statistical and visual analysis."
        />


        <div className="grid gap-6 lg:grid-cols-2">


          {/* NUMERIC STATISTICS */}

          <DashboardCard
            title="Numeric Statistics"
            description="Descriptive statistics for numeric columns."
          >

            {eda.numeric_columns.length === 0 ? (

              <EmptyMessage text="No numeric columns detected." />

            ) : (

              <div className="mt-5 overflow-x-auto">

                <table className="w-full min-w-[700px] text-left text-sm">

                  <thead>

                    <tr className="border-b border-border">

                      <th className="px-3 py-3">
                        Column
                      </th>

                      <th className="px-3 py-3">
                        Mean
                      </th>

                      <th className="px-3 py-3">
                        Median
                      </th>

                      <th className="px-3 py-3">
                        Std
                      </th>

                      <th className="px-3 py-3">
                        Min
                      </th>

                      <th className="px-3 py-3">
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

                            <td className="px-3 py-3 font-medium">
                              {column}
                            </td>

                            <td className="px-3 py-3">
                              {stats?.mean ?? "-"}
                            </td>

                            <td className="px-3 py-3">
                              {stats?.median ?? "-"}
                            </td>

                            <td className="px-3 py-3">
                              {stats?.std ?? "-"}
                            </td>

                            <td className="px-3 py-3">
                              {stats?.min ?? "-"}
                            </td>

                            <td className="px-3 py-3">
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

          </DashboardCard>


          {/* NUMERIC RANGE */}

          <DashboardCard
            title="Numeric Range Overview"
            description="Minimum, average and maximum values for numeric features."
          >

            {numericRangeData.length === 0 ? (

              <EmptyMessage text="No numeric data available." />

            ) : (

              <div className="mt-5 h-[320px] w-full">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <LineChart
                    data={numericRangeData}
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
                      dataKey="column"
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
                      stroke="currentColor"
                      strokeWidth={2}
                      dot={false}
                    />

                    <Line
                      type="monotone"
                      dataKey="mean"
                      name="Mean"
                      stroke="currentColor"
                      strokeWidth={3}
                    />

                    <Line
                      type="monotone"
                      dataKey="max"
                      name="Maximum"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            )}

          </DashboardCard>


          {/* CATEGORICAL DISTRIBUTIONS */}

          <DashboardCard
            title="Categorical Distributions"
            description="Most frequent values across categorical columns."
          >

            {categoricalChartData.length === 0 ? (

              <EmptyMessage text="No categorical columns detected." />

            ) : (

              <div className="mt-5 h-[320px] w-full">

                <ResponsiveContainer
                  width="100%"
                  height="100%"
                >

                  <BarChart
                    data={categoricalChartData}
                    margin={{
                      top: 10,
                      right: 10,
                      left: 0,
                      bottom: 30,
                    }}
                  >

                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.2}
                    />

                    <XAxis
                      dataKey="column"
                      angle={-25}
                      textAnchor="end"
                      height={60}
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

                    <Bar
                      dataKey="count"
                      name="Top category count"
                      fill="currentColor"
                      radius={[
                        6,
                        6,
                        0,
                        0,
                      ]}
                    />

                  </BarChart>

                </ResponsiveContainer>

              </div>

            )}

          </DashboardCard>


          {/* CATEGORICAL DETAILS */}

          <DashboardCard
            title="Categorical Details"
            description="Most common values in categorical features."
          >

            {eda.categorical_columns.length === 0 ? (

              <EmptyMessage text="No categorical columns detected." />

            ) : (

              <div className="mt-5 space-y-4">

                {eda.categorical_columns
                  .slice(0, 6)
                  .map((column) => {

                    const stats =
                      eda.categorical_statistics[
                        column
                      ];


                    return (
                      <div
                        key={column}
                        className="rounded-xl border border-border p-4"
                      >

                        <div className="flex items-center justify-between">

                          <p className="font-medium">
                            {column}
                          </p>

                          <span className="text-xs text-muted">
                            {stats?.unique_values ??
                              0}{" "}
                            unique
                          </span>

                        </div>


                        <div className="mt-3 space-y-2">

                          {(
                            stats?.top_values ??
                            []
                          )
                            .slice(0, 4)
                            .map(
                              (value) => (

                                <div
                                  key={`${column}-${value.value}`}
                                  className="flex items-center justify-between text-sm"
                                >

                                  <span className="truncate text-muted">
                                    {value.value}
                                  </span>

                                  <span className="font-medium">
                                    {value.count}
                                  </span>

                                </div>

                              )
                            )}

                        </div>

                      </div>
                    );
                  })}

              </div>

            )}

          </DashboardCard>

        </div>

      </section>


      {/* ======================================================
          CORRELATION HEATMAP
      ====================================================== */}

      <section>

        <SectionTitle
          title="Correlation Analysis"
          description="Pearson correlation between numeric variables."
        />


        <DashboardCard
          title="Correlation Heatmap"
          description="Green represents positive correlation, red represents negative correlation."
        >

          {eda.correlation_matrix.columns.length <
          2 ? (

            <EmptyMessage text="At least two numeric columns are required to calculate correlations." />

          ) : (

            <div className="mt-5 overflow-x-auto">

              <div
                className="inline-block min-w-full"
                style={{
                  minWidth:
                    Math.max(
                      500,
                      eda.correlation_matrix
                        .columns.length *
                        100
                    ),
                }}
              >

                {/* Column headers */}

                <div className="flex">

                  <div
                    className="shrink-0"
                    style={{
                      width: "150px",
                    }}
                  />

                  {eda.correlation_matrix.columns.map(
                    (column) => (

                      <div
                        key={column}
                        className="flex items-end justify-center px-2 pb-2 text-center text-xs font-medium"
                        style={{
                          width: "90px",
                          height: "80px",
                          writingMode:
                            "vertical-rl",
                          transform:
                            "rotate(180deg)",
                        }}
                      >
                        {column}
                      </div>

                    )
                  )}

                </div>


                {/* Heatmap rows */}

                {eda.correlation_matrix.values.map(
                  (row, rowIndex) => (

                    <div
                      key={
                        eda.correlation_matrix
                          .columns[rowIndex]
                      }
                      className="flex"
                    >

                      <div
                        className="flex shrink-0 items-center px-3 text-xs font-medium"
                        style={{
                          width: "150px",
                        }}
                      >

                        {
                          eda
                            .correlation_matrix
                            .columns[
                            rowIndex
                          ]
                        }

                      </div>


                      {row.map(
                        (
                          correlation,
                          columnIndex
                        ) => (

                          <div
                            key={`${rowIndex}-${columnIndex}`}
                            className="flex items-center justify-center border border-background text-xs font-semibold transition-transform hover:z-10 hover:scale-105"
                            style={{
                              width: "90px",
                              height: "60px",

                              backgroundColor:
                                getCorrelationColor(
                                  correlation
                                ),

                              color:
                                getCorrelationTextColor(
                                  correlation
                                ),
                            }}
                            title={`${eda.correlation_matrix.columns[rowIndex]} vs ${eda.correlation_matrix.columns[columnIndex]}: ${correlation.toFixed(
                              3
                            )}`}
                          >

                            {correlation.toFixed(
                              2
                            )}

                          </div>

                        )
                      )}

                    </div>

                  )
                )}

              </div>

            </div>

          )}

        </DashboardCard>

      </section>


      {/* ======================================================
          COLUMN INFORMATION
      ====================================================== */}

      <section>

        <SectionTitle
          title="Column Information"
          description="Schema and cardinality information for every column."
        />


        <DashboardCard
          title="Dataset Schema"
          description="Data types and unique-value counts."
        >

          <div className="mt-5 overflow-x-auto">

            <table className="w-full min-w-[700px] text-left text-sm">

              <thead>

                <tr className="border-b border-border">

                  <th className="px-4 py-3">
                    Column
                  </th>

                  <th className="px-4 py-3">
                    Data Type
                  </th>

                  <th className="px-4 py-3">
                    Unique Values
                  </th>

                  <th className="px-4 py-3">
                    Missing
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

                      <td className="px-4 py-4 font-medium">
                        {column}
                      </td>

                      <td className="px-4 py-4">

                        <Badge variant="info">
                          {
                            profile
                              .data_types[
                              column
                            ]
                          }
                        </Badge>

                      </td>

                      <td className="px-4 py-4">
                        {
                          profile
                            .unique_values[
                            column
                          ]
                        }
                      </td>

                      <td className="px-4 py-4">

                        {profile.missing_values[
                          column
                        ] ?? 0}

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        </DashboardCard>

      </section>


      {/* ======================================================
          FUTURE MODULES
      ====================================================== */}

      <section>

        <SectionTitle
          title="Advanced Analysis"
          description="Additional intelligence planned for InsightForgeAI."
        />


        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <FutureModule
            title="AI Insights"
            description="LLM-powered explanations of important patterns and findings."
          />

          <FutureModule
            title="Explainability"
            description="Feature importance and model-level explanations."
          />

          <FutureModule
            title="Prediction"
            description="Use trained models to generate predictions for new records."
          />

          <FutureModule
            title="PDF Report"
            description="Download a professional automated data-analysis report."
          />

        </div>

      </section>


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="border-t border-border pt-6 text-center">

        <p className="text-sm text-muted">
          InsightForgeAI • Automated Data Intelligence Platform
        </p>

      </div>

    </div>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {

  return (
    <div className="rounded-2xl border border-border bg-card p-5">

      <p className="text-sm text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}


// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {

  return (
    <div className="mb-5">

      <h2 className="text-2xl font-bold">
        {title}
      </h2>

      <p className="mt-1 text-sm text-muted">
        {description}
      </p>

    </div>
  );
}


// ============================================================
// DASHBOARD CARD
// ============================================================

function DashboardCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {

  return (
    <div className="rounded-2xl border border-border bg-card p-6">

      <h3 className="text-lg font-semibold">
        {title}
      </h3>

      {description && (

        <p className="mt-1 text-sm text-muted">
          {description}
        </p>

      )}

      {children}

    </div>
  );
}


// ============================================================
// MINI METRIC
// ============================================================

function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {

  return (
    <div className="rounded-xl border border-border bg-muted/5 p-4">

      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 text-lg font-bold">
        {value}
      </p>

    </div>
  );
}


// ============================================================
// BADGE
// ============================================================

function Badge({
  children,
  variant = "info",
}: {
  children: React.ReactNode;

  variant?:
    | "info"
    | "warning"
    | "positive"
    | "negative";
}) {

  const styles = {

    info:
      "bg-blue-500/10 text-blue-500",

    warning:
      "bg-amber-500/10 text-amber-500",

    positive:
      "bg-green-500/10 text-green-500",

    negative:
      "bg-red-500/10 text-red-500",

  };


  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[variant]}`}
    >
      {children}
    </span>
  );
}


// ============================================================
// EMPTY MESSAGE
// ============================================================

function EmptyMessage({
  text,
}: {
  text: string;
}) {

  return (
    <div className="mt-5 rounded-xl bg-muted/10 p-4">

      <p className="text-sm text-muted">
        {text}
      </p>

    </div>
  );
}


// ============================================================
// FINDING CARD
// ============================================================

function FindingCard({
  finding,
}: {
  finding: Finding;
}) {

  const styles = {

    critical:
      "border-red-500/20 bg-red-500/5",

    warning:
      "border-amber-500/20 bg-amber-500/5",

    info:
      "border-blue-500/20 bg-blue-500/5",

    positive:
      "border-green-500/20 bg-green-500/5",

    negative:
      "border-red-500/20 bg-red-500/5",

  };


  const labels = {

    critical: "Critical",

    warning: "Warning",

    info: "Info",

    positive: "Positive",

    negative: "Negative",

  };


  return (
    <div
      className={`rounded-2xl border p-5 ${styles[finding.type]}`}
    >

      <div className="flex items-center justify-between gap-4">

        <h3 className="font-semibold">
          {finding.title}
        </h3>

        <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-medium">
          {labels[finding.type]}
        </span>

      </div>


      <p className="mt-3 text-sm leading-6 text-muted">
        {finding.message}
      </p>

    </div>
  );
}


// ============================================================
// FUTURE MODULE
// ============================================================

function FutureModule({
  title,
  description,
}: {
  title: string;
  description: string;
}) {

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-5">

      <div className="flex items-center justify-between">

        <h3 className="font-semibold">
          {title}
        </h3>

        <span className="rounded-full bg-muted/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Coming Next
        </span>

      </div>


      <p className="mt-3 text-sm leading-6 text-muted">
        {description}
      </p>

    </div>
  );
}


// ============================================================
// FORMAT METRIC
// ============================================================

function formatMetric(
  value: number
) {

  return `${(value * 100).toFixed(2)}%`;
}