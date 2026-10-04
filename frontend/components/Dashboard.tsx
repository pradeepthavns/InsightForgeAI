"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API_URL = "http://127.0.0.1:8000";

/* ========================================================= */
/* TYPES */
/* ========================================================= */

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
  type: string;
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
  dataset_id: string;
  filename: string;
  target: string;
  preprocessing: PreprocessingSummary;
  automl: {
    problem_type: string;
    models_tested: number;
    results: AutoMLResult[];
  };
};

type AIInsightsResponse = {
  dataset_id: string;
  filename: string;
  insights: string;
};

type DashboardProps = {
  datasetId: string;
};

/* ========================================================= */
/* MAIN DASHBOARD */
/* ========================================================= */

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
    useState<AutoMLResponse | null>(null);

  const [aiInsights, setAiInsights] =
    useState<string>("");

  const [isLoading, setIsLoading] =
    useState(true);

  const [isPreparing, setIsPreparing] =
    useState(false);

  const [isRunningAutoML, setIsRunningAutoML] =
    useState(false);

  const [isLoadingAI, setIsLoadingAI] =
    useState(false);

  const [error, setError] =
    useState("");

  const [automlError, setAutomlError] =
    useState("");

  const [aiError, setAiError] =
    useState("");

  /* ========================================================= */
  /* INITIAL DASHBOARD LOAD */
  /* ========================================================= */

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

        if (
          !profileResponse.ok ||
          !edaResponse.ok ||
          !findingsResponse.ok ||
          !targetResponse.ok
        ) {
          throw new Error(
            "Could not load dashboard data."
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

        if (
          targetData.recommended_target
        ) {
          setSelectedTarget(
            targetData.recommended_target
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          "Failed to load dashboard data."
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [datasetId]);

  /* ========================================================= */
  /* PREPARE DATASET */
  /* ========================================================= */

  async function handlePrepareDataset() {
    if (!selectedTarget) {
      return;
    }

    try {
      setIsPreparing(true);
      setError("");

      const response = await fetch(
        `${API_URL}/dataset/${datasetId}/preprocess?target=${encodeURIComponent(
          selectedTarget
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail ||
            "Could not prepare dataset."
        );
      }

      setPreprocessing(
        data.preprocessing
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not prepare dataset."
      );
    } finally {
      setIsPreparing(false);
    }
  }

  /* ========================================================= */
  /* RUN AUTOML */
  /* ========================================================= */

  async function handleRunAutoML() {
    if (!selectedTarget) {
      return;
    }

    try {
      setIsRunningAutoML(true);
      setAutomlError("");

      const response = await fetch(
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
      console.error(err);

      setAutomlError(
        err instanceof Error
          ? err.message
          : "Could not run AutoML."
      );
    } finally {
      setIsRunningAutoML(false);
    }
  }

  /* ========================================================= */
  /* LOAD AI INSIGHTS */
  /* ========================================================= */

  async function handleLoadAIInsights() {
    try {
      setIsLoadingAI(true);
      setAiError("");

      const response = await fetch(
        `${API_URL}/dataset/${datasetId}/ai-insights`
      );

      const data =
        (await response.json()) as
          | AIInsightsResponse
          | { detail?: string };

      if (!response.ok) {
        throw new Error(
          "detail" in data && data.detail
            ? data.detail
            : "Could not generate AI insights."
        );
      }

      setAiInsights(
        (data as AIInsightsResponse).insights
      );
    } catch (err) {
      console.error(err);

      setAiError(
        err instanceof Error
          ? err.message
          : "Could not generate AI insights."
      );
    } finally {
      setIsLoadingAI(false);
    }
  }

  /* ========================================================= */
  /* LOADING STATE */
  /* ========================================================= */

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">
            ⏳
          </div>

          <h2 className="text-xl font-semibold">
            Loading Dashboard...
          </h2>

          <p className="mt-2 text-muted">
            Analyzing your dataset.
          </p>
        </div>
      </div>
    );
  }

  /* ========================================================= */
  /* ERROR STATE */
  /* ========================================================= */

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <h2 className="text-xl font-bold text-red-700">
          Something went wrong
        </h2>

        <p className="mt-2 text-red-600">
          {error}
        </p>
      </div>
    );
  }

  if (!profile || !eda) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-xl font-bold">
          No dataset information found
        </h2>
      </div>
    );
  }

  /* ========================================================= */
  /* PREPARE CHART DATA */
  /* ========================================================= */

  const categoricalCharts =
    eda.categorical_columns.slice(0, 4);

  const missingValues = Object.entries(
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

  /* ========================================================= */
  /* RENDER */
  /* ========================================================= */

  return (
    <div className="space-y-10">

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <div>
        <p className="text-sm font-medium text-muted">
          InsightForgeAI Dashboard
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {profile.filename}
        </h1>

        <p className="mt-2 text-muted">
          Automated dataset profiling,
          data quality analysis and EDA
        </p>
      </div>


      {/* ===================================================== */}
      {/* DATASET OVERVIEW */}
      {/* ===================================================== */}

      <section>
        <h2 className="mb-4 text-2xl font-bold">
          Dataset Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">

          <StatCard
            label="Rows"
            value={profile.rows.toLocaleString()}
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


      {/* ===================================================== */}
      {/* DATA QUALITY */}
      {/* ===================================================== */}

      <section>
        <h2 className="mb-4 text-2xl font-bold">
          Data Quality
        </h2>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Missing Values */}

          <DashboardCard
            title="Missing Values"
          >

            <div className="space-y-4">

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

                  const count =
                    profile.missing_values[
                      column
                    ] ?? 0;

                  return (
                    <div key={column}>

                      <div className="flex items-center justify-between gap-4 text-sm">

                        <span className="font-medium">
                          {column}
                        </span>

                        <span className="font-semibold">
                          {count} (
                          {percentage}%)
                        </span>

                      </div>

                      <div
                        className="mt-2 w-full overflow-hidden rounded-full"
                        style={{
                          height: "10px",
                          backgroundColor:
                            "rgba(148, 163, 184, 0.20)",
                        }}
                      >

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

          </DashboardCard>


          {/* Duplicate Analysis */}

          <DashboardCard
            title="Duplicate Analysis"
          >

            <p className="text-3xl font-bold">
              {profile.duplicate_rows}
            </p>

            <p className="text-muted">
              duplicate rows
            </p>

            <p className="mt-2 text-sm text-muted">
              {profile.duplicate_percentage}%
              of the dataset
            </p>

          </DashboardCard>


          {/* Constant Columns */}

          <DashboardCard
            title="Constant Columns"
          >

            {profile.constant_columns
              .length === 0 ? (

              <p className="text-muted">
                No constant columns detected.
              </p>

            ) : (

              <ul className="space-y-2">

                {profile.constant_columns.map(
                  (column) => (
                    <li key={column}>
                      • {column}
                    </li>
                  )
                )}

              </ul>

            )}

          </DashboardCard>


          {/* ID-like Columns */}

          <DashboardCard
            title="Potential ID-like Columns"
          >

            {profile.id_like_columns
              .length === 0 ? (

              <p className="text-muted">
                No ID-like columns detected.
              </p>

            ) : (

              <ul className="space-y-2">

                {profile.id_like_columns.map(
                  (column) => (
                    <li key={column}>
                      • {column}
                    </li>
                  )
                )}

              </ul>

            )}

          </DashboardCard>

        </div>
      </section>


      {/* ===================================================== */}
      {/* AUTOMATED FINDINGS */}
      {/* ===================================================== */}

      <section>

        <div className="mb-6">
          <p className="text-sm font-medium text-muted">
            Automated Analysis
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Automated Findings
          </h2>

          <p className="mt-2 text-muted">
            Important patterns and potential data-quality
            issues identified automatically.
          </p>
        </div>

        {findings.length === 0 ? (

          <DashboardCard title="Findings">
            <p className="text-muted">
              No significant findings were detected.
            </p>
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


      {/* ===================================================== */}
      {/* TARGET + PREPROCESSING */}
      {/* ===================================================== */}

      <section>

        <div className="mb-6">
          <p className="text-sm font-medium text-muted">
            Machine Learning Preparation
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Target Detection & Preprocessing
          </h2>

          <p className="mt-2 text-muted">
            Identify the prediction target and prepare the
            dataset for machine-learning models.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">

          {/* Target Detection */}

          <DashboardCard
            title="Target Detection"
          >

            {targetDetection ? (

              <div className="space-y-5">

                <div>
                  <p className="text-sm text-muted">
                    Recommended Target
                  </p>

                  <p className="mt-1 text-xl font-bold">
                    {targetDetection.recommended_target ||
                      "No target detected"}
                  </p>
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

                <div className="rounded-lg border border-border bg-background p-4">

                  <p className="text-sm font-medium">
                    Why this target?
                  </p>

                  <p className="mt-2 text-sm text-muted">
                    {targetDetection.reason}
                  </p>

                </div>

                <div>

                  <label className="text-sm font-medium">
                    Target Column
                  </label>

                  <select
                    value={selectedTarget}
                    onChange={(event) =>
                      setSelectedTarget(
                        event.target.value
                      )
                    }
                    className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 outline-none"
                  >

                    <option value="">
                      Select target
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

                <button
                  type="button"
                  onClick={
                    handlePrepareDataset
                  }
                  disabled={
                    !selectedTarget ||
                    isPreparing
                  }
                  className="w-full rounded-lg bg-foreground px-4 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPreparing
                    ? "Preparing Dataset..."
                    : "Prepare Dataset"}
                </button>

              </div>

            ) : (

              <p className="text-muted">
                Target detection information is unavailable.
              </p>

            )}

          </DashboardCard>


          {/* Preprocessing */}

          <DashboardCard
            title="Preprocessing Summary"
          >

            {!preprocessing ? (

              <div>

                <p className="text-muted">
                  Select a target and click
                  "Prepare Dataset" to see the
                  preprocessing pipeline.
                </p>

              </div>

            ) : (

              <div className="space-y-5">

                <div className="grid grid-cols-2 gap-4">

                  <MiniMetric
                    label="Problem Type"
                    value={
                      preprocessing.problem_type
                    }
                  />

                  <MiniMetric
                    label="Processed Features"
                    value={
                      preprocessing.processed_features
                    }
                  />

                  <MiniMetric
                    label="Training Rows"
                    value={
                      preprocessing.train_rows
                    }
                  />

                  <MiniMetric
                    label="Testing Rows"
                    value={
                      preprocessing.test_rows
                    }
                  />

                </div>

                <div>

                  <p className="mb-3 text-sm font-medium">
                    Processing Steps
                  </p>

                  <div className="space-y-2">

                    {preprocessing.steps.map(
                      (step, index) => (
                        <div
                          key={index}
                          className="rounded-lg border border-border bg-background p-3 text-sm"
                        >
                          ✓ {step}
                        </div>
                      )
                    )}

                  </div>

                </div>

              </div>

            )}

          </DashboardCard>

        </div>

      </section>


      {/* ===================================================== */}
      {/* AUTOMATED EDA */}
      {/* ===================================================== */}

      <section>

        <div className="mb-6">

          <p className="text-sm font-medium text-muted">
            Automated Analysis
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Automated EDA
          </h2>

          <p className="mt-2 text-muted">
            Automatically generated statistical
            analysis and visual summaries.
          </p>

        </div>


        {/* Numeric Statistics */}

        <div className="mb-8">

          <h3 className="mb-4 text-xl font-semibold">
            Numeric Statistics
          </h3>

          <div className="grid gap-6 md:grid-cols-2">

            {Object.entries(
              eda.numeric_statistics
            ).map(
              ([column, stats]) => (

                <div
                  key={column}
                  className="rounded-xl border border-border bg-card p-6"
                >

                  <h4 className="mb-4 font-semibold">
                    {column}
                  </h4>

                  <div className="grid grid-cols-2 gap-4 text-sm">

                    <MiniMetric
                      label="Mean"
                      value={stats.mean}
                    />

                    <MiniMetric
                      label="Median"
                      value={stats.median}
                    />

                    <MiniMetric
                      label="Minimum"
                      value={stats.min}
                    />

                    <MiniMetric
                      label="Maximum"
                      value={stats.max}
                    />

                    <MiniMetric
                      label="Std Dev"
                      value={stats.std}
                    />

                    <MiniMetric
                      label="Count"
                      value={stats.count}
                    />

                  </div>

                </div>

              )
            )}

          </div>

        </div>


        {/* Categorical Distributions */}

        <div className="mb-8">

          <h3 className="mb-4 text-xl font-semibold">
            Categorical Distributions
          </h3>

          <div className="grid gap-6 lg:grid-cols-2">

            {categoricalCharts.map(
              (column) => {

                const chartData =
                  eda
                    .categorical_statistics[
                    column
                  ]?.top_values || [];

                return (

                  <div
                    key={column}
                    className="rounded-xl border border-border bg-card p-6"
                  >

                    <h4 className="mb-4 font-semibold">
                      {column}
                    </h4>

                    <div className="h-[300px]">

                      <ResponsiveContainer
                        width="100%"
                        height="100%"
                      >

                        <BarChart
                          data={chartData}
                        >

                          <CartesianGrid
                            strokeDasharray="3 3"
                          />

                          <XAxis
                            dataKey="value"
                          />

                          <YAxis />

                          <Tooltip />

                          <Legend />

                          <Bar
                            dataKey="count"
                            name="Count"
                          />

                        </BarChart>

                      </ResponsiveContainer>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        </div>


        {/* Numeric Range Overview */}

        <div className="mb-8">

          <h3 className="mb-4 text-xl font-semibold">
            Numeric Range Overview
          </h3>

          <div className="rounded-xl border border-border bg-card p-6">

            <div className="h-[350px]">

              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart
                  data={Object.entries(
                    eda.numeric_statistics
                  ).map(
                    ([column, stats]) => ({
                      column,
                      min: stats.min,
                      mean: stats.mean,
                      median: stats.median,
                      max: stats.max,
                    })
                  )}
                >

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="column"
                  />

                  <YAxis />

                  <Tooltip />

                  <Legend />

                  <Line
                    type="monotone"
                    dataKey="min"
                    name="Minimum"
                  />

                  <Line
                    type="monotone"
                    dataKey="mean"
                    name="Mean"
                  />

                  <Line
                    type="monotone"
                    dataKey="median"
                    name="Median"
                  />

                  <Line
                    type="monotone"
                    dataKey="max"
                    name="Maximum"
                  />

                </LineChart>

              </ResponsiveContainer>

            </div>

          </div>

        </div>

      </section>


      {/* ===================================================== */}
      {/* CORRELATION HEATMAP */}
      {/* ===================================================== */}

      <section>

        <div className="mb-6">

          <p className="text-sm font-medium text-muted">
            Relationship Analysis
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            Correlation Heatmap
          </h2>

          <p className="mt-2 text-muted">
            Shows the strength and direction of
            relationships between numeric variables.
          </p>

        </div>

        <div className="rounded-xl border border-border bg-card p-6">

          {eda.correlation_matrix.columns.length <
          2 ? (

            <p className="text-muted">
              At least two numeric columns are required
              to generate a correlation heatmap.
            </p>

          ) : (

            <div className="overflow-x-auto">

              <div
                className="mx-auto"
                style={{
                  minWidth:
                    `${
                      eda.correlation_matrix
                        .columns.length *
                        100 +
                      120
                    }px`,
                }}
              >

                {/* Column Headers */}

                <div
                  className="grid"
                  style={{
                    gridTemplateColumns:
                      `120px repeat(${eda.correlation_matrix.columns.length}, 100px)`,
                  }}
                >

                  <div />

                  {eda.correlation_matrix.columns.map(
                    (column) => (
                      <div
                        key={column}
                        className="flex h-20 items-end justify-center px-2 pb-2 text-xs font-medium"
                      >

                        <span
                          className="max-w-[90px] truncate"
                          title={column}
                        >
                          {column}
                        </span>

                      </div>
                    )
                  )}

                </div>


                {/* Heatmap Rows */}

                {eda.correlation_matrix.values.map(
                  (row, rowIndex) => {

                    const rowName =
                      eda.correlation_matrix
                        .columns[rowIndex];

                    return (

                      <div
                        key={rowName}
                        className="grid"
                        style={{
                          gridTemplateColumns:
                            `120px repeat(${eda.correlation_matrix.columns.length}, 100px)`,
                        }}
                      >

                        <div className="flex items-center pr-4 text-right text-xs font-medium">

                          <span
                            className="w-full truncate"
                            title={rowName}
                          >
                            {rowName}
                          </span>

                        </div>


                        {row.map(
                          (
                            correlation,
                            columnIndex
                          ) => {

                            const value =
                              Number(
                                correlation
                              );

                            let backgroundColor =
                              "rgb(229, 231, 235)";

                            if (value > 0) {

                              const normalized =
                                value;

                              const intensity =
                                Math.round(
                                  255 -
                                    normalized *
                                      150
                                );

                              backgroundColor =
                                `rgb(${intensity}, ${intensity}, 255)`;

                            } else if (
                              value < 0
                            ) {

                              const intensity =
                                Math.round(
                                  255 -
                                    Math.abs(
                                      value
                                    ) *
                                      150
                                );

                              backgroundColor =
                                `rgb(255, ${intensity}, ${intensity})`;
                            }

                            return (

                              <div
                                key={`${rowName}-${columnIndex}`}
                                className="flex h-[70px] items-center justify-center border border-white text-sm font-semibold transition-transform hover:scale-105"
                                style={{
                                  backgroundColor,
                                }}
                                title={`${rowName} vs ${eda.correlation_matrix.columns[columnIndex]}: ${value}`}
                              >
                                {value.toFixed(2)}
                              </div>

                            );
                          }
                        )}

                      </div>

                    );
                  }
                )}

              </div>

            </div>

          )}

        </div>


        {/* Heatmap Legend */}

        {eda.correlation_matrix.columns.length >=
          2 && (

          <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-muted">

            <div className="flex items-center gap-2">

              <span
                className="h-4 w-4 rounded-sm"
                style={{
                  backgroundColor:
                    "rgb(105, 105, 255)",
                }}
              />

              <span>
                Positive correlation
              </span>

            </div>


            <div className="flex items-center gap-2">

              <span
                className="h-4 w-4 rounded-sm"
                style={{
                  backgroundColor:
                    "rgb(255, 105, 105)",
                }}
              />

              <span>
                Negative correlation
              </span>

            </div>


            <div className="flex items-center gap-2">

              <span
                className="h-4 w-4 rounded-sm"
                style={{
                  backgroundColor:
                    "rgb(229, 231, 235)",
                }}
              />

              <span>
                Weak / no correlation
              </span>

            </div>

          </div>

        )}

      </section>


      {/* ===================================================== */}
      {/* OUTLIER ANALYSIS */}
      {/* ===================================================== */}

      <section>

        <h2 className="mb-4 text-2xl font-bold">
          Numeric Outlier Analysis
        </h2>

        <div className="rounded-xl border border-border bg-card p-6">

          {Object.keys(
            profile.outlier_counts
          ).length === 0 ? (

            <p className="text-muted">
              No numeric columns available
              for outlier analysis.
            </p>

          ) : (

            <div className="space-y-4">

              {Object.entries(
                profile.outlier_counts
              ).map(
                ([column, count]) => (

                  <div
                    key={column}
                    className="flex items-center justify-between border-b border-border pb-3"
                  >

                    <span className="font-medium">
                      {column}
                    </span>

                    <span>
                      {count} outliers (
                      {
                        profile
                          .outlier_percentages[
                          column
                        ]
                      }
                      %)
                    </span>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* ===================================================== */}
      {/* AUTOML */}
      {/* ===================================================== */}

      <section>

        <div className="mb-6">

          <p className="text-sm font-medium text-muted">
            Machine Learning
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            AutoML Model Comparison
          </h2>

          <p className="mt-2 text-muted">
            Train and compare multiple machine-learning
            models automatically.
          </p>

        </div>

        <div className="rounded-xl border border-border bg-card p-6">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

            <div>

              <p className="text-sm text-muted">
                Selected Target
              </p>

              <p className="mt-1 text-lg font-bold">
                {selectedTarget ||
                  "No target selected"}
              </p>

            </div>

            <button
              type="button"
              onClick={handleRunAutoML}
              disabled={
                !selectedTarget ||
                isRunningAutoML
              }
              className="rounded-lg bg-foreground px-6 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunningAutoML
                ? "Running AutoML..."
                : "Run AutoML"}
            </button>

          </div>

          {automlError ? (

            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {automlError}
            </div>

          ) : null}


          {automlData ? (

            <div className="mt-8">

              <div className="mb-5 grid gap-4 sm:grid-cols-3">

                <MiniMetric
                  label="Problem Type"
                  value={
                    automlData.automl
                      .problem_type
                  }
                />

                <MiniMetric
                  label="Models Tested"
                  value={
                    automlData.automl
                      .models_tested
                  }
                />

                <MiniMetric
                  label="Best Model"
                  value={
                    automlData.automl
                      .results[0]
                      ?.model ||
                    "N/A"
                  }
                />

              </div>


              <div className="overflow-x-auto rounded-xl border border-border">

                <table className="w-full text-left">

                  <thead className="border-b border-border">

                    <tr>

                      <th className="px-5 py-4">
                        Model
                      </th>

                      <th className="px-5 py-4">
                        Accuracy
                      </th>

                      <th className="px-5 py-4">
                        Precision
                      </th>

                      <th className="px-5 py-4">
                        Recall
                      </th>

                      <th className="px-5 py-4">
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

                          <td className="px-5 py-4 font-medium">

                            <div className="flex items-center gap-2">

                              {index === 0 ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                                  Best
                                </span>
                              ) : null}

                              {result.model}

                            </div>

                          </td>

                          <td className="px-5 py-4">
                            {formatMetric(
                              result.accuracy
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {formatMetric(
                              result.precision
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {formatMetric(
                              result.recall
                            )}
                          </td>

                          <td className="px-5 py-4 font-semibold">
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

            </div>

          ) : (

            <div className="mt-6 rounded-lg border border-dashed border-border p-8 text-center">

              <p className="font-medium">
                No AutoML results yet
              </p>

              <p className="mt-2 text-sm text-muted">
                Select a target and run AutoML
                to compare models.
              </p>

            </div>

          )}

        </div>

      </section>


      {/* ===================================================== */}
      {/* AI INSIGHTS */}
      {/* ===================================================== */}

      <section>

        <div className="mb-6">

          <p className="text-sm font-medium text-muted">
            Intelligent Analysis
          </p>

          <h2 className="mt-1 text-2xl font-bold">
            🧠 AI Insights
          </h2>

          <p className="mt-2 text-muted">
            Convert the analytical results into
            understandable, actionable insights.
          </p>

        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">

          {!aiInsights ? (

            <div className="text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-background text-3xl">
                🧠
              </div>

              <h3 className="mt-4 text-xl font-semibold">
                Generate Dataset Insights
              </h3>

              <p className="mx-auto mt-2 max-w-2xl text-sm text-muted">
                InsightForgeAI will analyze the
                results already calculated by Python
                and turn them into a human-readable
                analytical summary.
              </p>

              <button
                type="button"
                onClick={
                  handleLoadAIInsights
                }
                disabled={isLoadingAI}
                className="mt-6 rounded-lg bg-foreground px-6 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoadingAI
                  ? "Generating Insights..."
                  : "Generate AI Insights"}
              </button>

              {aiError ? (

                <div className="mx-auto mt-5 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-left text-sm text-red-700">
                  {aiError}
                </div>

              ) : null}

            </div>

          ) : (

            <div>

              <div className="mb-6 flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <h3 className="text-xl font-bold">
                    Dataset Analysis
                  </h3>

                  <p className="mt-1 text-sm text-muted">
                    Generated from the calculated
                    dataset statistics and findings.
                  </p>

                </div>

                <button
                  type="button"
                  onClick={
                    handleLoadAIInsights
                  }
                  disabled={isLoadingAI}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-background disabled:opacity-50"
                >
                  {isLoadingAI
                    ? "Refreshing..."
                    : "Refresh Insights"}
                </button>

              </div>


              <div className="space-y-7">

                {aiInsights
                  .split(
                    /\n(?=## )/
                  )
                  .map(
                    (section, index) => {

                      const lines =
                        section.trim().split(
                          "\n"
                        );

                      const heading =
                        lines[0]
                          ?.replace(
                            /^##\s*/,
                            ""
                          )
                          .trim();

                      const body =
                        lines
                          .slice(1)
                          .join("\n")
                          .trim();

                      return (

                        <div
                          key={index}
                          className="rounded-xl border border-border bg-background p-5"
                        >

                          <h4 className="text-lg font-bold">
                            {heading}
                          </h4>

                          <div className="mt-3 space-y-2 text-sm leading-7 text-muted">

                            {body
                              .split("\n")
                              .map(
                                (
                                  line,
                                  lineIndex
                                ) => {

                                  const trimmed =
                                    line.trim();

                                  if (
                                    !trimmed
                                  ) {
                                    return null;
                                  }

                                  if (
                                    trimmed.startsWith(
                                      "-"
                                    )
                                  ) {
                                    return (
                                      <div
                                        key={
                                          lineIndex
                                        }
                                        className="flex gap-3"
                                      >
                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />

                                        <span>
                                          {trimmed.replace(
                                            /^-\s*/,
                                            ""
                                          )}
                                        </span>
                                      </div>
                                    );
                                  }

                                  return (
                                    <p
                                      key={
                                        lineIndex
                                      }
                                    >
                                      {trimmed}
                                    </p>
                                  );
                                }
                              )}

                          </div>

                        </div>

                      );
                    }
                  )}

              </div>

            </div>

          )}

        </div>

      </section>


      {/* ===================================================== */}
      {/* COLUMN INFORMATION */}
      {/* ===================================================== */}

      <section>

        <h2 className="mb-4 text-2xl font-bold">
          Column Information
        </h2>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">

          <table className="w-full text-left">

            <thead className="border-b border-border">

              <tr>

                <th className="px-6 py-4">
                  Column
                </th>

                <th className="px-6 py-4">
                  Data Type
                </th>

                <th className="px-6 py-4">
                  Unique Values
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

                    <td className="px-6 py-4 font-medium">
                      {column}
                    </td>

                    <td className="px-6 py-4">
                      {profile.data_types[column]}
                    </td>

                    <td className="px-6 py-4">
                      {profile.unique_values[column]}
                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        </div>

      </section>


      {/* ===================================================== */}
      {/* NEXT ANALYSIS MODULES */}
      {/* ===================================================== */}

      <section>

        <h2 className="mb-4 text-2xl font-bold">
          Next Analysis Modules
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

          <FutureModule
            title="Explainability"
            description="Understand which features influence model predictions."
          />

          <FutureModule
            title="Prediction"
            description="Use the trained model to generate predictions for new data."
          />

          <FutureModule
            title="PDF Report"
            description="Generate a downloadable professional analytical report."
          />

          <FutureModule
            title="Deployment"
            description="Deploy the complete InsightForgeAI platform for real users."
          />

        </div>

      </section>

    </div>
  );
}


/* ========================================================= */
/* HELPER COMPONENTS */
/* ========================================================= */

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">

      <p className="text-sm text-muted">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}


function DashboardCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">

      <h3 className="mb-5 text-lg font-semibold">
        {title}
      </h3>

      {children}

    </div>
  );
}


function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">

      <p className="text-xs text-muted">
        {label}
      </p>

      <p className="mt-1 font-semibold">
        {value}
      </p>

    </div>
  );
}


function FindingCard({
  finding,
}: {
  finding: Finding;
}) {
  const type = finding.type.toLowerCase();

  let badgeClass =
    "bg-slate-100 text-slate-700";

  if (type === "critical") {
    badgeClass =
      "bg-red-100 text-red-700";
  } else if (type === "warning") {
    badgeClass =
      "bg-amber-100 text-amber-700";
  } else if (
    type === "positive"
  ) {
    badgeClass =
      "bg-emerald-100 text-emerald-700";
  } else if (
    type === "negative"
  ) {
    badgeClass =
      "bg-red-100 text-red-700";
  } else if (
    type === "info"
  ) {
    badgeClass =
      "bg-blue-100 text-blue-700";
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">

      <div className="flex items-start justify-between gap-4">

        <h3 className="font-semibold">
          {finding.title}
        </h3>

        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}
        >
          {finding.type}
        </span>

      </div>

      <p className="mt-3 text-sm leading-6 text-muted">
        {finding.message}
      </p>

    </div>
  );
}


function FutureModule({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">

      <h3 className="font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm text-muted">
        {description}
      </p>

      <span className="mt-4 inline-block text-sm font-medium">
        Coming next
      </span>

    </div>
  );
}


function formatMetric(
  value: number
) {
  return `${(
    Number(value) * 100
  ).toFixed(2)}%`;
}