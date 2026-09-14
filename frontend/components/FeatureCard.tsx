import type { ReactNode } from "react";

type FeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
};

export default function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-transform hover:-translate-y-0.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand-dark">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
    </article>
  );
}
