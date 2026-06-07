import Link from "next/link";

export interface OperatorWorkflowAction {
  label: string;
  href: string;
  primary?: boolean;
}

export interface OperatorWorkflowStep {
  label: string;
  detail: string;
}

export default function OperatorWorkflowRail({
  title,
  subtitle,
  steps,
  actions,
}: {
  title: string;
  subtitle: string;
  steps: OperatorWorkflowStep[];
  actions: OperatorWorkflowAction[];
}) {
  return (
    <section className="ee-panel mb-5 rounded-lg border-accent/20 bg-white p-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)_auto] xl:items-center">
        <div>
          <div className="ee-label text-accent">Operator loop</div>
          <h2 className="mt-1 text-[15px] font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{subtitle}</p>
        </div>

        <ol className="grid gap-2 md:grid-cols-3">
          {steps.slice(0, 3).map((step, index) => (
            <li key={step.label} className="rounded-md border border-line bg-paper px-3 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                {String(index + 1).padStart(2, "0")} {step.label}
              </span>
              <p className="mt-1 text-[11px] leading-snug text-ink-soft">{step.detail}</p>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {actions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`ee-button ${action.primary ? "ee-button-primary" : "ee-button-secondary"} min-h-9 px-3`}
            >
              {action.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
