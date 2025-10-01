# Artifacts Documentation

This directory contains essential operational artifacts for the Forge server, including logging, security, audit, and performance documentation.

## 📁 File Overview

| File            | Purpose                                      | Status      |
| --------------- | -------------------------------------------- | ----------- |
| `events.ndjson` | Structured application logs in NDJSON format | ✅ Active   |
| `security.md`   | Security configuration and measures          | ✅ Current  |
| `audit.md`      | Dependency security audit results            | ✅ Complete |
| `perf.md`       | Performance configuration and monitoring     | ✅ Current  |
| `README.md`     | This overview document                       | ✅ Current  |

## 📊 Log Format (events.ndjson)

The application uses **NDJSON (Newline Delimited JSON)** format for structured logging. Each line is a complete JSON object representing a single event.

### Log Entry Structure

```json
{
  "ts": "2024-01-15T10:30:45.123Z",
  "level": "info|debug|warn|error",
  "event": "event-type",
  "userAnonId": "anon_abc123",
  "payload": {
    "key": "value",
    "metrics": "data"
  }
}
```

### Event Types Tracked

- **User Actions:** `user-action`, `user-login`
- **API Requests:** `api-request`, `slow-response`
- **File Operations:** `file-upload`, `export-completed`
- **Processing:** `caption-generated`
- **System:** `error`, `rate-limit-approaching`

### Log Levels

- **`debug`:** Detailed diagnostic information
- **`info`:** General application flow and user actions
- **`warn`:** Warning conditions (slow responses, rate limits)
- **`error`:** Error conditions with stack traces

## 🔒 Security Stance

### Current Security Measures

1. **CORS Configuration**

   - Restricted to `http://localhost:5173` for development
   - Prevents unauthorized cross-origin requests
   - Mitigates CSRF and unauthorized data access

2. **Rate Limiting**

   - 100 requests per minute per IP address
   - Applied to all `/api/*` endpoints
   - In-memory sliding window implementation
   - Graceful error responses with retry information

3. **Input Validation**
   - Zod schema validation for all API endpoints
   - Content-type validation for file uploads
   - Structured error handling with sanitized responses

### Security Posture

- **Risk Level:** Low to Medium
- **Primary Threats Mitigated:** CSRF, DoS, unauthorized access
- **Areas for Improvement:** Persistent rate limiting, production CORS configuration

## 🔍 Audit Results

### Dependency Security Status: ✅ SECURE

All production dependencies have been audited and are current with no critical vulnerabilities:

| Package  | Version | Status  | Risk Level |
| -------- | ------- | ------- | ---------- |
| archiver | ^7.0.1  | Current | Low        |
| cors     | ^2.8.5  | Current | Low        |
| dotenv   | ^16.4.5 | Current | Low        |
| express  | ^4.21.2 | Current | Low        |
| multer   | ^2.0.2  | Current | Low        |
| zod      | ^3.22.4 | Current | Low        |

### Critical Actions Completed

- ✅ **Express Downgrade:** Successfully downgraded from Express 5.1.0 (beta) to 4.21.2 (stable)
- ✅ **TypeScript Types:** Updated @types/express to match Express 4.x
- ✅ **No Critical Vulnerabilities:** All dependencies are secure

## ⚡ Performance Profile

### Current Performance Characteristics

- **API Response Times:** Generally < 2s, some endpoints > 5s
- **Concurrency Limits:** 25 connections (Fly.io), 100 req/min rate limit
- **Resource Allocation:** 256MB RAM, 1 shared CPU (Fly.io)
- **Auto-scaling:** Enabled with 0 minimum machines

### Performance Monitoring

- **Response Time Tracking:** Automated logging of slow responses (>5s)
- **File Upload Monitoring:** Track upload duration and file sizes
- **Processing Metrics:** Caption generation timing logged
- **Rate Limit Tracking:** Monitor approaching limits

### Identified Bottlenecks

1. **Transcription Endpoint:** 8.5s response times for large files
2. **File Upload:** 5MB+ files taking 3+ seconds
3. **Rate Limiting Storage:** In-memory (resets on restart)

## 🚀 Deployment Configurations

### Multi-Platform Support

The server is configured for deployment on multiple platforms:

- **Fly.io:** Production-ready with auto-scaling and health checks
- **Vercel:** Serverless with 30s function timeout
- **Render:** Traditional hosting with persistent storage

### Health Monitoring

All deployments include health check endpoints at `/api/health` with:

- 10-15 second check intervals
- 2 second timeout thresholds
- JSON response format

## 📈 Monitoring & Alerting

### Automated Logging

- **Structured Events:** All significant operations logged
- **Performance Metrics:** Response times and processing durations
- **Error Tracking:** Full stack traces for debugging
- **User Activity:** Anonymous user action tracking

### Recommended Monitoring

1. **Response Time Alerts:** Alert on responses > 10 seconds
2. **Error Rate Monitoring:** Track error rates by endpoint
3. **Resource Utilization:** Monitor CPU/memory usage
4. **Rate Limit Violations:** Track rate limit hits

## 🔄 Maintenance Schedule

### Regular Tasks

- **Weekly:** Review performance logs and error rates
- **Monthly:** Run dependency security audits
- **Quarterly:** Performance testing and capacity planning

### Update Procedures

1. **Dependencies:** Regular updates with security audit
2. **Configuration:** Review and update security settings
3. **Monitoring:** Adjust thresholds based on usage patterns

## 📞 Support Information

### Log Analysis

To analyze logs:

```bash
# View recent errors
cat artifacts/events.ndjson | jq 'select(.level=="error")'

# Performance analysis
cat artifacts/events.ndjson | jq 'select(.event=="slow-response")'

# User activity
cat artifacts/events.ndjson | jq 'select(.event=="user-action")'
```

### Health Checks

```bash
# Local development
curl http://localhost:8787/api/health

# Production (replace with actual URL)
curl https://your-app.onrender.com/api/health
```

---

**Last Updated:** $(date)
**Next Review:** 30 days
**Maintained By:** Development Team
