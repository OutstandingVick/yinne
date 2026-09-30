# Redesign Phase 1: Design System and Global Shell

## Scope

Dashboard-only visual foundation, based on the supplied Yinne Brand Identity PRD, vector logo, and dashboard inspiration. The existing overview is the single example composition. Its copy, metrics, links, ordering, and data-loading logic are preserved.

The reference informs spacing, quiet surfaces, card hierarchy, and topbar density. Yinne retains its own near-black sidebar, cobalt interactions, and restrained vanilla test banner. No new dashboard routes, business capabilities, or reference-image content were introduced.

## Files changed

- `apps/dashboard/src/app/(dashboard)/tokens.css`: scoped semantic palette, spacing, type, radii, shadows, and chart roles.
- `apps/dashboard/src/app/(dashboard)/fonts.css`: locally hosted variable font faces.
- `apps/dashboard/src/app/(dashboard)/dashboard.css`: shared dashboard component and responsive shell styles.
- `apps/dashboard/src/app/(dashboard)/layout.tsx`: brand assets and shell composition; existing authentication, organization lookup, memberships, switch action, and sign-out action retained.
- `apps/dashboard/src/app/(dashboard)/shell.tsx`: desktop shell, responsive navigation dialog, skip link, and page container.
- `apps/dashboard/src/app/(dashboard)/nav-link.tsx`: current-route presentation and outline icons; existing destinations retained.
- `apps/dashboard/src/app/(dashboard)/page.tsx`: existing overview uses MetricCard without changing its displayed content.
- `apps/dashboard/public/brand/yinne-logo.svg`: supplied vector paths, cropped to artwork, with metadata/background removed; white inverse presentation in the sidebar.
- `apps/dashboard/public/fonts/`: Manrope, Space Grotesk, Plus Jakarta Sans Latin WOFF2 assets and corresponding OFL licenses.
- `packages/ui/src/index.tsx`: backwards-compatible exports, button variant/size props, keyboard-scrollable table region.
- `packages/ui/src/{card,search-field,status-badge,tabs,dropdown,modal,drawer,pagination,tooltip,filters}.tsx`: reusable UI primitives.
- `packages/ui/src/floating-position.ts`: viewport-edge positioning for tooltips and dropdowns.
- `tests/e2e/dashboard-shell.spec.ts`: responsive and navigation regression test.
- This handoff document.

## Components

| Component                              | Delivery                                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Button                                 | Primary, secondary, ghost, danger; default/small size; focus, hover, disabled                             |
| Input / Select / Checkbox              | Existing native elements and props retained; dashboard presentation standardized                          |
| SearchField                            | Visible label, native search input, decorative search icon                                                |
| Card / MetricCard                      | Shared surface, spacing, numeric typography; caller supplies content and status                           |
| Table                                  | Existing semantic table; named, focusable horizontal scroll region                                        |
| PageHeader                             | Shared heading scale, description measure, wrapping action layout                                         |
| Tabs                                   | Controlled value; tab/panel associations; arrows, Home, End; disabled tabs                                |
| Badge / StatusBadge                    | Neutral, success, warning, danger, info; explicit caller-supplied tone; status text and symbol            |
| Dropdown                               | Native disclosure; normal Tab order for links/buttons; Escape and focus-leave dismissal                   |
| Modal / Drawer                         | Native modal dialog, focus containment/restoration, Escape, close control; supplied title/content/actions |
| EmptyState / LoadingState / ErrorState | Existing messages retained; shared state surfaces; reduced-motion spinner                                 |
| Pagination                             | Caller-supplied destinations, labels, and summary; no fetching or pagination business logic               |
| Tooltip                                | Text trigger, focus/hover/touch visibility, Escape dismissal, viewport-edge containment                   |
| DateInput / FilterBar                  | Native date control and wrapping filter layout; no new filtering behavior                                 |

## Tokens and usage

The new tokens live under `.dashboard-theme`, not `:root`. Public checkout, storefront, and authentication styles remain outside this scope. Existing token names such as `--action`, `--panel`, and `--muted` continue to work for current dashboard consumers.

