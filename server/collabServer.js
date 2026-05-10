/**
 * VisualVigorWeb Collaboration Server
 * 
 * Standalone WebSocket server based on y-websocket.
 * Manages collaboration rooms and relays Yjs document updates between clients.
 * 
 * Usage:
 *   node server/collabServer.js [--port 4444] [--host 0.0.0.0]
 */

import http from 'http';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const WebSocketServer = require('ws').Server;
import { setupWSConnection, docs } from 'y-websocket/bin/utils';

// --- Configuration ---
const PORT = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') || '4444', 10);
const HOST = process.argv.find((_, i, a) => a[i - 1] === '--host') || '0.0.0.0';

// --- HTTP Server (health check + upgrade) ---
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            rooms: docs.size,
            uptime: process.uptime()
        }));
        return;
    }

    if (req.url === '/rooms') {
        const roomList = [];
        docs.forEach((doc, name) => {
            // awareness is attached to doc by y-websocket utils
            const awareness = doc.awareness;
            const userCount = awareness ? awareness.getStates().size : 0;
            roomList.push({ name, users: userCount });
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(roomList));
        return;
    }

    res.writeHead(404);
    res.end('Not Found');
});

// --- WebSocket Server ---
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
    // Extract room name from URL path: /roomName
    const roomName = decodeURIComponent(req.url.slice(1).split('?')[0]);

    if (!roomName || roomName.length > 128) {
        ws.close(4001, 'Invalid room name');
        return;
    }

    console.log(`[Collab] Client connected to room: "${roomName}"`);

    // y-websocket handles Yjs sync protocol, awareness, etc.
    setupWSConnection(ws, req, {
        docName: roomName,
        gc: true // garbage-collect deleted content
    });

    ws.on('close', () => {
        console.log(`[Collab] Client disconnected from room: "${roomName}"`);
    });
});

// --- Start ---
server.listen(PORT, HOST, () => {
    console.log(`[VisualVigorWeb Collab Server] Running on ws://${HOST}:${PORT}`);
    console.log(`[VisualVigorWeb Collab Server] Health check: http://${HOST}:${PORT}/health`);
});
