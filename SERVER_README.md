# WRS Dojo - Save/Load System

This application now includes a game-style save/load system that allows you to save and restore your entire application state.

## Features

- **Named Saves**: Create saves with custom names
- **Auto-Save**: Enable auto-save to automatically update the current save every 5 minutes
- **Multiple Saves**: Store up to 100 saves (oldest are automatically deleted when limit is reached)
- **Save Metadata**: Each save includes group and student counts for easy identification
- **Load/Restore**: Load any previous save to restore your application state

## Setup

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web server for API endpoints
- `cors` - CORS middleware for API
- `nodemon` - Auto-restart server during development
- `concurrently` - Run multiple npm scripts simultaneously

### 2. Development Mode

Run both the Vite dev server and the Express API server:

```bash
npm run dev:full
```

This starts:
- Vite dev server on `http://localhost:5173`
- Express API server on `http://localhost:3001`

### 3. Production Mode

Build the React app and serve it with the Express server:

```bash
npm run build
npm run start:server
```

The server will serve both the static React app and the API endpoints on `http://localhost:3001`.

## API Endpoints

All endpoints are prefixed with `/api`:

- `GET /api/saves` - List all saves with metadata
- `GET /api/saves/:id` - Get a specific save's data
- `POST /api/saves` - Create a new save
- `PUT /api/saves/:id` - Update an existing save
- `DELETE /api/saves/:id` - Delete a save

## Save Files

Saves are stored as JSON files in the `server/saves/` directory. Each save includes:
- Unique ID
- Save name
- Complete localStorage snapshot
- Metadata (group count, student count, etc.)
- Created and updated timestamps

## Usage

1. Click the **Save/Load** button (floating button in bottom-right corner on dashboard)
2. **Save Tab**: Enter a name and create a new save or overwrite the current one
3. **Load Tab**: Browse saves, load previous states, or delete saves
4. **Auto-Save**: Toggle auto-save for the current save (saves every 5 minutes)

## Raspberry Pi Deployment

To run on a Raspberry Pi:

1. Install Node.js (v18 or higher recommended)
2. Clone/copy the repository to the Pi
3. Install dependencies: `npm install`
4. Build the app: `npm run build`
5. Start the server: `npm run start:server`
6. Access at `http://[raspberry-pi-ip]:3001`

### Optional: Run as systemd service

Create `/etc/systemd/system/wrs-dojo.service`:

```ini
[Unit]
Description=WRS Dojo Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/WRS-Dojo
ExecStart=/usr/bin/npm run start:server
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable wrs-dojo
sudo systemctl start wrs-dojo
```

## Environment Variables

- `PORT` - Server port (default: 3001)

Example:
```bash
PORT=8080 npm run start:server
```
