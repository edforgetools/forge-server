# QA Checklist - Forge Server

## Pre-Release Checklist

### Server API Endpoints

#### ✅ Health Check
- [ ] `GET /api/health` returns `{ ok: true, mock: true, serverTime: "..." }`
- [ ] Response includes proper timestamp format
- [ ] No errors in server logs

#### ✅ Caption Generation
- [ ] `POST /api/captions` returns `{ ok: true, captions: {...} }` on valid input
- [ ] Returns `{ ok: false, error: "..." }` on missing transcript
- [ ] Returns `{ ok: false, error: "..." }` on invalid content type
- [ ] Returns `{ ok: false, error: "..." }` on invalid tone
- [ ] Returns `{ ok: false, error: "..." }` on invalid maxLen
- [ ] All captions include "MOCK:" watermark
- [ ] Response includes tweet, instagram, and youtube captions

#### ✅ Logging Endpoint
- [ ] `POST /api/log` returns `{ ok: true }` on valid input
- [ ] Returns `{ ok: false, error: "..." }` on missing name
- [ ] Returns `{ ok: false, error: "..." }` on invalid name type
- [ ] Returns `{ ok: false, error: "..." }` on name too long
- [ ] Returns `{ ok: false, error: "..." }` on invalid meta type
- [ ] Logs are properly formatted with timestamps

#### ✅ Export ZIP
- [ ] `POST /api/exportZip` returns ZIP file on valid input
- [ ] Returns `{ ok: false, error: "..." }` on missing content
- [ ] Returns `{ ok: false, error: "..." }` on invalid content type
- [ ] Returns `{ ok: false, error: "..." }` on invalid data types
- [ ] ZIP contains correct files (transcript.txt, tweet.txt, etc.)
- [ ] Proper Content-Type and Content-Disposition headers

#### ✅ Error Handling
- [ ] 404 API routes return `{ ok: false, error: "..." }`
- [ ] Malformed JSON returns `{ ok: false, error: "..." }`
- [ ] All error responses follow consistent format
- [ ] Error messages are descriptive and helpful

### Integration Tests
- [ ] All tests pass (`npm test`)
- [ ] Test coverage is adequate
- [ ] Tests cover both success and error cases
- [ ] Tests verify response format consistency

### Build & Deployment
- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Build artifacts are generated correctly
- [ ] Environment variables are properly configured

### Performance & Security
- [ ] File upload limits are enforced (200MB)
- [ ] CORS is properly configured
- [ ] Input validation prevents malicious data
- [ ] Memory usage is reasonable for file processing

## Post-Deployment Verification

### Health Check
```bash
curl https://your-deployed-url.com/api/health
# Expected: {"ok": true, "mock": true, "serverTime": "..."}
```

### Caption Generation Test
```bash
curl -X POST https://your-deployed-url.com/api/captions \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "This is a test transcript for caption generation",
    "tone": "professional",
    "maxLen": 120
  }'
# Expected: {"ok": true, "captions": {"tweet": "...", "instagram": "...", "youtube": "..."}}
```

### Export ZIP Test
```bash
curl -X POST https://your-deployed-url.com/api/exportZip \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Test transcript content",
    "tweet": "Test tweet content",
    "instagram": "Test Instagram content",
    "youtube": "Test YouTube content"
  }' \
  --output test-export.zip
# Expected: Downloads a ZIP file with transcript.txt, tweet.txt, instagram.txt, youtube.txt
```

### Logging Test
```bash
curl -X POST https://your-deployed-url.com/api/log \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-event",
    "meta": {"key": "value"}
  }'
# Expected: {"ok": true}
```

## Release Notes Template

### v1.0.0 - Server API Release

#### Features
- Health check endpoint (`GET /api/health`)
- Caption generation endpoint (`POST /api/captions`)
- Logging endpoint (`POST /api/log`)
- Export ZIP functionality (`POST /api/exportZip`)

#### API Consistency
- All endpoints return consistent `{ ok: true }` or `{ ok: false, error: "..." }` format
- Comprehensive input validation
- Proper error handling and status codes
- CORS support for frontend integration

#### Testing
- Full integration test suite
- Error case coverage
- Response format validation
- Mock implementations for development

#### Deployment
- Ready for Render/Fly.io deployment
- Environment variable configuration
- Health check endpoint for monitoring
- File upload support (200MB limit)
