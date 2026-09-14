function DataVisual() {
  const bars = [42, 68, 55, 80, 47, 72, 61];

  return (
    <div
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-hidden="true"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-brand" />
        </div>
        <p className="font-mono text-xs text-muted">dataset_preview.csv</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Rows", value: "24,810" },
          { label: "Columns", value: "18" },
          { label: "Quality", value: "96%" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-background px-3 py-3">
            <p className="text-xs text-muted">{stat.label}</p>
            <p className="mt-1 text-lg font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-xl border border-border bg-background p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">Feature distribution</p>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
            Auto EDA
          </span>
        </div>
        <div className="flex h-28 items-end gap-2">
          {bars.map((height, index) => (
            <div
              key={index}
              className="flex-1 rounded-t-md bg-brand/80"
              style={{ height: `${height}%` }}
            />
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-border px-3 py-3">
          <p className="text-muted">Best model</p>
          <p className="mt-1 font-medium">Random Forest</p>
        </div>
        <div className="rounded-xl border border-border px-3 py-3">
          <p className="text-muted">Accuracy</p>
          <p className="mt-1 font-medium">91.4%</p>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section id="home" className="mx-auto grid max-w-6xl scroll-mt-24 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
      <div>
        <p className="mb-4 inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
          Automated EDA and AutoML
        </p>
        <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          From Raw Data to Intelligent Insights
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-muted sm:text-lg">
          Upload your dataset and let InsightForgeAI automate profiling, exploratory
          data analysis, machine learning, and actionable insights.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="#upload"
            className="inline-flex items-center justify-center rounded-lg bg-brand px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
          >
            Upload Dataset
          </a>
          <a
            href="#features"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-background"
          >
            Explore Features
          </a>
        </div>
      </div>
      <DataVisual />
    </section>
  );
}
