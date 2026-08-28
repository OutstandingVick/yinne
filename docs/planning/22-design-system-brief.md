# Design system brief

Yinne should feel trustworthy, operational, and calm—not bank-like theater. The system serves dense staff workflows and conversion-sensitive buyer flows.

## Foundations

Use semantic tokens for surface/text/border/action/success/warning/danger/info, never raw color as meaning. Meet WCAG 2.2 AA contrast; visible focus; 44px touch targets on buyer surfaces. Typography has tabular numerals for money/IDs but preserves copyable full values. Spacing is 4px-derived; density modes may come later. Dark mode is planned, not a V1 blocker.

Money component always shows currency, locale-formatted display, and exact copyable minor-unit/API representation in detail views. Status badges use text+icon+color and map only documented states. Test mode has a persistent banner and distinct key/provider badges; live financial confirmation cannot be confused with test.

## Components

Buttons, links, inputs, select/combobox, date/time/currency inputs, tables, pagination/filter bar, cards, tabs, dialog/drawer, toast/inline alert, skeleton, empty/error/permission states, status badge, money, metric card with definition/freshness, timeline/event viewer, JSON viewer with redaction, confirmation panel, and copyable ID/request ID.

Destructive and financial confirmations name object, amount/currency, consequence, and idempotent progress. Never use optimistic success for payments/refunds. Pending/unknown is a first-class state with reconciliation explanation.

## Content

Use “payment succeeded,” not “money settled”; “processed sales,” not “bank balance”; “provider reported,” not “guaranteed.” Errors state what happened, safe next action, whether retry is safe, and request ID. Empty states explain the capability truth (for example, mock test mode) and one useful action.

## Delivery

Tailwind consumes shared CSS variables; headless accessible primitives are wrapped in packages/ui. Storybook documents states and runs visual/accessibility tests. Storefront theme exposes a constrained token schema; arbitrary CSS/JS is disallowed V1. Design acceptance includes keyboard, screen reader, 200% zoom, reduced motion, localization expansion, low bandwidth, and mobile checkout.
