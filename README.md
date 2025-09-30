# Forge Server

A mock server for the Forge application that provides API endpoints for transcription, caption generation, and content export.

## Features

- **Health Check**: `/api/health` - Server status endpoint
- **Transcription**: `/api/transcribe` - Mock transcription service for audio/video files
- **Caption Generation**: `/api/captions` - Generate social media captions from transcripts
- **Content Export**: `/api/exportZip` - Export content as ZIP files
- **Client Logging**: `/api/log` - Centralized logging endpoint
- **CORS Support**: Cross-origin requests enabled for frontend integration

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- Yarn package manager

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   yarn install
   ```

### Environment Setup

1. Copy the environment template:

   ```bash
   cp .env.local.example .env.local
   ```

2. Update `.env.local` with your preferred settings:
   ```env
   VITE_API_BASE=http://localhost:8787
   PORT=8787
   ```

### Running the Server

#### Development Mode

```bash
yarn dev
```

This will:

- Start the server with hot reload
- Display the detected API base URL in the console
- Run on the port specified in your environment (default: 8787)

#### Production Mode

```bash
yarn build
yarn start
```

### Running Both Apps (Frontend + Backend)

To run both the frontend and backend applications:

1. **Terminal 1 - Backend Server**:

   ```bash
   cd forge-server
   yarn dev
   ```

2. **Terminal 2 - Frontend App**:
   ```bash
   cd forge-frontend  # or your frontend directory
   yarn dev
   ```

The frontend will connect to the backend using the `VITE_API_BASE` environment variable.

## API Endpoints

### Health Check

```
GET /api/health
```

Returns server status and timestamp.

### Transcription

```
POST /api/transcribe
Content-Type: multipart/form-data
```

Upload audio/video files for mock transcription.

**Supported formats**: MP3, WAV, MP4, MOV, AVI, MKV, M4A, AAC

### Caption Generation

```
POST /api/captions
Content-Type: application/json

{
  "transcript": "Your transcript text",
  "tone": "default|professional|casual|funny",
  "maxLen": 120
}
```

### Content Export

```
POST /api/exportZip
Content-Type: application/json

{
  "transcript": "Transcript text",
  "tweet": "Tweet caption",
  "instagram": "Instagram caption",
  "youtube": "YouTube caption",
  "captions": {
    "custom": "Custom caption"
  }
}
```

### Client Logging

```
POST /api/log
Content-Type: application/json

{
  "name": "event-name",
  "meta": {
    "key": "value"
  }
}
```

## Development

### Project Structure

```
forge-server/
├── src/
│   ├── lib/
│   │   ├── logEvent.ts      # Client-side logging
│   │   └── serverLog.ts     # Server-side logging
│   ├── middleware/
│   │   └── errorHandler.ts  # Error handling middleware
│   └── examples/
│       └── loggingExample.ts
├── index.ts                 # Main server file
├── package.json
└── .env.local.example      # Environment template
```

### Scripts

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build TypeScript to JavaScript
- `yarn start` - Start production server
- `yarn typecheck` - Run TypeScript type checking

### Logging

The server includes a centralized logging system:

- **Client-side**: Use `logEvent`, `logError`, `logInfo`, `logWarning` from `src/lib/logEvent.ts`
- **Server-side**: Use `logServerInfo`, `logServerError`, `logServerWarning` from `src/lib/serverLog.ts`

See `src/lib/README.md` for detailed logging documentation.

## Configuration

### Environment Variables

| Variable        | Default                 | Description               |
| --------------- | ----------------------- | ------------------------- |
| `PORT`          | `8787`                  | Server port               |
| `VITE_API_BASE` | `http://localhost:8787` | API base URL for frontend |

### CORS

CORS is enabled for all origins. In production, configure specific origins as needed.

## Troubleshooting

### Common Issues

1. **Port already in use**: Change the `PORT` in your `.env.local` file
2. **CORS errors**: Ensure the frontend is using the correct `VITE_API_BASE` URL
3. **File upload errors**: Check file size limits (200MB max) and supported formats

### Debug Mode

The server logs all requests and errors to the console. Check the terminal output for detailed information.

## License

Private - Forge Application
