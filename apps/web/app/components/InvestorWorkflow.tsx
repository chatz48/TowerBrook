import Link from "next/link";
import type React from "react";

interface WorkflowStep {
  label: string;
  title: string;
  body: string;
  href?: string;
}

interface ActionItem {
  title: string;
  body: string;
  href?: string;
  action?: string;
  tone?: "primary" | "secondary";
}

interface InsightMetric {
  label: string;
  value: React.ReactNode;
  sub: string;
}

export function WorkflowRail({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="ee-workflow-grid">
      {steps.map((step, index) => {
        const content = (
          <>
            <div className="ee-workflow-index">{index + 1}</div>
            <div>
              <div className="text-[11px] font-semibold text-ink-faint">
                {step.label}
              </div>
              <h3 className="mt-1 text-[14px] font-semibold text-ink">
                {step.title}
              </h3>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                {step.body}
              </p>
            </div>
          </>
        );

        return step.href ? (
          <Link key={step.title} href={step.href} className="ee-workflow-step">
            {content}
          </Link>
        ) : (
          <div key={step.title} className="ee-workflow-step">
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function NextActionPanel({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions: ActionItem[];
}) {
  return (
    <section className="ee-panel rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="ee-label text-ink">{title}</h2>
          {description ? (
            <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 space-y-3">
        {actions.map((action) => {
          const item = (
            <>
              <div>
                <div className="text-[13px] font-semibold text-ink">
                  {action.title}
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                  {action.body}
                </p>
              </div>
              {action.action ? (
                <span
                  className={
                    action.tone === "primary"
                      ? "ee-button ee-button-primary min-h-8 px-3"
                      : "ee-button ee-button-secondary min-h-8 px-3"
                  }
                >
                  {action.action}
                </span>
              ) : null}
            </>
          );

          return action.href ? (
            <Link key={action.title} href={action.href} className="ee-action-row">
              {item}
            </Link>
          ) : (
            <div key={action.title} className="ee-action-row">
              {item}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function InsightStrip({ metrics }: { metrics: InsightMetric[] }) {
  return (
    <div className="ee-insight-strip">
      {metrics.map((metric) => (
        <div key={metric.label} className="ee-insight-metric">
          <div className="ee-label">{metric.label}</div>
          <div className="mt-2 text-[24px] font-semibold tracking-tight tabular-nums">
            {metric.value}
          </div>
          <div className="mt-1 text-[12px] text-ink-soft">{metric.sub}</div>
        </div>
      ))}
    </div>
  );
}

export function CallPrepChecklist({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <section className="rounded-lg border border-line bg-paper p-4">
      <div className="ee-label text-ink">{title}</div>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[12px] leading-relaxed text-ink-soft">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
