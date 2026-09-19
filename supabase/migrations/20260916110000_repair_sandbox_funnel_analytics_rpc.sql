-- Migration: 20260916110000_repair_sandbox_funnel_analytics_rpc.sql
-- Purpose: Phase 5B Production RPC Repair (PostgreSQL UUID aggregate fix in anon_mapping_stats)
-- Replaces invalid MIN(user_id) where user_id is UUID with MIN(user_id::text)::uuid.
-- Preserves all canonical funnel stages, successful simulation (Berhasil), retention, attribution, and security contracts.

CREATE OR REPLACE FUNCTION public.get_sandbox_funnel_analytics(
  p_event_start timestamptz DEFAULT NULL,
  p_event_end timestamptz DEFAULT NULL,
  p_cohort_start timestamptz DEFAULT NULL,
  p_cohort_end timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_event_start timestamptz;
  v_event_end timestamptz;
  v_cohort_start timestamptz;
  v_cohort_end timestamptz;
  v_result jsonb;
BEGIN
  -- 1. Normalize Date Bounds
  v_event_start := COALESCE(p_event_start, '1970-01-01 00:00:00+00'::timestamptz);
  v_event_end := COALESCE(p_event_end, now());
  v_cohort_start := COALESCE(p_cohort_start, v_event_start);
  v_cohort_end := COALESCE(p_cohort_end, v_event_end);

  WITH
  -- 2. Staff Exclusion
  staff_users AS (
    SELECT id FROM public.profiles WHERE LOWER(role) IN ('admin', 'manager')
  ),

  -- 3. Identity Stitching & Disambiguation (UUID-safe MIN aggregation via text cast)
  anon_mapping_stats AS (
    SELECT
      anonymous_id,
      COUNT(DISTINCT user_id) AS linked_user_count,
      MIN(user_id::text)::uuid AS single_user_id
    FROM public.sandbox_funnel_events
    WHERE anonymous_id IS NOT NULL
      AND user_id IS NOT NULL
      AND user_id NOT IN (SELECT id FROM staff_users)
    GROUP BY anonymous_id
  ),
  ambiguous_anon_ids AS (
    SELECT anonymous_id FROM anon_mapping_stats WHERE linked_user_count > 1
  ),
  unambiguous_anon_map AS (
    SELECT anonymous_id, single_user_id AS user_id
    FROM anon_mapping_stats
    WHERE linked_user_count = 1
  ),

  -- 4. Valid Events Filter (excluding staff and future timestamp anomalies)
  valid_events AS (
    SELECT
      e.id,
      e.event_name,
      e.is_meaningful,
      e.occurred_at,
      COALESCE(NULLIF(TRIM(e.source), ''), 'direct') AS source,
      COALESCE(NULLIF(TRIM(e.medium), ''), 'none') AS medium,
      COALESCE(NULLIF(TRIM(e.campaign), ''), 'none') AS campaign,
      e.metadata,
      e.user_id,
      e.anonymous_id,
      CASE
        WHEN e.user_id IS NOT NULL THEN e.user_id::text
        WHEN e.anonymous_id IS NOT NULL AND u.user_id IS NOT NULL THEN u.user_id::text
        WHEN e.anonymous_id IS NOT NULL THEN 'anon:' || e.anonymous_id
        ELSE NULL
      END AS canonical_identity
    FROM public.sandbox_funnel_events e
    LEFT JOIN unambiguous_anon_map u ON e.anonymous_id = u.anonymous_id AND e.user_id IS NULL
    WHERE (e.user_id IS NULL OR e.user_id NOT IN (SELECT id FROM staff_users))
      AND e.occurred_at <= (now() + interval '1 minute')
  ),

  -- 5. Data Quality Anomalies
  anomaly_counts AS (
    SELECT
      (SELECT COUNT(*) FROM ambiguous_anon_ids) AS ambiguous_anon_count,
      (
        SELECT COUNT(DISTINCT o.user_id)
        FROM public.sandbox_orders o
        WHERE o.status = 'Berhasil'
          AND o.user_id NOT IN (SELECT user_id FROM public.sandbox_access)
          AND o.user_id NOT IN (SELECT id FROM staff_users)
      ) AS unanchored_simulations,
      (
        SELECT COUNT(DISTINCT c.user_id)
        FROM public.sandbox_tester_conversion_events c
        WHERE c.user_id NOT IN (SELECT user_id FROM public.sandbox_access)
          AND c.user_id NOT IN (SELECT id FROM staff_users)
      ) AS unanchored_conversions,
      (
        SELECT COUNT(*)
        FROM public.sandbox_funnel_events
        WHERE occurred_at > (now() + interval '1 minute')
      ) AS future_timestamp_events
  ),

  -- 6. Funnel Stage 1: Discovery (sandbox_landing_view in event range)
  discovery_identities AS (
    SELECT DISTINCT canonical_identity
    FROM valid_events
    WHERE event_name = 'sandbox_landing_view'
      AND canonical_identity IS NOT NULL
      AND occurred_at >= v_event_start AND occurred_at <= v_event_end
  ),

  -- 7. Funnel Stage 2: Intent (sandbox_cta_click in event range)
  intent_identities AS (
    SELECT DISTINCT canonical_identity
    FROM valid_events
    WHERE event_name = 'sandbox_cta_click'
      AND canonical_identity IS NOT NULL
      AND occurred_at >= v_event_start AND occurred_at <= v_event_end
  ),

  -- 8. Funnel Stage 3: Eligibility (sandbox_eligibility_evaluated with pass/eligible in event range)
  eligibility_identities AS (
    SELECT DISTINCT canonical_identity
    FROM valid_events
    WHERE event_name = 'sandbox_eligibility_evaluated'
      AND (metadata->>'result' IN ('pass', 'eligible'))
      AND canonical_identity IS NOT NULL
      AND occurred_at >= v_event_start AND occurred_at <= v_event_end
  ),

  -- 9. Funnel Stage 4: Activation Cohort (sandbox_access in cohort range)
  activation_cohort AS (
    SELECT
      a.user_id,
      a.created_at AS activation_time,
      (now() >= a.created_at + interval '14 days') AS is_mature
    FROM public.sandbox_access a
    WHERE a.created_at >= v_cohort_start AND a.created_at <= v_cohort_end
      AND a.user_id NOT IN (SELECT id FROM staff_users)
  ),

  -- 10. Funnel Stage 5: Exploration (catalog or margin view at/after activation)
  exploration_cohort AS (
    SELECT DISTINCT a.user_id
    FROM activation_cohort a
    JOIN valid_events e ON e.user_id = a.user_id
    WHERE e.event_name IN ('sandbox_catalog_view', 'sandbox_margin_view')
      AND e.occurred_at >= a.activation_time
  ),

  -- 11. Funnel Stage 6: First Value (first Berhasil sandbox order at/after activation)
  first_value_cohort AS (
    SELECT
      a.user_id,
      MIN(o.created_at) AS first_order_at
    FROM activation_cohort a
    JOIN public.sandbox_orders o ON o.user_id = a.user_id
    WHERE o.status = 'Berhasil'
      AND o.created_at >= a.activation_time
    GROUP BY a.user_id
  ),

  -- 12. Funnel Stage 7: Retention (meaningful activity on >= 2 distinct WIB calendar days in [activation, +14d))
  meaningful_events_window AS (
    -- Telemetry meaningful events
    SELECT
      a.user_id,
      a.is_mature,
      DATE_TRUNC('day', e.occurred_at AT TIME ZONE 'Asia/Jakarta')::date AS activity_date
    FROM activation_cohort a
    JOIN valid_events e ON e.user_id = a.user_id
    WHERE e.event_name IN ('sandbox_catalog_view', 'sandbox_margin_view', 'sandbox_order_review')
      AND e.occurred_at >= a.activation_time
      AND e.occurred_at < a.activation_time + interval '14 days'

    UNION

    -- Successful simulation orders
    SELECT
      a.user_id,
      a.is_mature,
      DATE_TRUNC('day', o.created_at AT TIME ZONE 'Asia/Jakarta')::date AS activity_date
    FROM activation_cohort a
    JOIN public.sandbox_orders o ON o.user_id = a.user_id
    WHERE o.status = 'Berhasil'
      AND o.created_at >= a.activation_time
      AND o.created_at < a.activation_time + interval '14 days'
  ),
  user_activity_day_counts AS (
    SELECT
      user_id,
      is_mature,
      COUNT(DISTINCT activity_date) AS distinct_days
    FROM meaningful_events_window
    GROUP BY user_id, is_mature
  ),
  retained_mature_cohort AS (
    SELECT user_id
    FROM user_activity_day_counts
    WHERE is_mature = true
      AND distinct_days >= 2
  ),
  active_immature_cohort AS (
    SELECT user_id
    FROM user_activity_day_counts
    WHERE is_mature = false
      AND distinct_days >= 1
  ),

  -- 13. Funnel Stage 8: Conversion (self-service conversion at/after activation)
  conversion_cohort AS (
    SELECT
      a.user_id,
      MIN(c.occurred_at) AS converted_at
    FROM activation_cohort a
    JOIN public.sandbox_tester_conversion_events c ON c.user_id = a.user_id
    WHERE c.resulting_state = 'MEMBER_LIVE_LOCKED'
      AND c.actor_type = 'self_service'
      AND c.occurred_at >= a.activation_time
    GROUP BY a.user_id
  ),

  -- 14. Stage Counts Aggregation
  stage_counts AS (
    SELECT
      (SELECT COUNT(*) FROM discovery_identities) AS discovery_count,
      (SELECT COUNT(*) FROM intent_identities) AS intent_count,
      (SELECT COUNT(*) FROM eligibility_identities) AS eligibility_count,
      (SELECT COUNT(*) FROM activation_cohort) AS activation_count,
      (SELECT COUNT(*) FROM exploration_cohort) AS exploration_count,
      (SELECT COUNT(*) FROM first_value_cohort) AS first_value_count,
      (SELECT COUNT(*) FROM retained_mature_cohort) AS retained_mature_count,
      (SELECT COUNT(*) FROM activation_cohort WHERE is_mature = true) AS total_mature_count,
      (SELECT COUNT(*) FROM activation_cohort WHERE is_mature = false) AS total_immature_count,
      (SELECT COUNT(*) FROM active_immature_cohort) AS active_immature_count,
      (SELECT COUNT(*) FROM conversion_cohort) AS conversion_count
  ),

  -- 15. Time to Value Metrics
  ttv_metrics AS (
    SELECT
      ROUND(COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (f.first_order_at - a.activation_time)) / 3600.0), 0)::numeric, 1) AS median_ttv_hours,
      ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (f.first_order_at - a.activation_time)) / 3600.0), 0)::numeric, 1) AS avg_ttv_hours,
      ROUND(COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (c.converted_at - a.activation_time)) / 86400.0), 0)::numeric, 1) AS median_ttc_days,
      ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (c.converted_at - a.activation_time)) / 86400.0), 0)::numeric, 1) AS avg_ttc_days
    FROM activation_cohort a
    LEFT JOIN first_value_cohort f ON f.user_id = a.user_id
    LEFT JOIN conversion_cohort c ON c.user_id = a.user_id
  ),

  -- 16. Days Active Distribution (for Mature Cohort)
  activity_distribution AS (
    SELECT
      COUNT(*) FILTER (WHERE distinct_days = 1) AS days_1,
      COUNT(*) FILTER (WHERE distinct_days = 2) AS days_2,
      COUNT(*) FILTER (WHERE distinct_days BETWEEN 3 AND 5) AS days_3_to_5,
      COUNT(*) FILTER (WHERE distinct_days >= 6) AS days_6_plus
    FROM user_activity_day_counts
    WHERE is_mature = true
  ),

  -- 17. Attribution Breakdown (by source, medium, campaign)
  attribution_summary AS (
    SELECT
      e.source,
      e.medium,
      e.campaign,
      COUNT(DISTINCT e.canonical_identity) AS visitors,
      COUNT(DISTINCT a.user_id) AS activations,
      COUNT(DISTINCT f.user_id) AS first_value,
      COUNT(DISTINCT c.user_id) AS conversions
    FROM valid_events e
    LEFT JOIN activation_cohort a ON a.user_id::text = e.canonical_identity
    LEFT JOIN first_value_cohort f ON f.user_id = a.user_id
    LEFT JOIN conversion_cohort c ON c.user_id = a.user_id
    WHERE e.occurred_at >= v_event_start AND e.occurred_at <= v_event_end
    GROUP BY e.source, e.medium, e.campaign
    ORDER BY visitors DESC
    LIMIT 50
  ),

  -- 18. Current Static Persona Distribution (from sandbox_access)
  persona_snapshot AS (
    SELECT
      COUNT(*) FILTER (WHERE simulated_member_type = 'regular') AS current_regular,
      COUNT(*) FILTER (WHERE simulated_member_type = 'special') AS current_special
    FROM public.sandbox_access
    WHERE user_id NOT IN (SELECT id FROM staff_users)
  )

  -- 19. Assemble Final Structured JSON
  SELECT jsonb_build_object(
    'meta', jsonb_build_object(
      'generatedAt', now(),
      'timezone', 'Asia/Jakarta',
      'eventWindow', jsonb_build_object('start', v_event_start, 'end', v_event_end),
      'cohortWindow', jsonb_build_object('start', v_cohort_start, 'end', v_cohort_end)
    ),
    'funnel', jsonb_build_array(
      jsonb_build_object(
        'stage', 'discovery',
        'label', 'Discovery',
        'uniqueUsers', sc.discovery_count,
        'conversionRate', 100.0,
        'dropOffRate', 0.0
      ),
      jsonb_build_object(
        'stage', 'intent',
        'label', 'Intent (CTA Click)',
        'uniqueUsers', sc.intent_count,
        'conversionRate', CASE WHEN sc.discovery_count > 0 THEN ROUND((sc.intent_count::numeric / sc.discovery_count::numeric) * 100.0, 1) ELSE 0.0 END,
        'dropOffRate', CASE WHEN sc.discovery_count > 0 THEN ROUND((GREATEST(0, sc.discovery_count - sc.intent_count)::numeric / sc.discovery_count::numeric) * 100.0, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'eligibility',
        'label', 'Eligibility Passed',
        'uniqueUsers', sc.eligibility_count,
        'conversionRate', CASE WHEN sc.intent_count > 0 THEN ROUND((sc.eligibility_count::numeric / sc.intent_count::numeric) * 100.0, 1) ELSE 0.0 END,
        'dropOffRate', CASE WHEN sc.intent_count > 0 THEN ROUND((GREATEST(0, sc.intent_count - sc.eligibility_count)::numeric / sc.intent_count::numeric) * 100.0, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'activation',
        'label', 'Activation',
        'uniqueUsers', sc.activation_count,
        'conversionRate', CASE WHEN sc.eligibility_count > 0 THEN ROUND((sc.activation_count::numeric / sc.eligibility_count::numeric) * 100.0, 1) ELSE 0.0 END,
        'dropOffRate', CASE WHEN sc.eligibility_count > 0 THEN ROUND((GREATEST(0, sc.eligibility_count - sc.activation_count)::numeric / sc.eligibility_count::numeric) * 100.0, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'exploration',
        'label', 'Exploration (Catalog / Margin)',
        'uniqueUsers', sc.exploration_count,
        'conversionRate', CASE WHEN sc.activation_count > 0 THEN ROUND((sc.exploration_count::numeric / sc.activation_count::numeric) * 100.0, 1) ELSE 0.0 END,
        'dropOffRate', CASE WHEN sc.activation_count > 0 THEN ROUND((GREATEST(0, sc.activation_count - sc.exploration_count)::numeric / sc.activation_count::numeric) * 100.0, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'first_value',
        'label', 'First Value (Successful Simulation)',
        'uniqueUsers', sc.first_value_count,
        'conversionRate', CASE WHEN sc.activation_count > 0 THEN ROUND((sc.first_value_count::numeric / sc.activation_count::numeric) * 100.0, 1) ELSE 0.0 END,
        'dropOffRate', CASE WHEN sc.activation_count > 0 THEN ROUND((GREATEST(0, sc.activation_count - sc.first_value_count)::numeric / sc.activation_count::numeric) * 100.0, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'retention',
        'label', '14-Day Retention (Mature)',
        'uniqueUsers', sc.retained_mature_count,
        'conversionRate', CASE WHEN sc.total_mature_count > 0 THEN ROUND((sc.retained_mature_count::numeric / sc.total_mature_count::numeric) * 100.0, 1) ELSE 0.0 END,
        'dropOffRate', CASE WHEN sc.total_mature_count > 0 THEN ROUND((GREATEST(0, sc.total_mature_count - sc.retained_mature_count)::numeric / sc.total_mature_count::numeric) * 100.0, 1) ELSE 0.0 END
      ),
      jsonb_build_object(
        'stage', 'conversion',
        'label', 'Conversion (Self-Service)',
        'uniqueUsers', sc.conversion_count,
        'conversionRate', CASE WHEN sc.activation_count > 0 THEN ROUND((sc.conversion_count::numeric / sc.activation_count::numeric) * 100.0, 1) ELSE 0.0 END,
        'dropOffRate', CASE WHEN sc.activation_count > 0 THEN ROUND((GREATEST(0, sc.activation_count - sc.conversion_count)::numeric / sc.activation_count::numeric) * 100.0, 1) ELSE 0.0 END
      )
    ),
    'retention', jsonb_build_object(
      'matureCohort', jsonb_build_object(
        'activatedUsers', sc.total_mature_count,
        'retainedUsers', sc.retained_mature_count,
        'retentionRate', CASE WHEN sc.total_mature_count > 0 THEN ROUND((sc.retained_mature_count::numeric / sc.total_mature_count::numeric) * 100.0, 1) ELSE 0.0 END
      ),
      'immatureCohort', jsonb_build_object(
        'activatedUsers', sc.total_immature_count,
        'activeSoFar', sc.active_immature_count,
        'status', 'IN_PROGRESS'
      ),
      'activityDaysDistribution', jsonb_build_object(
        '1_day', COALESCE((SELECT days_1 FROM activity_distribution), 0),
        '2_days', COALESCE((SELECT days_2 FROM activity_distribution), 0),
        '3_to_5_days', COALESCE((SELECT days_3_to_5 FROM activity_distribution), 0),
        '6_plus_days', COALESCE((SELECT days_6_plus FROM activity_distribution), 0)
      )
    ),
    'attribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'source', a.source,
        'medium', a.medium,
        'campaign', a.campaign,
        'visitors', a.visitors,
        'activations', a.activations,
        'firstValue', a.first_value,
        'conversions', a.conversions,
        'activationRate', CASE WHEN a.visitors > 0 THEN ROUND((a.activations::numeric / a.visitors::numeric) * 100.0, 1) ELSE 0.0 END,
        'conversionRate', CASE WHEN a.activations > 0 THEN ROUND((a.conversions::numeric / a.activations::numeric) * 100.0, 1) ELSE 0.0 END
      ))
      FROM attribution_summary a
    ), '[]'::jsonb),
    'timeToValue', jsonb_build_object(
      'medianTimeToFirstValueHours', (SELECT median_ttv_hours FROM ttv_metrics),
      'averageTimeToFirstValueHours', (SELECT avg_ttv_hours FROM ttv_metrics),
      'medianTimeToConversionDays', (SELECT median_ttc_days FROM ttv_metrics),
      'averageTimeToConversionDays', (SELECT avg_ttc_days FROM ttv_metrics)
    ),
    'currentPersonaState', jsonb_build_object(
      'currentRegularTesters', (SELECT current_regular FROM persona_snapshot),
      'currentSpecialTesters', (SELECT current_special FROM persona_snapshot)
    ),
    'dataQuality', jsonb_build_object(
      'ambiguousAnonymousIds', (SELECT ambiguous_anon_count FROM anomaly_counts),
      'unanchoredSimulations', (SELECT unanchored_simulations FROM anomaly_counts),
      'unanchoredConversions', (SELECT unanchored_conversions FROM anomaly_counts),
      'futureTimestampEvents', (SELECT future_timestamp_events FROM anomaly_counts)
    )
  )
  INTO v_result
  FROM stage_counts sc;

  RETURN v_result;
END;
$$;

-- Comments
COMMENT ON FUNCTION public.get_sandbox_funnel_analytics IS
  'Phase 5B Server-Side Analytics: Aggregates Marketing Sandbox funnel progression, mature retention cohorts, attribution, and data quality metrics strictly for service_role.';

-- Revoke all permissions and grant strictly to service_role
REVOKE ALL ON FUNCTION public.get_sandbox_funnel_analytics(timestamptz, timestamptz, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sandbox_funnel_analytics(timestamptz, timestamptz, timestamptz, timestamptz) TO service_role;

