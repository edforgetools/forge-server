# Logging Contract

## Overview

The Forge server implements a standardized NDJSON (Newline Delimited JSON) logging contract for all client-side log events via the `/api/log` endpoint.

## NDJSON Schema

All log entries follow this standardized schema:

```json
{
  "ts": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "event": "user-action",
  "userAnonId": "anon_abc123",
  "payload": {
    "action": "click",
    "component": "Button",
    "additional": "data"
  }
}
```

### Field Descriptions

| Field        | Type   | Required | Description                                 |
| ------------ | ------ | -------- | ------------------------------------------- |
| `ts`         | string | Yes      | ISO 8601 timestamp (UTC)                    |
| `level`      | string | Yes      | Log level: `debug`, `info`, `warn`, `error` |
| `event`      | string | Yes      | Event name/type (max 100 chars)             |
| `userAnonId` | string | Yes      | Anonymous user identifier (max 100 chars)   |
| `payload`    | object | No       | Additional event data (defaults to `{}`)    |

### Validation Rules

- `ts`: Must be a valid ISO 8601 timestamp string
- `level`: Must be one of: `debug`, `info`, `warn`, `error`
- `event`: Maximum 100 characters
- `userAnonId`: Maximum 100 characters
- `payload`: Must be an object (can be empty `{}`)

## API Endpoint

### POST /api/log

**Request Body:**

```json
{
  "ts": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "event": "user-action",
  "userAnonId": "anon_abc123",
  "payload": {
    "action": "click",
    "component": "Button"
  }
}
```

**Response:**

```json
{
  "ok": true
}
```

**Error Response:**

```json
{
  "ok": false,
  "error": "Missing or invalid required field: ts (must be ISO timestamp string)"
}
```

## Client-Side Usage

### Basic Logging

```typescript
import { logEvent } from "./lib/logEvent";

// Direct logging with all fields
await logEvent("info", "user-action", "anon_abc123", {
  action: "click",
  component: "Button",
});
```

### Convenience Functions

```typescript
import { logError, logInfo, logWarning } from "./lib/logEvent";

// Error logging
await logError(new Error("Something went wrong"), "anon_abc123", {
  context: "data-processing",
});

// Info logging
await logInfo("User logged in", "anon_abc123", {
  userId: "123",
});

// Warning logging
await logWarning("Slow API response", "anon_abc123", {
  duration: 5000,
});
```

## Server-Side Output

The server outputs each log entry as a single NDJSON line to stdout:

```bash
{"ts":"2024-01-15T10:30:45.123Z","level":"info","event":"user-action","userAnonId":"anon_abc123","payload":{"action":"click","component":"Button"}}
{"ts":"2024-01-15T10:30:45.124Z","level":"error","event":"error","userAnonId":"anon_abc123","payload":{"message":"Something went wrong","stack":"Error: Something went wrong\n    at ..."}}
```

## Sample Data

See `artifacts/events.ndjson` for sample log entries that demonstrate the schema.

## Migration Notes

### Breaking Changes

The logging API has been updated from the previous format:

**Old Format:**

```json
{
  "name": "event-name",
  "meta": {
    "key": "value"
  }
}
```

**New Format:**

```json
{
  "ts": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "event": "event-name",
  "userAnonId": "anon_abc123",
  "payload": {
    "key": "value"
  }
}
```

### Migration Steps

1. Update client code to use new `logEvent` signature
2. Generate anonymous user IDs for tracking
3. Add appropriate log levels to events
4. Move metadata to `payload` field
5. Ensure timestamps are included

## Best Practices

1. **User Privacy**: Use anonymous user IDs (`anon_*` prefix recommended)
2. **Event Naming**: Use descriptive, consistent event names
3. **Log Levels**: Choose appropriate levels (`debug` for development, `info` for normal operations, `warn` for issues, `error` for failures)
4. **Payload Size**: Keep payload objects reasonable in size
5. **Timestamp Accuracy**: Always use UTC timestamps
6. **Error Handling**: Include stack traces in error payloads when available
