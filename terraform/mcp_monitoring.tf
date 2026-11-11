# ------------------------------------------------------------------------------
# MCP Analytics: Log-Based Metrics (24-month retention) & Dashboard (mcpspan-style)
# ------------------------------------------------------------------------------

resource "google_logging_metric" "mcp_server_operations_count" {
  name    = "mcp_server_operations_count"
  project = var.project
  filter  = <<-EOF
    resource.type="cloud_run_revision"
    resource.labels.service_name="report-api-${var.environment}"
    jsonPayload.event_name="mcp.server.operation"
  EOF

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "INT64"
    unit         = "1"
    display_name = "MCP Server Operations Count"

    labels {
      key         = "action_type"
      value_type  = "STRING"
      description = "MCP primitive type (tool, discovery, lifecycle, resource, prompt, protocol)"
    }
    labels {
      key         = "tool"
      value_type  = "STRING"
      description = "MCP tool name for tools/call requests"
    }
    labels {
      key         = "status"
      value_type  = "STRING"
      description = "Outcome status (success, missing_tool, refused_argument, error_result, error_thrown, unsupported_method, protocol_error)"
    }
    labels {
      key         = "empty_result"
      value_type  = "STRING"
      description = "Whether a successful tool call returned zero records"
    }
    labels {
      key         = "client_name"
      value_type  = "STRING"
      description = "Normalized MCP client identifier"
    }
  }

  label_extractors = {
    "action_type"  = "EXTRACT(jsonPayload.action_type)"
    "tool"         = "EXTRACT(jsonPayload.tool)"
    "status"       = "EXTRACT(jsonPayload.status)"
    "empty_result" = "EXTRACT(jsonPayload.empty_result)"
    "client_name"  = "EXTRACT(jsonPayload.client_name)"
  }
}

resource "google_logging_metric" "mcp_server_operation_duration_ms" {
  name            = "mcp_server_operation_duration_ms"
  project         = var.project
  value_extractor = "EXTRACT(jsonPayload.duration_ms)"
  filter          = <<-EOF
    resource.type="cloud_run_revision"
    resource.labels.service_name="report-api-${var.environment}"
    jsonPayload.event_name="mcp.server.operation"
    jsonPayload.duration_ms >= 0
  EOF

  metric_descriptor {
    metric_kind  = "DELTA"
    value_type   = "DISTRIBUTION"
    unit         = "ms"
    display_name = "MCP Server Operation Duration (ms)"

    labels {
      key         = "action_type"
      value_type  = "STRING"
      description = "MCP primitive type"
    }
    labels {
      key         = "tool"
      value_type  = "STRING"
      description = "MCP tool name"
    }
    labels {
      key         = "status"
      value_type  = "STRING"
      description = "Outcome status"
    }
  }

  bucket_options {
    exponential_buckets {
      num_finite_buckets = 64
      growth_factor      = 1.25
      scale              = 1.0
    }
  }

  label_extractors = {
    "action_type" = "EXTRACT(jsonPayload.action_type)"
    "tool"        = "EXTRACT(jsonPayload.tool)"
    "status"      = "EXTRACT(jsonPayload.status)"
  }
}

