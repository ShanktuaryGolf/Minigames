#!/usr/bin/env python3
"""
Simple HTTP server for web minigames
Serves the HTML/JS files and runs the WebSocket bridge
"""

import http.server
import socketserver
import threading
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from web.gspro_websocket_bridge import main as run_bridge


class WebServerThread(threading.Thread):
    """Thread to run HTTP server"""

    def __init__(self, port=8000):
        super().__init__(daemon=True)
        self.port = port

    def run(self):
        # Change to web directory
        web_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(web_dir)

        handler = http.server.SimpleHTTPRequestHandler
        with socketserver.TCPServer(("", self.port), handler) as httpd:
            print(f"HTTP server running at http://localhost:{self.port}")
            print(f"Open http://localhost:{self.port} in your browser\n")
            httpd.serve_forever()


def main():
    """Start both HTTP server and WebSocket bridge"""
    print("=== GSPro Web Minigames Server ===\n")

    # Start HTTP server in background thread
    http_thread = WebServerThread(port=8000)
    http_thread.start()

    # Run WebSocket bridge in main thread
    print("Starting WebSocket bridge...\n")

    try:
        run_bridge()
    except KeyboardInterrupt:
        print("\n\nShutting down...")


if __name__ == "__main__":
    main()
