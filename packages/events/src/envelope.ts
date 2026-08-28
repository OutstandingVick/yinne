import type { Principal } from "@yinne/auth";
import { createId, type OperatingMode } from "@yinne/core";

export const phaseOneEventTypes = [
  "organization.created",
  "organization.updated",
  "member.invited",
  "member.role_updated",
  "api_key.created",
  "api_key.revoked",
] as const;

export const domainEventTypes = [
  ...phaseOneEventTypes,
  "customer.created",
  "customer.updated",
  "product.created",
  "product.updated",
  "product.activated",
  "product.archived",
  "variant.created",
  "variant.updated",
  "inventory.adjusted",
  "order.created",
  "order.cancelled",
] as const;

export type DomainEventType = (typeof domainEventTypes)[number];
export type PhaseOneEventType = (typeof phaseOneEventTypes)[number];

export interface EventEnvelope<TData extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  type: DomainEventType;
  version: 1;
  apiVersion: "2026-08-27";
  organizationId: string;
  environment: OperatingMode;
  occurredAt: Date;
  aggregate: { type: string; id: string; version: number };
  actor: { type: Principal["type"]; id: string };
  requestId: string;
  data: TData;
}

export function createEvent<TData extends Record<string, unknown>>(
  input: Omit<EventEnvelope<TData>, "id" | "version" | "apiVersion" | "occurredAt">,
): EventEnvelope<TData> {
  return {
    ...input,
    id: createId(),
    version: 1,
    apiVersion: "2026-08-27",
    occurredAt: new Date(),
  };
}

export interface EventPublisher {
  publish<TData extends Record<string, unknown>>(event: EventEnvelope<TData>): Promise<void>;
}
