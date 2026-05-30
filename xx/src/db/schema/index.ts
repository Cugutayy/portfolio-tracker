import {
  pgTable,
  pgEnum,
  uuid,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Enums ───
export const assetTypeEnum = pgEnum("asset_type", [
  "crypto",
  "commodity",
  "index",
  "sp500",
  "nasdaq100",
  "bist100",
]);
export const tradeSideEnum = pgEnum("trade_side", ["buy", "sell"]);

// ════════════════════════════════════════════════════════════
// USERS — each user IS a portfolio (1M TL starting balance)
// ════════════════════════════════════════════════════════════
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    handle: text("handle").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash"), // null for OAuth-only accounts
    image: text("image"),
    bio: text("bio"),
    // Virtual money, all in TRY
    cashBalanceTry: numeric("cash_balance_try", { precision: 20, scale: 4 })
      .notNull()
      .default("1000000"),
    startingBalanceTry: numeric("starting_balance_try", {
      precision: 20,
      scale: 4,
    })
      .notNull()
      .default("1000000"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_handle_idx").on(t.handle),
  ],
);

// ════════════════════════════════════════════════════════════
// HOLDINGS — current open positions (max 5 per user, app-enforced)
// ════════════════════════════════════════════════════════════
export const holdings = pgTable(
  "holdings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: text("asset_id").notNull(), // canonical, e.g. "crypto:bitcoin"
    assetType: assetTypeEnum("asset_type").notNull(),
    symbol: text("symbol").notNull(), // e.g. BTC, AAPL, THYAO.IS, gold
    name: text("name").notNull(),
    quantity: numeric("quantity", { precision: 32, scale: 12 }).notNull(),
    avgBuyPriceTry: numeric("avg_buy_price_try", {
      precision: 24,
      scale: 6,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("holdings_user_asset_idx").on(t.userId, t.assetId),
    index("holdings_user_idx").on(t.userId),
  ],
);

// ════════════════════════════════════════════════════════════
// TRADES — immutable transaction history
// ════════════════════════════════════════════════════════════
export const trades = pgTable(
  "trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    assetId: text("asset_id").notNull(),
    assetType: assetTypeEnum("asset_type").notNull(),
    symbol: text("symbol").notNull(),
    name: text("name").notNull(),
    side: tradeSideEnum("side").notNull(),
    quantity: numeric("quantity", { precision: 32, scale: 12 }).notNull(),
    priceTry: numeric("price_try", { precision: 24, scale: 6 }).notNull(),
    amountTry: numeric("amount_try", { precision: 24, scale: 4 }).notNull(),
    // Realized P/L in TRY, set on sells (qty * (sellPrice - avgBuyPrice))
    realizedPnlTry: numeric("realized_pnl_try", { precision: 24, scale: 4 }),
    // Weight of this asset in the portfolio right after the trade (0..1)
    weightAfter: numeric("weight_after", { precision: 8, scale: 6 }),
    tradedAt: timestamp("traded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("trades_user_idx").on(t.userId),
    index("trades_user_traded_idx").on(t.userId, t.tradedAt),
  ],
);

// ════════════════════════════════════════════════════════════
// FOLLOWS
// ════════════════════════════════════════════════════════════
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId),
  ],
);

// ════════════════════════════════════════════════════════════
// LIKES — on a portfolio (target = owner user)
// ════════════════════════════════════════════════════════════
export const likes = pgTable(
  "likes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    portfolioUserId: uuid("portfolio_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.portfolioUserId] }),
    index("likes_portfolio_idx").on(t.portfolioUserId),
  ],
);

// ════════════════════════════════════════════════════════════
// COMMENTS — on a portfolio
// ════════════════════════════════════════════════════════════
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    portfolioUserId: uuid("portfolio_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("comments_portfolio_idx").on(t.portfolioUserId, t.createdAt)],
);

// ════════════════════════════════════════════════════════════
// PRICE SNAPSHOTS — per-asset price history (TRY), for charts/benchmarks
// ════════════════════════════════════════════════════════════
export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: text("asset_id").notNull(),
    symbol: text("symbol").notNull(),
    priceTry: numeric("price_try", { precision: 24, scale: 6 }).notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("price_asset_taken_idx").on(t.assetId, t.takenAt)],
);

// ════════════════════════════════════════════════════════════
// PORTFOLIO SNAPSHOTS — per-user total value history (TRY)
// Drives performance (daily..all-time), volatility, beta, drawdown.
// ════════════════════════════════════════════════════════════
export const portfolioSnapshots = pgTable(
  "portfolio_snapshots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    valueTry: numeric("value_try", { precision: 20, scale: 4 }).notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("psnap_user_taken_idx").on(t.userId, t.takenAt)],
);

// ─── Inferred types ───
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Holding = typeof holdings.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Comment = typeof comments.$inferSelect;