locals {
  mcp_logs_table   = "`${var.project}.global._Default._Default`"
  mcp_service_name = "report-api-${var.environment}"

  # Shared CTE normalizing structured mcp.server.operation events alongside legacy "MCP Tool Call:" logs
  mcp_base_cte = <<-SQL
    WITH mcp_events AS (
      SELECT
        insert_id,
        timestamp,
        COALESCE(
          JSON_VALUE(json_payload, '$.action_type'),
          IF(STARTS_WITH(JSON_VALUE(json_payload, '$.message'), 'MCP Tool Call:'), 'tool', 'protocol')
        ) AS action_type,
        COALESCE(
          JSON_VALUE(json_payload, '$.mcp_method'),
          IF(JSON_VALUE(json_payload, '$.tool') IS NOT NULL, 'tools/call', 'unknown')
        ) AS mcp_method,
        JSON_VALUE(json_payload, '$.tool') AS tool,
        COALESCE(JSON_VALUE(json_payload, '$.status'), 'success') AS status,
        COALESCE(SAFE_CAST(JSON_VALUE(json_payload, '$.empty_result') AS BOOL), FALSE) AS empty_result,
        SAFE_CAST(JSON_VALUE(json_payload, '$.result_count') AS INT64) AS result_count,
        SAFE_CAST(JSON_VALUE(json_payload, '$.duration_ms') AS FLOAT64) AS duration_ms,
        SAFE_CAST(JSON_VALUE(json_payload, '$.response_size_bytes') AS INT64) AS response_size_bytes,
        COALESCE(
          JSON_VALUE(json_payload, '$.session_id'),
          JSON_VALUE(json_payload, '$.conversation_id'),
          CONCAT('legacy_', SUBSTR(TO_HEX(SHA256(COALESCE(JSON_VALUE(json_payload, '$.user_agent'), 'unknown'))), 1, 12))
        ) AS session_id,
        COALESCE(JSON_VALUE(json_payload, '$.session_source'), 'legacy') AS session_source,
        COALESCE(
          JSON_VALUE(json_payload, '$.client_name'),
          LOWER(REGEXP_EXTRACT(JSON_VALUE(json_payload, '$.user_agent'), r'^([A-Za-z0-9._-]+)')),
          'unknown'
        ) AS client_name,
        COALESCE(
          JSON_VALUE(json_payload, '$.client_version'),
          REGEXP_EXTRACT(JSON_VALUE(json_payload, '$.user_agent'), r'^[A-Za-z0-9._-]+/([^\s(]+)')) AS client_version,
        JSON_VALUE(json_payload, '$.protocol_version') AS protocol_version,
        COALESCE(
          JSON_VALUE(json_payload, '$.server_revision'),
          STRING(resource.labels.revision_name)
        ) AS server_revision,
        JSON_VALUE(json_payload, '$.caption') AS caption,
        JSON_VALUE(json_payload, '$.args_hash') AS args_hash,
        TO_JSON_STRING(json_payload.arguments) AS arguments_json,
        JSON_VALUE(json_payload, '$.arguments.technology') AS arg_technology,
        JSON_VALUE(json_payload, '$.arguments.geo') AS arg_geo,
        JSON_VALUE(json_payload, '$.suggested_tool') AS suggested_tool,
        JSON_VALUE(json_payload, '$.error_type') AS error_type,
        JSON_VALUE(json_payload, '$.error_message') AS error_message
      FROM ${local.mcp_logs_table}
      WHERE
        resource.type = 'cloud_run_revision'
        AND STRING(resource.labels.service_name) = '${local.mcp_service_name}'
        AND (
          JSON_VALUE(json_payload, '$.event_name') = 'mcp.server.operation'
          OR STARTS_WITH(JSON_VALUE(json_payload, '$.message'), 'MCP Tool Call:')
        )
    )
  SQL
}

