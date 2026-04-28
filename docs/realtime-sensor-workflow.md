# Realtime Sensor Workflow (Backend First)

## Scope

This document defines the backend contract used by the feedback panel frontend for realtime footfall, temperature,
and humidity updates sourced from `sensor_logs`.

## 1) Data Routing Model

- `sensor_logs` receives parsed records from sensor parser/ingestion workers.
- Backend validates each `sensor_id` against `panel_sensor_map`.
- Backend emits panel-specific events so each panel only receives mapped sensor data.

Suggested mapping table:

```sql
CREATE TABLE panel_sensor_map (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    feedback_panel_id BIGINT NOT NULL,
    sensor_id BIGINT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    UNIQUE KEY uq_panel_sensor (feedback_panel_id, sensor_id)
);
```

## 2) Realtime Stream Contract

Endpoint:

- `GET /api/panels/{panelId}/stream`

Auth requirements:

- Panel must authenticate (session or bearer token issued after gate auth).
- Token/session claim must include panel identity.
- Server must deny stream access when `panelId` in path does not match authenticated panel claim.

SSE event type:

- `event: sensor.metrics`

SSE payload:

```json
{
  "panel_id": 12,
  "footfall_today": 164,
  "temperature_c": 26.7,
  "humidity_pct": 71.2,
  "sensor_timestamp": "2026-04-23T09:20:11Z",
  "received_at": "2026-04-23T09:20:13Z"
}
```

SSE operational behavior:

- Emit heartbeat comments every 15-30 seconds.
- Include `id: <event_id>` for resumable streams (`Last-Event-ID`).
- On reconnect, replay latest event for panel before resuming live tail.

## 3) Snapshot Fallback Contract

Endpoint:

- `GET /api/panels/{panelId}/latest-metrics`

Response body shape matches SSE payload. This endpoint is used when SSE repeatedly fails.

## 4) Validation and Fault Tolerance

- Reject malformed metrics (`non-numeric`, missing required panel routing context).
- Clamp/validate unreasonable ranges at ingestion layer (for example humidity 0-100).
- Log rejected payloads with sensor identifier and reason.
- Keep last good snapshot per panel to serve fallback requests fast.

## 5) Observability

Track and alert on:

- Active SSE connections per panel/site
- Event delivery lag (`sensor_logs.created_at` to stream send time)
- Stream disconnect rate
- Snapshot fallback usage ratio
- Panels with stale data beyond threshold (for example > 2 minutes)

## 6) Rollout

1. Enable on a single canary panel/location.
2. Verify stream stability and median lag.
3. Compare panel values with `sensor_logs` for data correctness.
4. Expand by feature flag to remaining mapped panels.
