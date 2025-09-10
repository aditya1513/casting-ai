#!/usr/bin/env node

/**
 * Minimal test server to verify Node.js functionality
 * No dependencies required - just core Node.js
 */

const http = require("http");
const PORT = 5002;

const server = http.createServer((req, res) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ 
      status: "healthy",
      timestamp: new Date().toISOString(),
      message: "Minimal test server running successfully!"
    }));
  } else {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("CastMatch Minimal Test Server Running on Port " + PORT);
  }
});

server.listen(PORT, () => {
  console.log(`
    ========================================
    🚀 Minimal Test Server Started
    ========================================
    Port: ${PORT}
    URL: http://localhost:${PORT}
    Health: http://localhost:${PORT}/health
    ========================================
    
    This is a minimal server with NO dependencies.
    If this works, we can gradually add features.
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
