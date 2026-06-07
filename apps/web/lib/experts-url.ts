export type ExpertsFilterParams = {
  theme?: string;
  specialty?: string;
  type?: string;
  readiness?: string;
  q?: string;
  experts?: string;
};

export function expertsPageHref(
  params: ExpertsFilterParams,
  omit?: keyof ExpertsFilterParams,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as [keyof ExpertsFilterParams, string | undefined][]) {
    if (key === omit || !value || value === "all") continue;
    search.set(key, value);
  }
  const query = search.toString();
  return query ? `/experts?${query}` : "/experts";
}

export function expertsFilterHref(filters: {
  theme?: string;
  specialty?: string;
  type?: string;
  readiness?: string;
  q?: string;
  experts?: string;
}): string {
  return expertsPageHref({
    theme: filters.theme && filters.theme !== "all" ? filters.theme : undefined,
    specialty: filters.specialty && filters.specialty !== "all" ? filters.specialty : undefined,
    type: filters.type && filters.type !== "all" ? filters.type : undefined,
    readiness: filters.readiness && filters.readiness !== "all" ? filters.readiness : undefined,
    q: filters.q?.trim() || undefined,
    experts: filters.experts,
  });
}
