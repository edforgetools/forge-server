# Security Configuration

This document outlines the security measures implemented in the Forge server for local development.

## CORS Configuration

### Settings

- **Allowed Origin:** `http://localhost:5173`
- **Credentials:** Enabled
- **Implementation:** Express CORS middleware with restricted origin

### Rationale

Restricting CORS to `http://localhost:5173` ensures that only the trusted frontend application can access the API endpoints. This prevents unauthorized cross-origin requests from other domains, which could lead to:

- Cross-Site Request Forgery (CSRF) attacks
- Unauthorized data access
- Potential security vulnerabilities

The specific origin restriction is appropriate for local development where the frontend typically runs on port 5173 (Vite default).

## Rate Limiting

### Settings

- **Endpoints Affected:** All `/api/*` routes
- **Limit:** 100 requests per minute per client IP
- **Window:** 60 seconds (sliding window)
- **Storage:** In-memory Map (resets on server restart)
- **Implementation:** Custom middleware using client IP for identification

### Rate Limit Response

When the rate limit is exceeded, the server returns:

```json
{
  "ok": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 60
}
```

### Rationale

Rate limiting on API endpoints provides several security benefits:

- **DoS Protection:** Prevents denial-of-service attacks by limiting request frequency
- **Resource Protection:** Ensures fair usage of server resources
- **Abuse Prevention:** Mitigates automated attacks and scraping attempts
- **Performance:** Helps maintain server responsiveness under load

The 100 requests per minute limit is generous enough for normal development usage while providing protection against abuse.

## Implementation Details

### Rate Limiting Algorithm

The implementation uses a simple sliding window approach:

1. Track requests per client IP address
2. Reset counters after 60 seconds
3. Block requests when limit is exceeded
4. Return appropriate error response with retry information

### Security Considerations

- **IP-based tracking:** Uses client IP for rate limiting (note: may not work correctly behind proxies)
- **In-memory storage:** Rate limit data is lost on server restart
- **No persistent storage:** Suitable for development, but production should use Redis or similar

## Production Considerations

For production deployment, consider:

1. **CORS Origins:** Update to include production frontend domains
2. **Rate Limiting Storage:** Use Redis or database for persistent rate limiting
3. **Proxy Support:** Configure trusted proxies for accurate IP detection
4. **Monitoring:** Add logging and monitoring for rate limit violations
5. **Dynamic Limits:** Implement user-based or tier-based rate limiting

## Testing

To verify security configurations:

1. **CORS Testing:**

   ```bash
   # Should succeed from localhost:5173
   curl -H "Origin: http://localhost:5173" http://localhost:8787/api/health

   # Should fail from other origins
   curl -H "Origin: http://localhost:3000" http://localhost:8787/api/health
   ```

2. **Rate Limiting Testing:**
   ```bash
   # Make 101 requests quickly to test rate limiting
   for i in {1..101}; do curl http://localhost:8787/api/health; done
   ```

## Configuration Location

- **CORS:** `index.ts` lines 58-62
- **Rate Limiting:** `index.ts` lines 23-52, 67
- **Documentation:** This file (`artifacts/security.md`)

---

_Last updated: $(date)_
_Configuration matches code implementation as of current deployment._
