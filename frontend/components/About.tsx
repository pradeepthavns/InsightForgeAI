export default function About() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight">About</h2>
          <p className="mt-4 text-base leading-7 text-muted">
            InsightForgeAI is an automated Exploratory Data Analysis and AutoML
            platform. It is built for students, analysts, and teams who want
            faster answers from tabular data without assembling a long chain of
            tools. Upload a dataset, review the analysis, train models, and
            leave with insights you can explain.
          </p>
        </div>
      </div>
    </section>
  );
}
