const steps = [
  {
    number: "1",
    title: "Upload Dataset",
    description: "Start with a CSV or similar tabular file. No notebook setup required.",
  },
  {
    number: "2",
    title: "Analyze Data",
    description: "InsightForgeAI profiles the table, checks quality, and runs exploratory analysis.",
  },
  {
    number: "3",
    title: "Train Models",
    description: "AutoML compares candidate models and surfaces a strong baseline for your task.",
  },
  {
    number: "4",
    title: "Get Insights",
    description: "Review explanations and AI-written findings you can use to make decisions.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:py-20">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight">How It Works</h2>
        <p className="mt-3 text-muted">
          A simple four-step path from upload to insight.
        </p>
      </div>
      <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {steps.map((step) => (
          <li key={step.number} className="rounded-2xl border border-border bg-card p-6">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
              {step.number}
            </span>
            <h3 className="mt-4 text-lg font-semibold tracking-tight">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
