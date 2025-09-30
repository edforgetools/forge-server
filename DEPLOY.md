# Forge Server Deployment Guide

This guide covers deploying the Forge server to various platforms and includes post-deployment verification steps.

## 🚀 Deployment Options

### Option 1: Render (Recommended for Server)

**Pros:** Simple setup, automatic deployments, persistent storage
**Cons:** Limited free tier, slower cold starts

#### Steps:

1. **Connect Repository**

   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Select "New Web Service"

2. **Configure Service**

   - **Name:** `forge-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`

3. **Set Environment Variables**

   ```
   NODE_ENV=production
   PORT=10000
   VITE_API_BASE=https://your-app-name.onrender.com
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for build and deployment to complete

**Health Check URL:** `https://your-app-name.onrender.com/api/health`

---

### Option 2: Fly.io (Alternative for Server)

**Pros:** Better performance, global edge deployment, more control
**Cons:** More complex setup, requires CLI

#### Steps:

1. **Install Fly CLI**

   ```bash
   # macOS
   brew install flyctl

   # Or download from https://fly.io/docs/hands-on/install-flyctl/
   ```

2. **Login and Initialize**

   ```bash
   fly auth login
   fly launch
   ```

3. **Deploy**
   ```bash
   fly deploy
   ```

**Health Check URL:** `https://your-app-name.fly.dev/api/health`

---

### Option 3: Vercel (For API Routes)

**Pros:** Excellent for serverless, automatic scaling
**Cons:** Cold starts, 10-second function timeout limit

#### Steps:

1. **Install Vercel CLI**

   ```bash
   npm i -g vercel
   ```

2. **Deploy**

   ```bash
   vercel --prod
   ```

3. **Set Environment Variables**
   ```bash
   vercel env add NODE_ENV production
   vercel env add VITE_API_BASE https://your-app.vercel.app
   ```

**Health Check URL:** `https://your-app.vercel.app/api/health`

---

## 🔧 Required Environment Variables

| Variable        | Description               | Required | Default                 |
| --------------- | ------------------------- | -------- | ----------------------- |
| `NODE_ENV`      | Environment mode          | Yes      | `production`            |
| `PORT`          | Server port               | No       | `8787`                  |
| `VITE_API_BASE` | API base URL for frontend | Yes      | `http://localhost:8787` |

## 🏥 Health Check Endpoints

### Primary Health Check

- **URL:** `GET /api/health`
- **Expected Response:**
  ```json
  {
    "ok": true,
    "mock": true,
    "serverTime": "2024-01-01T00:00:00.000Z"
  }
  ```

### Additional Endpoints

- **Caption Generation:** `POST /api/captions`
- **File Transcription:** `POST /api/transcribe`
- **Export ZIP:** `POST /api/exportZip`
- **Logging:** `POST /api/log`

## ✅ Post-Deploy Sanity Checklist

### 1. Health Check Verification

```bash
# Test health endpoint
curl https://your-deployed-url.com/api/health

# Expected: {"ok": true, "mock": true, "serverTime": "..."}
```

### 2. Caption Generation Test

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

### 3. Export ZIP Functionality Test

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

### 4. Watermark Enforcement Test

```bash
# Test that captions include watermark
curl -X POST https://your-deployed-url.com/api/captions \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Test content",
    "tone": "default"
  }' | jq '.captions'

# Expected: All captions should contain "MOCK:" prefix (watermark)
```

### 5. File Upload Test

```bash
# Test file transcription endpoint
curl -X POST https://your-deployed-url.com/api/transcribe \
  -F "file=@sample.mov"

# Expected: {"ok": true, "mock": true, "language": "en", "text": "..."}
```

### 6. Error Handling Test

```bash
# Test invalid file type
curl -X POST https://your-deployed-url.com/api/transcribe \
  -F "file=@README.md"

# Expected: 400 error with message about invalid file type
```

### 7. CORS Configuration Test

```bash
# Test CORS headers
curl -I https://your-deployed-url.com/api/health

# Expected: Should include Access-Control-Allow-Origin header
```

## 🔍 Monitoring & Debugging

### Logs

- **Render:** Available in dashboard under "Logs" tab
- **Fly.io:** `fly logs`
- **Vercel:** Available in dashboard under "Functions" tab

### Common Issues

1. **Build Failures:** Check Node.js version compatibility
2. **Memory Issues:** Increase memory allocation for file processing
3. **Timeout Issues:** Consider increasing function timeout limits
4. **CORS Issues:** Verify CORS configuration for frontend domain

## 📊 Performance Considerations

- **File Size Limit:** 200MB (configured in multer)
- **Memory Usage:** Monitor for large file processing
- **Cold Starts:** Consider keeping services warm for better UX
- **Rate Limiting:** Implement if needed for production use

## 🔄 Continuous Deployment

### GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        uses: johnbeynon/render-deploy-action@v0.0.8
        with:
          serviceId: ${{ secrets.RENDER_SERVICE_ID }}
          apiKey: ${{ secrets.RENDER_API_KEY }}
```

## 🆘 Troubleshooting

### Server Won't Start

1. Check environment variables
2. Verify build process completed successfully
3. Check logs for specific error messages

### API Endpoints Not Working

1. Verify health check endpoint first
2. Check CORS configuration
3. Verify request format matches expected schema

### File Upload Issues

1. Check file size limits
2. Verify file type restrictions
3. Check available disk space

---

**Need Help?** Check the logs first, then review the error messages in the API responses for specific guidance.
