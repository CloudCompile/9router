import {
  pgTable, text, integer, serial, real,
  index, uniqueIndex, primaryKey,
} from "drizzle-orm/pg-core";

export const meta = pgTable("_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const settings = pgTable("settings", {
  id: integer("id").primaryKey(),
  data: text("data").notNull(),
});

export const providerConnections = pgTable("providerconnections", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  authType: text("authtype").notNull(),
  name: text("name"),
  email: text("email"),
  priority: integer("priority"),
  isActive: integer("isactive").default(1),
  data: text("data").notNull(),
  createdAt: text("createdat").notNull(),
  updatedAt: text("updatedat").notNull(),
}, (t) => [
  index("idx_pc_provider").on(t.provider),
  index("idx_pc_provider_active").on(t.provider, t.isActive),
  index("idx_pc_priority").on(t.provider, t.priority),
]);

export const providerNodes = pgTable("providernodes", {
  id: text("id").primaryKey(),
  type: text("type"),
  name: text("name"),
  data: text("data").notNull(),
  createdAt: text("createdat").notNull(),
  updatedAt: text("updatedat").notNull(),
}, (t) => [
  index("idx_pn_type").on(t.type),
]);

export const proxyPools = pgTable("proxypools", {
  id: text("id").primaryKey(),
  isActive: integer("isactive").default(1),
  testStatus: text("teststatus"),
  data: text("data").notNull(),
  createdAt: text("createdat").notNull(),
  updatedAt: text("updatedat").notNull(),
}, (t) => [
  index("idx_pp_active").on(t.isActive),
  index("idx_pp_status").on(t.testStatus),
]);

export const apiKeys = pgTable("apikeys", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  name: text("name"),
  machineId: text("machineid"),
  isActive: integer("isactive").default(1),
  createdAt: text("createdat").notNull(),
}, (t) => [
  index("idx_ak_key").on(t.key),
]);

export const combos = pgTable("combos", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  kind: text("kind"),
  models: text("models").notNull(),
  createdAt: text("createdat").notNull(),
  updatedAt: text("updatedat").notNull(),
}, (t) => [
  index("idx_combo_name").on(t.name),
]);

export const kv = pgTable("kv", {
  scope: text("scope").notNull(),
  key: text("key").notNull(),
  value: text("value").notNull(),
}, (t) => [
  primaryKey({ columns: [t.scope, t.key] }),
  index("idx_kv_scope").on(t.scope),
]);

export const usageHistory = pgTable("usagehistory", {
  id: serial("id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  provider: text("provider"),
  model: text("model"),
  connectionId: text("connectionid"),
  apiKey: text("apikey"),
  endpoint: text("endpoint"),
  promptTokens: integer("prompttokens").default(0),
  completionTokens: integer("completiontokens").default(0),
  cost: real("cost").default(0),
  status: text("status"),
  tokens: text("tokens"),
  meta: text("meta"),
}, (t) => [
  index("idx_uh_ts").on(t.timestamp),
  index("idx_uh_provider").on(t.provider),
  index("idx_uh_model").on(t.model),
  index("idx_uh_conn").on(t.connectionId),
]);

export const usageDaily = pgTable("usagedaily", {
  dateKey: text("datekey").primaryKey(),
  data: text("data").notNull(),
});

export const requestDetails = pgTable("requestdetails", {
  id: text("id").primaryKey(),
  timestamp: text("timestamp").notNull(),
  provider: text("provider"),
  model: text("model"),
  connectionId: text("connectionid"),
  status: text("status"),
  data: text("data").notNull(),
}, (t) => [
  index("idx_rd_ts").on(t.timestamp),
  index("idx_rd_provider").on(t.provider),
  index("idx_rd_model").on(t.model),
  index("idx_rd_conn").on(t.connectionId),
]);
