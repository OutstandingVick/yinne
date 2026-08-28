import type { OperatingMode } from "@yinne/core";

export type ScopeType = "organization" | "merchant" | "location";

export interface Scope {
  type: ScopeType;
  id: string;
}

export interface SessionPrincipal {
  type: "user";
  userId: string;
  organizationId: string;
  memberId: string;
  environment: OperatingMode;
}

export interface ApiKeyPrincipal {
  type: "api_key";
  apiKeyId: string;
  organizationId: string;
  scopes: readonly string[];
  environment: OperatingMode;
}

export interface SystemPrincipal {
  type: "system";
  id: string;
  organizationId: string;
  environment: OperatingMode;
}

export type Principal = SessionPrincipal | ApiKeyPrincipal | SystemPrincipal;

export function principalId(principal: Principal): string {
  if (principal.type === "user") return principal.userId;
  if (principal.type === "api_key") return principal.apiKeyId;
  return principal.id;
}
