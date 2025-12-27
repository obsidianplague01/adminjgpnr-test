CREATE TABLE IF NOT EXISTS "campaign_tracking" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "openedAt" TIMESTAMP(3),
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "clickedAt" TIMESTAMP(3),
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_tracking_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "analytics_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_cache_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "revenue_targets" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "target" DECIMAL(10,2) NOT NULL,
    "actual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "revenue_targets_pkey" PRIMARY KEY ("id")
);

-- ===== ADD INDEXES FOR EXISTING TABLES =====

-- Users
CREATE INDEX IF NOT EXISTS "users_role_isActive_idx" ON "users"("role", "isActive");

-- Customers
CREATE INDEX IF NOT EXISTS "customers_createdAt_status_idx" ON "customers"("createdAt", "status");
CREATE INDEX IF NOT EXISTS "customers_totalSpent_idx" ON "customers"("totalSpent");
CREATE INDEX IF NOT EXISTS "customers_lastPurchase_idx" ON "customers"("lastPurchase");

-- Orders
CREATE INDEX IF NOT EXISTS "orders_purchaseDate_status_idx" ON "orders"("purchaseDate", "status");
CREATE INDEX IF NOT EXISTS "orders_customerId_status_idx" ON "orders"("customerId", "status");
CREATE INDEX IF NOT EXISTS "orders_createdAt_status_idx" ON "orders"("createdAt", "status");

-- Tickets
CREATE INDEX IF NOT EXISTS "tickets_createdAt_status_idx" ON "tickets"("createdAt", "status");
CREATE INDEX IF NOT EXISTS "tickets_gameSession_status_idx" ON "tickets"("gameSession", "status");
CREATE INDEX IF NOT EXISTS "tickets_validUntil_status_idx" ON "tickets"("validUntil", "status");
CREATE INDEX IF NOT EXISTS "tickets_firstScanAt_idx" ON "tickets"("firstScanAt");

-- TicketScans
CREATE INDEX IF NOT EXISTS "ticket_scans_scannedAt_allowed_idx" ON "ticket_scans"("scannedAt", "allowed");
CREATE INDEX IF NOT EXISTS "ticket_scans_ticketId_scannedAt_idx" ON "ticket_scans"("ticketId", "scannedAt");

-- Subscribers
CREATE INDEX IF NOT EXISTS "subscribers_subscribedAt_idx" ON "subscribers"("subscribedAt");

-- EmailTemplates
CREATE INDEX IF NOT EXISTS "email_templates_category_status_idx" ON "email_templates"("category", "status");

-- Campaigns
CREATE INDEX IF NOT EXISTS "campaigns_sentAt_idx" ON "campaigns"("sentAt");

-- Notifications
CREATE INDEX IF NOT EXISTS "notifications_createdAt_idx" ON "notifications"("createdAt");

-- AuditLogs
CREATE INDEX IF NOT EXISTS "audit_logs_action_entity_idx" ON "audit_logs"("action", "entity");

-- LoginActivity
CREATE INDEX IF NOT EXISTS "login_activities_status_idx" ON "login_activities"("status");

-- ActiveSessions
CREATE INDEX IF NOT EXISTS "active_sessions_expiresAt_idx" ON "active_sessions"("expiresAt");

-- ===== ADD UNIQUE CONSTRAINTS =====

CREATE UNIQUE INDEX IF NOT EXISTS "campaign_tracking_campaignId_subscriberId_key" 
    ON "campaign_tracking"("campaignId", "subscriberId");

CREATE UNIQUE INDEX IF NOT EXISTS "analytics_cache_cacheKey_key" 
    ON "analytics_cache"("cacheKey");

CREATE UNIQUE INDEX IF NOT EXISTS "revenue_targets_month_key" 
    ON "revenue_targets"("month");

-- ===== ADD INDEXES FOR NEW TABLES =====

CREATE INDEX IF NOT EXISTS "campaign_tracking_campaignId_idx" ON "campaign_tracking"("campaignId");
CREATE INDEX IF NOT EXISTS "campaign_tracking_subscriberId_idx" ON "campaign_tracking"("subscriberId");
CREATE INDEX IF NOT EXISTS "campaign_tracking_opened_clicked_converted_idx" 
    ON "campaign_tracking"("opened", "clicked", "converted");

CREATE INDEX IF NOT EXISTS "analytics_cache_cacheKey_expiresAt_idx" 
    ON "analytics_cache"("cacheKey", "expiresAt");
CREATE INDEX IF NOT EXISTS "analytics_cache_expiresAt_idx" ON "analytics_cache"("expiresAt");

CREATE INDEX IF NOT EXISTS "revenue_targets_month_idx" ON "revenue_targets"("month");

-- ===== ADD FOREIGN KEYS =====

ALTER TABLE "campaign_tracking" 
    ADD CONSTRAINT "campaign_tracking_campaignId_fkey" 
    FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "campaign_tracking" 
    ADD CONSTRAINT "campaign_tracking_subscriberId_fkey" 
    FOREIGN KEY ("subscriberId") REFERENCES "subscribers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ===== ANALYZE TABLES FOR QUERY PLANNER =====

ANALYZE "users";
ANALYZE "customers";
ANALYZE "orders";
ANALYZE "tickets";
ANALYZE "ticket_scans";
ANALYZE "subscribers";
ANALYZE "campaigns";
ANALYZE "email_templates";
ANALYZE "notifications";
ANALYZE "audit_logs";

-- ===== CLEANUP: Remove expired cache entries (optional maintenance) =====

CREATE OR REPLACE FUNCTION cleanup_expired_cache() RETURNS void AS $$
BEGIN
    DELETE FROM analytics_cache WHERE "expiresAt" < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup via pg_cron or external scheduler
-- Example: SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache()');