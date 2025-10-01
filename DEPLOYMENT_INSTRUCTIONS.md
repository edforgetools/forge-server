# Deployment Instructions for Release v1 QA

## 🚀 Ready for Deployment

The server has passed all QA checks and is ready for deployment. Follow these instructions based on your preferred platform.

## Option 1: Render (Recommended)

### Prerequisites

- GitHub repository connected to Render
- Render account with available service slots

### Steps

1. **Go to [render.com](https://render.com)**
2. **Create New Web Service**
   - Connect repository: `edforgetools/forge-server`
   - Select branch: `release/v1-qa-2025-10-01` (or merge to main first)
3. **Configure Service**
   - **Name:** `forge-server-v1`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
4. **Set Environment Variables**
   ```
   NODE_ENV=production
   PORT=10000
   VITE_API_BASE=https://forge-server-v1.onrender.com
   ```
5. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment to complete

### Post-Deployment Verification

```bash
# Test health endpoint
curl https://forge-server-v1.onrender.com/api/health
# Expected: {"ok": true, "mock": true, "serverTime": "..."}

# Test caption generation
curl -X POST https://forge-server-v1.onrender.com/api/captions \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Test transcript", "tone": "professional"}'
# Expected: {"ok": true, "captions": {"tweet": "...", "instagram": "...", "youtube": "..."}}
```

## Option 2: Fly.io (Alternative)

### Prerequisites

- Fly CLI installed (`brew install flyctl`)
- Fly.io account

### Steps

1. **Login and Initialize**
   ```bash
   fly auth login
   fly launch
   ```
2. **Configure fly.toml** (already exists in repo)
3. **Deploy**
   ```bash
   fly deploy
   ```

### Post-Deployment Verification

```bash
# Test health endpoint
curl https://forge-server-v1.fly.dev/api/health
# Expected: {"ok": true, "mock": true, "serverTime": "..."}
```

## Option 3: Vercel (For API Routes)

### Prerequisites

- Vercel CLI installed (`npm i -g vercel`)
- Vercel account

### Steps

1. **Deploy**
   ```bash
   vercel --prod
   ```
2. **Set Environment Variables**
   ```bash
   vercel env add NODE_ENV production
   vercel env add VITE_API_BASE https://forge-server-v1.vercel.app
   ```

## 🔍 QA Verification Checklist

After deployment, run these tests to verify everything works:

### 1. Health Check

```bash
curl https://your-deployed-url.com/api/health
# Should return: {"ok": true, "mock": true, "serverTime": "..."}
```

### 2. Caption Generation

```bash
curl -X POST https://your-deployed-url.com/api/captions \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "This is a test transcript for caption generation",
    "tone": "professional",
    "maxLen": 120
  }'
# Should return: {"ok": true, "captions": {"tweet": "...", "instagram": "...", "youtube": "..."}}
```

### 3. Export ZIP

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
# Should download a ZIP file with transcript.txt, tweet.txt, instagram.txt, youtube.txt
```

### 4. Logging

```bash
curl -X POST https://your-deployed-url.com/api/log \
  -H "Content-Type: application/json" \
  -d '{
    "name": "test-event",
    "meta": {"key": "value"}
  }'
# Should return: {"ok": true}
```

## 📊 Monitoring

- **Health Check URL:** `https://your-deployed-url.com/api/health`
- **Logs:** Available in platform dashboard
- **Performance:** Monitor memory usage for file processing

## 🆘 Troubleshooting

If deployment fails:

1. Check build logs for TypeScript errors
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Check that the health check endpoint is accessible

## ✅ Success Criteria

- [ ] Health endpoint returns `{ ok: true }`
- [ ] All API endpoints return consistent JSON format
- [ ] Caption generation works with watermark
- [ ] Export ZIP functionality works
- [ ] Logging endpoint accepts events
- [ ] CORS headers are present
- [ ] Error handling returns proper 4xx responses

---

**Ready to deploy!** Choose your preferred platform and follow the steps above.
