# Forge Server Runbook

This runbook provides operational procedures for running and maintaining the Forge Server.

## Local Development

### Starting the Server

The server runs on port 8787 by default:

```bash
# Development mode with hot reload
yarn dev

# Or using npm
npm run dev
```

The server will start at `http://localhost:8787` and display startup information including:

- API Base URL
- Health check endpoint
- CORS configuration
- Rate limiting settings

### Health Check

Verify the server is running correctly:

```bash
curl http://localhost:8787/api/health
```

Expected response:

```json
{
  "ok": true,
  "data": {
    "ok": true,
    "version": "0.1.0",
    "uptime": 123
  },
  "message": "Server is healthy"
}
```

### Running Tests

Execute the test suite:

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test:coverage

# Run tests in watch mode
yarn test:watch
```

### Type Checking

Validate TypeScript types:

```bash
yarn typecheck
```

### Security Audit

Check for security vulnerabilities:

```bash
# Audit all dependencies
npm audit

# Audit production dependencies only
npm audit --production
```

### Preflight Checks

Run the comprehensive preflight script before deployment or major changes:

```bash
bash scripts/preflight-local.sh
```

This script performs:

- Node.js version validation (>=18)
- TypeScript type checking
- Health endpoint verification
- CORS configuration validation
- Security audit (production dependencies)

## Artifacts

### Log Files

The server generates several types of logs:

- **Console logs**: Real-time server output
- **Client logs**: NDJSON format via `/api/log` endpoint
- **Error logs**: Captured by error handling middleware

### Export Files

Generated content exports are available in:

- `forge_export/` - Sample exported content files
- `forge_export.zip` - Complete export archive

### Performance Monitoring

Monitor server performance:

- Rate limiting: 100 requests/minute per IP
- File upload limit: 200MB
- JSON payload limit: 5MB
- Memory usage via `/api/health` uptime

## Troubleshooting

### Common Issues

1. **Port 8787 already in use**

   ```bash
   # Find process using port
   lsof -i :8787
   # Kill process or change PORT in .env.local
   ```

2. **CORS errors**

   - Verify CORS origin is set to `http://localhost:5173`
   - Check frontend is using correct API base URL

3. **File upload failures**

   - Check file size (max 200MB)
   - Verify supported formats (MP3, WAV, MP4, MOV, etc.)

4. **TypeScript errors**
   ```bash
   # Clear TypeScript cache and rebuild
   rm -rf dist/
   yarn build
   ```

### Debug Mode

Enable verbose logging by checking console output for:

- Request/response details
- Error stack traces
- Rate limiting events
- File upload progress

## Production Deployment

### Build Process

```bash
# Install dependencies
yarn install

# Build TypeScript
yarn build

# Start production server
yarn start
```

### Environment Configuration

Required environment variables:

- `PORT`: Server port (default: 8787)
- `VITE_API_BASE`: API base URL for frontend
- `NODE_ENV`: Environment mode (production/development)

### Health Monitoring

Monitor these endpoints:

- `/api/health` - Basic health check
- `/api/diag/log-level` - Diagnostics endpoint

## Maintenance

### Regular Tasks

1. **Weekly**: Run security audit (`npm audit --production`)
2. **Before releases**: Execute full preflight script
3. **Monthly**: Review and rotate logs
4. **As needed**: Update dependencies

### Backup Procedures

Important data to backup:

- Environment configuration files
- Custom middleware configurations
- Log archives
- Export templates

---

For additional help, refer to the main [README.md](../README.md) or check the [logging documentation](logging.md).
