import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { interestSnapshots } from "./interestSnapshots";

export const latestInterestSnapshots = pgTable(
  "latest_interest_snapshots",
  {
    id: serial("id").primaryKey(),
    conversationId: varchar("conversation_id", { length: 100 }).notNull(),
    viewerUserId: integer("viewer_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    partnerUserId: integer("partner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    prsScore: real("prs_score").notNull(),
    confidenceScore: real("confidence_score").notNull(),
    stage: varchar("stage", { length: 20 }).notNull(),
    lowConfidenceState: varchar("low_confidence_state", { length: 50 }),
    reasonCodes: jsonb("reason_codes").notNull().default([]),
    coachingCodes: jsonb("coaching_codes").notNull().default([]),
    coachingPayload: jsonb("coaching_payload").notNull().default({}),
    featureBreakdown: jsonb("feature_breakdown").notNull().default({}),
    penaltyBreakdown: jsonb("penalty_breakdown").notNull().default({}),
    llmEnriched: boolean("llm_enriched").notNull().default(false),
    modelVersion: varchar("model_version", { length: 20 }).notNull().default("v1.1.0"),
    messageCount: integer("message_count").notNull(),
    snapshotId: integer("snapshot_id")
      .notNull()
      .references(() => interestSnapshots.id, { onDelete: "restrict" }),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("uniq_lis_conv_viewer").on(t.conversationId, t.viewerUserId),
    index("idx_lis_viewer").on(t.viewerUserId),
  ]
);

export type LatestInterestSnapshot = typeof latestInterestSnapshots.$inferSelect;
