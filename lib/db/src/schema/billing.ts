import { pgTable, serial, integer, varchar, timestamp, text, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const iapPurchases = pgTable("iap_purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  platform: varchar("platform", { length: 16 }).notNull(),
  productId: varchar("product_id", { length: 128 }).notNull(),
  transactionId: varchar("transaction_id", { length: 256 }).notNull().unique(),
  purchaseToken: text("purchase_token"),
  verificationStatus: varchar("verification_status", { length: 32 }).notNull().default("pending"),
  verifiedAt: timestamp("verified_at"),
  creditsGranted: integer("credits_granted").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const creditWallets = pgTable("credit_wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  balanceCache: integer("balance_cache").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const aiLedger = pgTable("ai_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  entryType: varchar("entry_type", { length: 32 }).notNull(),
  credits: integer("credits").notNull(),
  featureType: varchar("feature_type", { length: 64 }),
  referenceId: varchar("reference_id", { length: 128 }),
  balanceAfter: integer("balance_after").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