- Brand: `--brand-blue: #2457FF`, `--brand-yellow: #F5F749`, `--brand-vanilla: #F6F5AE`, `--brand-black: #171717`.
- Roles: action/hover/focus, panel/page/hover surfaces, text/muted, borders, navigation, highlight, and independent success/warning/danger/info foreground/background pairs.
- Fonts: Manrope for UI, Space Grotesk for metrics, Plus Jakarta Sans available as the supporting editorial role. Fonts load locally with `font-display: swap`; the Latin subset falls back to system fonts for other scripts.
- Type: 12px captions, 13px small controls, 14px dense UI, 24–32px page headings. Inputs use 16px on phones. Dynamic numbers use tabular figures.
- Spacing: 4px-derived steps from 4px through 40px; regular component gaps and responsive page padding.
- Radii: 6px small, 8px controls, 12px cards/filters, 16px larger panels.
- Elevation: subtle card shadow and separate overlay shadow.
- Charts: primary cobalt, yellow comparison, near-black reference, vanilla range, neutral grid. Future charts must retain text/shape cues and contrast-aware boundaries for light series.

Import components from `@yinne/ui`. Add new screens within the existing dashboard layout to inherit the theme. Provide labels to native form controls, meaningful titles to dialogs, text content to tooltip triggers, and explicit semantic tones to StatusBadge. The design system does not infer business status, select routes, fetch data, or change permissions.

## Global shell

Desktop retains all existing navigation groups and destinations in a 244px, independently scrollable sidebar. The active destination uses cobalt plus `aria-current="page"`. The topbar retains Test, organization selection, Switch, account email, and Sign out. Existing page content stays in a fluid, centered container.

Below 1120px, a labelled menu control opens the same navigation in a native modal drawer. Escape, close, navigation, and a return to desktop width dismiss it. Focus returns to the trigger. Tablet metric grids use two columns; phone grids use one. Tables intentionally scroll within their region instead of widening the page. Long email addresses remain readable on narrow phones.

## Verification

- `pnpm typecheck`: passed across 22 packages.
- `pnpm lint`: passed.
- `pnpm build`: passed across 22 packages; Next generated the existing route set. Turbo's no-output warning for the UI package is expected because its build command is `tsc --noEmit`.
- `pnpm test`: 84 tests passed across 26 files.
- `pnpm exec playwright test tests/e2e/dashboard-shell.spec.ts`: passed. Checks sign-in, the overview, active navigation, drawer dismissal/focus restoration, mobile navigation to Customers, keyboard table scrolling, organization switching, and sign-out.
- Browser widths: 1440, 1024, 768, 390, 320 CSS pixels, with no document overflow on the tested overview and Customers flow. Screenshots are generated in ignored `test-results/`.
- Isolated Chromium component exercise: tabs with arrow keys, dropdown dismissal, Modal/Drawer opening and focus restoration, Tooltip focus/Escape, narrow viewport edge containment, and reduced-motion loading state passed. No application route was added for this temporary fixture.
- Source palette contrast: primary button 5.41:1; muted text on page 5.59:1; success 6.83:1; warning 6.55:1; danger 6.73:1; info 6.17:1; muted navigation text 8.55:1. These are measured declared token pairs, not a blanket accessibility certification.
- Reviewed diffs against `aa4f3f3`: no changes to routes, API handlers/calls, services, database, permissions, financial logic, or server actions. The layout's navigation arrays and the overview's data section and copy are unchanged.
- Formatting and `git diff --check`: passed for the changed source files.

Browser verification covers representative dashboard flows and the new primitives. A complete screen-reader/device audit and every business workflow across all sections were not run. Interface skill guidance informed keyboard access, focus treatment, contrast, typography, and responsive layout.

## Deferred to Phase 2

Detailed redesign of the 25 individual sections, screen-specific chart composition, replacement of local one-off markup with new primitives, and content corrections remain deferred. Existing stale product copy is intentionally preserved as requested. No dark theme, new product workflows, or information-architecture changes are part of this phase.

Delivery consists of 25 signed-off commits following `aa4f3f3`. Commits are local; this request did not include a push.

REDESIGN PHASE 1 COMPLETE — READY FOR CORE SCREENS