resource "google_monitoring_dashboard" "mcp_analytics" {
  project = var.project

  dashboard_json = jsonencode({
    displayName = "MCP Analytics (Tech Report)"
    mosaicLayout = {
      columns = 48
      tiles = [
        # ----------------------------------------------------------------------
        # Row 0: Header & Taxonomy Guide
        # ----------------------------------------------------------------------
        {
          xPos   = 0
          yPos   = 0
          width  = 48
          height = 5
          widget = {
            title = "HTTP Archive Tech Report MCP Analytics (mcpspan-style)"
            text = {
              format  = "MARKDOWN"
              content = "**Endpoint:** `https://cdn.httparchive.org/mcp` (`${local.mcp_service_name}`) | **Log View:** `${var.project}.global._Default._Default` (`event_name = \"mcp.server.operation\"`)\n\n**Statuses:** `success` · `missing_tool` *(hallucinated tool + nearest suggestion)* · `refused_argument` *(Zod / 400 validation)* · `error_result` · `error_thrown` *(5xx)* · `unsupported_method` | **Sessions:** `conversation_id` -> `mcp-session-id` -> privacy-safe `fp_<hash>`"
              style = {
                backgroundColor     = "#FFFFFF"
                fontSize            = "FS_SMALL"
                horizontalAlignment = "H_LEFT"
                padding             = "P_EXTRA_SMALL"
                textColor           = "#212121"
                verticalAlignment   = "V_TOP"
              }
            }
          }
        },

        # ----------------------------------------------------------------------
        # Row 1: Executive Overview KPIs
        # ----------------------------------------------------------------------
        {
          xPos   = 0
          yPos   = 5
          width  = 48
          height = 8
          widget = {
            title = "Overview KPIs (Selected Time Window)"
            timeSeriesTable = {
              metricVisualization = "NUMBER"
              dataSets = [
                {
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte}
                        SELECT
                          COUNTIF(action_type = 'tool') AS tool_calls,
                          COUNTIF(action_type IN ('lifecycle', 'discovery')) AS handshakes_and_lists,
                          COUNT(DISTINCT session_id) AS unique_sessions,
                          COUNT(DISTINCT client_name) AS unique_clients,
                          ROUND(SAFE_DIVIDE(COUNTIF(action_type = 'tool' AND status = 'success'), COUNTIF(action_type = 'tool')) * 100, 2) AS tool_success_pct,
                          ROUND(SAFE_DIVIDE(COUNTIF(action_type = 'tool' AND status = 'success' AND empty_result), COUNTIF(action_type = 'tool' AND status = 'success')) * 100, 2) AS empty_result_pct,
                          ROUND(APPROX_QUANTILES(IF(action_type = 'tool', duration_ms, NULL) IGNORE NULLS, 100)[SAFE_OFFSET(50)], 1) AS p50_latency_ms,
                          ROUND(APPROX_QUANTILES(IF(action_type = 'tool', duration_ms, NULL) IGNORE NULLS, 100)[SAFE_OFFSET(95)], 1) AS p95_latency_ms,
                          ROUND(APPROX_QUANTILES(IF(action_type = 'tool', response_size_bytes, NULL) IGNORE NULLS, 100)[SAFE_OFFSET(50)] / 1024, 2) AS median_response_kib
                        FROM mcp_events
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },

        # ----------------------------------------------------------------------
        # Row 2: Traffic Outcomes & Release Version Latency
        # ----------------------------------------------------------------------
        {
          xPos   = 0
          yPos   = 13
          width  = 24
          height = 16
          widget = {
            title = "MCP Tool Calls Over Time by Status"
            xyChart = {
              chartOptions = { mode = "COLOR" }
              yAxis        = { scale = "LINEAR" }
              dataSets = [
                {
                  plotType   = "STACKED_BAR"
                  targetAxis = "Y1"
                  breakdowns = [
                    {
                      column              = "status"
                      aggregationFunction = { type = "count" }
                      limit               = 10
                      sortOrder           = "SORT_ORDER_DESCENDING"
                    }
                  ]
                  dimensions = [
                    {
                      column      = "timestamp"
                      columnType  = "TIMESTAMP"
                      sortColumn  = "timestamp"
                      sortOrder   = "SORT_ORDER_ASCENDING"
                      timeBinSize = "0s"
                    }
                  ]
                  measures = [
                    {
                      column              = "insert_id"
                      aggregationFunction = { type = "count-distinct" }
                    }
                  ]
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte}
                        SELECT
                          timestamp,
                          status,
                          insert_id
                        FROM mcp_events
                        WHERE action_type = 'tool'
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },
        {
          xPos   = 24
          yPos   = 13
          width  = 24
          height = 16
          widget = {
            title = "Tool Latency (ms) Over Time by Cloud Run Revision (Release Tracking)"
            xyChart = {
              chartOptions = { mode = "COLOR" }
              yAxis        = { scale = "LINEAR" }
              dataSets = [
                {
                  plotType   = "LINE"
                  targetAxis = "Y1"
                  breakdowns = [
                    {
                      column              = "server_revision"
                      aggregationFunction = { type = "average" }
                      limit               = 10
                      sortOrder           = "SORT_ORDER_DESCENDING"
                    }
                  ]
                  dimensions = [
                    {
                      column      = "timestamp"
                      columnType  = "TIMESTAMP"
                      sortColumn  = "timestamp"
                      sortOrder   = "SORT_ORDER_ASCENDING"
                      timeBinSize = "0s"
                    }
                  ]
                  measures = [
                    {
                      column              = "duration_ms"
                      aggregationFunction = { type = "average" }
                    }
                  ]
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte}
                        SELECT
                          timestamp,
                          server_revision,
                          duration_ms
                        FROM mcp_events
                        WHERE
                          action_type = 'tool'
                          AND duration_ms IS NOT NULL
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },

        # ----------------------------------------------------------------------
        # Row 3: Tools Inventory (incl. Zero-Call Unused Tools) & Context Size
        # ----------------------------------------------------------------------
        {
          xPos   = 0
          yPos   = 29
          width  = 30
          height = 18
          widget = {
            title = "All Registered Tools: Usage, Zero-Call Detection, Latency & Context Footprint"
            timeSeriesTable = {
              metricVisualization = "NUMBER"
              dataSets = [
                {
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte},
                        registered_tools AS (
                          SELECT tool
                          FROM UNNEST([
                            'search_technologies',
                            'list_categories',
                            'get_adoption_metrics',
                            'get_cwv_metrics',
                            'get_lighthouse_metrics',
                            'get_page_weight_metrics',
                            'get_audits_metrics',
                            'get_geo_breakdown',
                            'get_cwv_distribution',
                            'list_ranks',
                            'list_geos',
                            'list_versions'
                          ]) AS tool
                        ),
                        tool_stats AS (
                          SELECT
                            tool,
                            COUNT(*) AS calls,
                            ROUND(SAFE_DIVIDE(COUNTIF(status = 'success'), COUNT(*)) * 100, 1) AS success_pct,
                            ROUND(SAFE_DIVIDE(COUNTIF(status = 'success' AND empty_result), NULLIF(COUNTIF(status = 'success'), 0)) * 100, 1) AS empty_pct,
                            COUNTIF(status != 'success') AS errors,
                            ROUND(APPROX_QUANTILES(duration_ms IGNORE NULLS, 100)[SAFE_OFFSET(50)], 1) AS p50_ms,
                            ROUND(APPROX_QUANTILES(duration_ms IGNORE NULLS, 100)[SAFE_OFFSET(95)], 1) AS p95_ms,
                            ROUND(APPROX_QUANTILES(response_size_bytes IGNORE NULLS, 100)[SAFE_OFFSET(50)] / 1024, 2) AS median_kib,
                            ROUND(MAX(response_size_bytes) / 1024, 2) AS max_kib
                          FROM mcp_events
                          WHERE action_type = 'tool' AND tool IS NOT NULL
                          GROUP BY tool
                        )
                        SELECT
                          r.tool,
                          COALESCE(s.calls, 0) AS calls,
                          COALESCE(s.success_pct, 0.0) AS success_pct,
                          COALESCE(s.empty_pct, 0.0) AS empty_pct,
                          COALESCE(s.errors, 0) AS errors,
                          s.p50_ms,
                          s.p95_ms,
                          s.median_kib,
                          s.max_kib
                        FROM registered_tools AS r
                        LEFT JOIN tool_stats AS s USING (tool)
                        ORDER BY calls DESC, r.tool ASC
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },
        {
          xPos   = 30
          yPos   = 29
          width  = 18
          height = 18
          widget = {
            title = "Tool Call Volume Over Time by Tool"
            xyChart = {
              chartOptions = { mode = "COLOR" }
              yAxis        = { scale = "LINEAR" }
              dataSets = [
                {
                  plotType   = "STACKED_BAR"
                  targetAxis = "Y1"
                  breakdowns = [
                    {
                      column              = "tool"
                      aggregationFunction = { type = "count" }
                      limit               = 15
                      sortOrder           = "SORT_ORDER_DESCENDING"
                    }
                  ]
                  dimensions = [
                    {
                      column      = "timestamp"
                      columnType  = "TIMESTAMP"
                      sortColumn  = "timestamp"
                      sortOrder   = "SORT_ORDER_ASCENDING"
                      timeBinSize = "0s"
                    }
                  ]
                  measures = [
                    {
                      column              = "insert_id"
                      aggregationFunction = { type = "count-distinct" }
                    }
                  ]
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte}
                        SELECT
                          timestamp,
                          COALESCE(tool, 'unknown') AS tool,
                          insert_id
                        FROM mcp_events
                        WHERE action_type = 'tool'
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },

        # ----------------------------------------------------------------------
        # Row 4: Errors, Refused Arguments & "Missing Tools" Inspector
        # ----------------------------------------------------------------------
        {
          xPos   = 0
          yPos   = 47
          width  = 24
          height = 16
          widget = {
            title = "Missing / Hallucinated Tools & Suggested Nearest Match"
            timeSeriesTable = {
              metricVisualization = "NUMBER"
              dataSets = [
                {
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte}
                        SELECT
                          COALESCE(tool, '<empty>') AS requested_tool,
                          COALESCE(suggested_tool, '—') AS suggested_tool,
                          client_name,
                          COUNT(*) AS attempts,
                          COUNT(DISTINCT session_id) AS sessions
                        FROM mcp_events
                        WHERE status = 'missing_tool'
                        GROUP BY requested_tool, suggested_tool, client_name
                        ORDER BY attempts DESC
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },
        {
          xPos   = 24
          yPos   = 47
          width  = 24
          height = 16
          widget = {
            title = "Failure Diagnostics (Refused Args, Thrown & Unsupported Methods)"
            timeSeriesTable = {
              metricVisualization = "NUMBER"
              dataSets = [
                {
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte}
                        SELECT
                          status,
                          COALESCE(tool, mcp_method) AS target,
                          COALESCE(error_type, '—') AS error_type,
                          COALESCE(SUBSTR(error_message, 1, 140), '—') AS error_message,
                          COUNT(*) AS occurrences,
                          COUNT(DISTINCT session_id) AS affected_sessions
                        FROM mcp_events
                        WHERE status != 'success'
                        GROUP BY status, target, error_type, error_message
                        ORDER BY occurrences DESC
                        LIMIT 50
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },

        # ----------------------------------------------------------------------
        # Row 5: Clients Breakdown & Top Queried Technologies / Geos
        # ----------------------------------------------------------------------
        {
          xPos   = 0
          yPos   = 63
          width  = 24
          height = 16
          widget = {
            title = "Active MCP Clients & Versions Leaderboard"
            timeSeriesTable = {
              metricVisualization = "NUMBER"
              dataSets = [
                {
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte}
                        SELECT
                          client_name,
                          COALESCE(client_version, '—') AS client_version,
                          COALESCE(protocol_version, '—') AS mcp_protocol,
                          COUNT(DISTINCT session_id) AS sessions,
                          COUNTIF(action_type = 'tool') AS tool_calls,
                          ROUND(SAFE_DIVIDE(COUNTIF(action_type = 'tool' AND status = 'success'), NULLIF(COUNTIF(action_type = 'tool'), 0)) * 100, 1) AS success_pct,
                          ROUND(APPROX_QUANTILES(IF(action_type = 'tool', duration_ms, NULL) IGNORE NULLS, 100)[SAFE_OFFSET(50)], 1) AS p50_ms
                        FROM mcp_events
                        GROUP BY client_name, client_version, mcp_protocol
                        ORDER BY tool_calls DESC, sessions DESC
                        LIMIT 50
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },
        {
          xPos   = 24
          yPos   = 63
          width  = 24
          height = 16
          widget = {
            title = "Top Queried Technologies & Geographies (via Args)"
            timeSeriesTable = {
              metricVisualization = "NUMBER"
              dataSets = [
                {
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte},
                        exploded_techs AS (
                          SELECT
                            TRIM(tech) AS technology,
                            COALESCE(NULLIF(TRIM(arg_geo), ''), 'ALL') AS geo,
                            session_id,
                            empty_result
                          FROM mcp_events,
                          UNNEST(SPLIT(arg_technology, ',')) AS tech
                          WHERE
                            action_type = 'tool'
                            AND arg_technology IS NOT NULL
                            AND TRIM(tech) != ''
                        )
                        SELECT
                          technology,
                          geo,
                          COUNT(*) AS queries,
                          COUNT(DISTINCT session_id) AS unique_sessions,
                          COUNTIF(empty_result) AS empty_results
                        FROM exploded_techs
                        GROUP BY technology, geo
                        ORDER BY queries DESC
                        LIMIT 50
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },

        # ----------------------------------------------------------------------
        # Row 6: Sessions, Step-by-Step Journeys & Agent Loop Detector
        # ----------------------------------------------------------------------
        {
          xPos   = 0
          yPos   = 79
          width  = 22
          height = 18
          widget = {
            title = "Agent Loop & Retry Detector (Repeated Tool + Args in Session)"
            timeSeriesTable = {
              metricVisualization = "NUMBER"
              dataSets = [
                {
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte}
                        SELECT
                          session_id,
                          client_name,
                          tool,
                          COUNT(*) AS repeat_calls,
                          COUNTIF(empty_result) AS empty_hits,
                          COUNTIF(status != 'success') AS error_hits,
                          ANY_VALUE(SUBSTR(COALESCE(arguments_json, ''), 1, 120)) AS sample_args
                        FROM mcp_events
                        WHERE
                          action_type = 'tool'
                          AND tool IS NOT NULL
                          AND args_hash IS NOT NULL
                        GROUP BY session_id, client_name, tool, args_hash
                        HAVING COUNT(*) >= 2
                        ORDER BY repeat_calls DESC
                        LIMIT 50
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },
        {
          xPos   = 22
          yPos   = 79
          width  = 26
          height = 18
          widget = {
            title = "Recent Multi-Step Agent Sessions"
            timeSeriesTable = {
              metricVisualization = "NUMBER"
              dataSets = [
                {
                  timeSeriesQuery = {
                    opsAnalyticsQuery = {
                      sql = <<-SQL
                        ${local.mcp_base_cte},
                        session_rollup AS (
                          SELECT
                            session_id,
                            ANY_VALUE(client_name) AS client_name,
                            ANY_VALUE(session_source) AS session_source,
                            MAX(timestamp) AS last_seen,
                            COUNTIF(action_type = 'tool') AS tool_steps,
                            STRING_AGG(tool, ' -> ' ORDER BY timestamp ASC LIMIT 8) AS tool_journey,
                            COUNTIF(status != 'success') AS errors,
                            ROUND(SUM(COALESCE(duration_ms, 0)), 1) AS total_tool_ms,
                            ARRAY_AGG(caption IGNORE NULLS ORDER BY timestamp ASC LIMIT 1)[SAFE_OFFSET(0)] AS initial_intent
                          FROM mcp_events
                          GROUP BY session_id
                        )
                        SELECT
                          session_id,
                          client_name,
                          session_source,
                          tool_steps,
                          COALESCE(tool_journey, '(handshake only)') AS tool_journey,
                          errors,
                          total_tool_ms,
                          COALESCE(SUBSTR(initial_intent, 1, 120), '—') AS initial_intent
                        FROM session_rollup
                        ORDER BY last_seen DESC
                        LIMIT 50
                      SQL
                    }
                  }
                }
              ]
            }
          }
        },

        # ----------------------------------------------------------------------
        # Row 7: Live MCP Server Operation & Agent Intent Logs Panel
        # ----------------------------------------------------------------------
        {
          xPos   = 0
          yPos   = 97
          width  = 48
          height = 18
          widget = {
            title = "Live MCP Server Operations & Agent Intents"
            logsPanel = {
              filter        = "resource.type=\"cloud_run_revision\"\nresource.labels.service_name=\"${local.mcp_service_name}\"\n(jsonPayload.event_name=\"mcp.server.operation\" OR jsonPayload.message=~\"^MCP Tool Call:\")"
              resourceNames = ["projects/${var.project}/locations/global/logScopes/_Default"]
            }
          }
        }
      ]
    }
  })
}
