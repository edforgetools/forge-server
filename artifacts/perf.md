# Performance Configuration & Monitoring

This document outlines the performance characteristics and configurations for the Forge server across different deployment platforms.

## Deployment Platform Performance Settings

### Fly.io Configuration

**Resource Allocation:**

- **CPU:** 1 shared CPU
- **Memory:** 256 MB
- **Concurrency:** 25 hard limit, 20 soft limit (connections)
- **Auto-scaling:** Enabled (min: 0, auto-stop/start machines)

**Health Checks:**

- **TCP Check:** 15s interval, 2s timeout
- **HTTP Check:** 10s interval, 2s timeout, `/api/health` endpoint

### Vercel Configuration

**Function Limits:**

- **Max Duration:** 30 seconds
- **Environment:** Production Node.js
- **Build:** Includes `dist/**` and `src/**` files

### Render Configuration

**Resource Allocation:**

- **Plan:** Starter
- **Health Check:** `/api/health` endpoint
- **Storage:** 1GB disk mounted at `/opt/render/project/media`

## Performance Monitoring

### Logged Performance Events

Based on `events.ndjson`, the following performance metrics are tracked:

1. **API Response Times**

   ```json
   {
     "event": "api-request",
     "payload": {
       "method": "POST",
       "endpoint": "/api/captions",
       "duration": 1250,
       "status": 200
     }
   }
   ```

2. **Slow Response Detection**

   ```json
   {
     "event": "slow-response",
     "payload": {
       "endpoint": "/api/transcribe",
       "duration": 8500,
       "threshold": 5000
     }
   }
   ```

3. **File Upload Performance**

   ```json
   {
     "event": "file-upload",
     "payload": {
       "filename": "sample.mp3",
       "size": 5242880,
       "uploadDuration": 3200
     }
   }
   ```

4. **Processing Performance**
   ```json
   {
     "event": "caption-generated",
     "payload": {
       "processingTime": 2100
     }
   }
   ```

## Performance Thresholds

### Response Time Thresholds

- **Warning Threshold:** 5000ms (5 seconds)
- **Normal Processing:** < 2000ms
- **File Upload:** < 5000ms
- **Caption Generation:** < 3000ms

### Rate Limiting

- **API Endpoints:** 100 requests per minute per IP
- **Implementation:** In-memory sliding window (60s)
- **Scope:** All `/api/*` routes

## Performance Optimizations

### 1. Auto-scaling (Fly.io)

- **Min Machines:** 0 (cost optimization)
- **Auto-stop/start:** Reduces costs during low usage
- **Concurrency Limits:** Prevents resource exhaustion

### 2. Request Validation

- **Schema Validation:** Zod schemas for input validation
- **Content Type Validation:** Prevents processing invalid requests
- **Early Rejection:** Fast-fail for invalid requests

### 3. Error Handling

- **Structured Error Responses:** Consistent error format
- **Performance Context:** Errors include timing information
- **Graceful Degradation:** Non-critical failures don't crash the server

## Performance Bottlenecks

### Identified Bottlenecks

1. **Audio/Video Processing**

   - Transcription endpoint shows 8.5s response times
   - Large file processing (15MB+ files logged)
   - Recommendation: Consider async processing for large files

2. **File Upload**

   - 5MB+ files taking 3+ seconds to upload
   - Recommendation: Implement chunked uploads for large files

3. **Rate Limiting Storage**
   - In-memory storage resets on restart
   - Recommendation: Use Redis for persistent rate limiting in production

## Monitoring Recommendations

### Production Monitoring

1. **Response Time Tracking**

   - Monitor 95th percentile response times
   - Alert on responses > 10 seconds
   - Track endpoint-specific performance

2. **Resource Utilization**

   - Monitor CPU and memory usage
   - Track concurrent connection limits
   - Monitor disk space for file uploads

3. **Error Rate Monitoring**
   - Track error rates by endpoint
   - Monitor rate limit violations
   - Alert on error rate spikes

### Performance Testing

```bash
# Load testing example
for i in {1..50}; do
  curl -X POST http://localhost:8787/api/captions \
    -H "Content-Type: application/json" \
    -d '{"tone":"professional","platform":"twitter"}'
done

# Response time testing
time curl http://localhost:8787/api/health
```

## Performance Metrics Summary

| Metric                 | Current Threshold | Target  | Status                 |
| ---------------------- | ----------------- | ------- | ---------------------- |
| API Response Time      | 5000ms            | 2000ms  | ⚠️ Some endpoints > 5s |
| File Upload            | 5000ms            | 3000ms  | ⚠️ Large files > 5s    |
| Caption Generation     | 3000ms            | 2000ms  | ✅ Generally good      |
| Concurrent Connections | 25 (Fly.io)       | 50      | ✅ Adequate            |
| Rate Limit             | 100/min           | 100/min | ✅ Appropriate         |

## Next Steps

1. **Short Term (This Week):**

   - Monitor transcription endpoint performance
   - Implement async processing for large files
   - Add performance alerts

2. **Medium Term (Next Month):**

   - Implement Redis for rate limiting
   - Add performance monitoring dashboard
   - Optimize file upload handling

3. **Long Term (Ongoing):**
   - Regular performance testing
   - Capacity planning based on usage
   - Continuous optimization

---

_Last updated: $(date)_
_Performance data based on current deployment configurations and logged events._
