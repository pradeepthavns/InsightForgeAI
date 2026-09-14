import FeatureCard from "./FeatureCard";

function Icon({ path }: { path: string }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const features = [
  {
    title: "Automated Data Profiling",
    description:
      "Instantly summarize rows, columns, types, and distributions so you understand a dataset before modeling.",
    path: "M4 19V5M4 19h16M8 15v-4M12 15V8M16 15v-6",
  },
  {
    title: "Smart EDA",
    description:
      "Generate charts, correlations, and patterns automatically instead of writing exploratory notebooks by hand.",
    path: "M4 20V10l5 3 6-8 5 6",
  },
  {
    title: "Data Quality Analysis",
    description:
      "Detect missing values, duplicates, outliers, and inconsistent fields that can quietly hurt model performance.",
    path: "M9 12l2 2 4-4M5 7h14M5 12h3M16 12h3M5 17h14",
  },
  {
    title: "AutoML",
    description:
      "Train and compare models with minimal setup so you can move from a clean table to a baseline quickly.",
    path: "M12 3v4M12 17v4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M3 12h4M17 12h4M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8",
  },
  {
    title: "Model Explainability",
    description:
      "See which features drive predictions so results are easier to trust, debug, and present to stakeholders.",
    path: "M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v4l3 2",
  },
  {
    title: "AI-Powered Insights",
    description:
      "Turn analysis results into plain-language findings you can share without translating every metric yourself.",
    path: "M12 3c4 4 6 7 6 10a6 6 0 11-12 0c0-3 2-6 6-10zM9 21h6",
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">Features</h2>
          <p className="mt-3 text-muted">
            Everything you need to go from a raw file to a model you can explain.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              icon={<Icon path={feature.path} />}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
