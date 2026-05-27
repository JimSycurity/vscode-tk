export type DiscoverySource = "setting" | "workspace" | "ancestor";

export interface TicketProject {
  readonly projectRoot: string;
  readonly ticketsDir: string;
  readonly source: DiscoverySource;
  readonly isExternal: boolean;
}

export type DiscoveryResult =
  | { readonly kind: "none" }
  | { readonly kind: "active"; readonly project: TicketProject }
  | { readonly kind: "ambiguous"; readonly candidates: readonly TicketProject[] }
  | { readonly kind: "blockedExternal"; readonly project: TicketProject };

export interface TicketRecord {
  readonly id: string;
  readonly filePath: string;
  readonly projectRoot: string;
  readonly ticketsDir: string;
  readonly title: string;
  readonly body: string;
  readonly status: string;
  readonly priority: number | null;
  readonly type: string;
  readonly assignee: string;
  readonly tags: readonly string[];
  readonly deps: readonly string[];
  readonly links: readonly string[];
  readonly parent: string | null;
  readonly externalRef: string | null;
  readonly created: string | null;
  readonly fileCreatedAt: number | null;
  readonly fileUpdatedAt: number | null;
}

export interface TicketWarning {
  readonly kind: "parse" | "relationship";
  readonly filePath: string;
  readonly message: string;
}

export type TicketParseResult =
  | { readonly ok: true; readonly ticket: TicketRecord }
  | { readonly ok: false; readonly warning: TicketWarning };
