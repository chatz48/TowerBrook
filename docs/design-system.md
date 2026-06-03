# Expert Engine Design System

This implementation uses the supplied `docs/mockups` images as the visual
source of truth.

## References

- `theme-command-center-session-fit.png`
- `research-copilot.png`
- `graph-explorer.png`
- `expert-call-prep.png`
- `report-memo-builder.png`

## Visual Principles

- Investment research terminal, not a marketing page.
- Tables first; graph and generated prose explain ranked rows.
- Evidence before prose: source markers, confidence, source counts, and
  evidence rails are always visible.
- Light theme for printability and dense reading.
- Compact UI chrome: 11-13px labels/tables, 4-8px radii, thin borders.

## Tokens

Implemented in `app/globals.css`.

```text
paper:          #f7f9fc
card:           #ffffff
ink:            #111827
ink-soft:       #344054
ink-faint:      #667085
muted:          #98a2b3
line:           #e4e7ec
line-strong:    #cfd6e3
accent:         #0757d3
accent-strong:  #0047bb
success:        #087a3d
warning:        #f97316
danger:         #dc2626
```

Typography uses Geist Sans and Geist Mono. Tailwind v4 `@theme inline` uses
literal font stacks, not runtime font variables, to avoid the circular token
fallback issue.

## Layout Patterns

### Global App Chrome

`app/layout.tsx` provides a white header with:

- Expert Engine mark.
- Primary navigation.
- Command search affordance.
- Compact utility controls.

Routes should render under this shell. Do not add duplicate product headers
inside individual pages.

### Three-Rail Workspaces

Use for generated or exploratory workflows:

```text
left rail     -> filters/session setup/templates
center canvas -> table, graph, memo, or structured answer
right rail    -> evidence, settings, inspector, or actions
```

Used by:

- `/ask`
- `/graph`
- `/reports`
- `/discover`

### Command Center Pages

Use for theme/entity workflows:

- Top title/action row.
- KPI strip.
- Main evidence panel.
- Dense table.
- Optional right rail for clusters, blank spaces, or call prep.

Used by:

- `/themes/[theme]`
- `/experts/[id]`
- `/companies/[id]`

## Components And Classes

Shared utility classes in `app/globals.css`:

- `.ee-panel`: bordered white panel with subtle shadow.
- `.ee-card`: simple bordered card for repeated units.
- `.ee-label`: uppercase compact label.
- `.ee-link`: blue evidence/action link.
- `.ee-button`, `.ee-button-primary`, `.ee-button-secondary`.
- `.ee-table`: dense table with bordered columns and uppercase headers.
- `.ee-metric-bar`: compact green segmented metric bar.

Shared React primitives in `app/components/ui.tsx`:

- `Badge`
- `Panel`
- `PanelHeader`
- `Confidence`
- `ConfidenceBars`
- `SourceLinks`
- `ThemeTag`
- `Chip`
- `MetricBars`

## Interaction Rules

- Keep controls real and code-native. Do not use screenshot images as UI.
- Citation markers should link or correspond to visible source evidence.
- Generated sections should expose confidence, assumptions, and sources.
- Graph edges must be labeled; graph nodes must link to profiles.
- Discovery candidates must remain proposals until reviewed.

## What To Avoid

- Marketing hero layouts.
- Large card grids where a table is more useful.
- Decorative gradients, blobs, or abstract illustrations.
- Duplicate navigation/header systems inside route pages.
- Hidden scoring logic or unexplained ranking changes.
- LLM prose without structured blocks and citations.
