-- ===== DAILY REVENUE MATERIALIZED VIEW =====
CREATE MATERIALIZED VIEW analytics_daily_revenue AS
SELECT 
  DATE(purchase_date) as date,
  SUM(amount) as revenue,
  COUNT(*) as order_count,
  COUNT(DISTINCT customer_id) as unique_customers,
  AVG(amount) as avg_order_value,
  SUM(quantity) as tickets_sold
FROM orders
WHERE status = 'COMPLETED'
GROUP BY DATE(purchase_date)
ORDER BY date DESC;

CREATE UNIQUE INDEX ON analytics_daily_revenue(date);

-- ===== MONTHLY REVENUE MATERIALIZED VIEW =====
CREATE MATERIALIZED VIEW analytics_monthly_revenue AS
SELECT 
  TO_CHAR(purchase_date, 'YYYY-MM') as month,
  SUM(amount) as revenue,
  COUNT(*) as order_count,
  COUNT(DISTINCT customer_id) as unique_customers,
  AVG(amount) as avg_order_value,
  SUM(quantity) as tickets_sold
FROM orders
WHERE status = 'COMPLETED'
GROUP BY TO_CHAR(purchase_date, 'YYYY-MM')
ORDER BY month DESC;

CREATE UNIQUE INDEX ON analytics_monthly_revenue(month);

-- ===== SESSION PERFORMANCE MATERIALIZED VIEW =====
CREATE MATERIALIZED VIEW analytics_session_performance AS
SELECT 
  t.game_session,
  COUNT(t.id) as total_tickets,
  COUNT(CASE WHEN t.status = 'SCANNED' THEN 1 END) as scanned_tickets,
  ROUND(
    COUNT(CASE WHEN t.status = 'SCANNED' THEN 1 END)::numeric / 
    NULLIF(COUNT(t.id), 0) * 100, 
    2
  ) as scan_rate,
  SUM(o.amount) / NULLIF(COUNT(t.id), 0) as avg_revenue_per_ticket,
  SUM(o.amount) as total_revenue,
  MIN(t.created_at) as first_ticket_date,
  MAX(t.created_at) as last_ticket_date
FROM tickets t
JOIN orders o ON t.order_id = o.id
WHERE o.status = 'COMPLETED'
GROUP BY t.game_session;

CREATE INDEX ON analytics_session_performance(game_session);

-- ===== CUSTOMER SEGMENTS MATERIALIZED VIEW =====
CREATE MATERIALIZED VIEW analytics_customer_segments AS
WITH customer_metrics AS (
  SELECT 
    c.id,
    c.email,
    c.first_name,
    c.last_name,
    COUNT(o.id) as order_count,
    COALESCE(SUM(o.amount), 0) as total_spent,
    MAX(o.purchase_date) as last_purchase,
    COALESCE(EXTRACT(DAY FROM NOW() - MAX(o.purchase_date)), 999) as days_since_purchase
  FROM customers c
  LEFT JOIN orders o ON c.id = o.customer_id AND o.status = 'COMPLETED'
  GROUP BY c.id, c.email, c.first_name, c.last_name
)
SELECT 
  id,
  email,
  first_name,
  last_name,
  order_count,
  total_spent,
  last_purchase,
  days_since_purchase,
  CASE
    WHEN order_count >= 5 AND total_spent > 50000 AND days_since_purchase < 30 THEN 'champions'
    WHEN order_count >= 3 AND total_spent > 25000 AND days_since_purchase < 60 THEN 'loyal'
    WHEN order_count >= 2 AND days_since_purchase < 60 THEN 'potential_loyalists'
    WHEN order_count >= 3 AND days_since_purchase > 90 THEN 'at_risk'
    WHEN order_count = 1 AND days_since_purchase < 90 THEN 'new'
    ELSE 'needs_attention'
  END as segment
FROM customer_metrics;

CREATE INDEX ON analytics_customer_segments(segment);
CREATE INDEX ON analytics_customer_segments(email);

-- ===== SCAN STATISTICS MATERIALIZED VIEW =====
CREATE MATERIALIZED VIEW analytics_scan_stats AS
SELECT 
  DATE(scanned_at) as date,
  COUNT(*) as total_scans,
  COUNT(CASE WHEN allowed THEN 1 END) as allowed_scans,
  COUNT(CASE WHEN NOT allowed THEN 1 END) as denied_scans,
  ROUND(
    COUNT(CASE WHEN allowed THEN 1 END)::numeric / 
    NULLIF(COUNT(*), 0) * 100, 
    2
  ) as success_rate,
  location
FROM ticket_scans
GROUP BY DATE(scanned_at), location
ORDER BY date DESC, location;

CREATE INDEX ON analytics_scan_stats(date DESC);
CREATE INDEX ON analytics_scan_stats(location);

-- ===== REFRESH FUNCTION =====
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_daily_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_monthly_revenue;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_session_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_customer_segments;
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_scan_stats;
END;
$$ LANGUAGE plpgsql;