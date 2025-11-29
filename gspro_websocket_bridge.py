"""
GSPro WebSocket Bridge - Connects GSPro to web browser minigames
Receives shot data from GSPro and forwards to browser clients via WebSocket
"""

import asyncio
import json
import websockets
from typing import Set
from gspro_client import GSProClient, BallData, ClubData
import threading


class WebSocketBridge:
    """Bridge between GSPro and web browser clients"""

    def __init__(self, ws_host: str = "0.0.0.0", ws_port: int = 8765):
        """
        Initialize WebSocket bridge

        Args:
            ws_host: WebSocket server host
            ws_port: WebSocket server port
        """
        self.ws_host = ws_host
        self.ws_port = ws_port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()
        self.gspro_client: GSProClient = None
        self.loop = None

    async def register_client(self, websocket):
        """Register a new WebSocket client"""
        self.clients.add(websocket)
        print(f"Client connected from {websocket.remote_address}. Total clients: {len(self.clients)}")

        # Send connection confirmation
        await websocket.send(json.dumps({
            "type": "connected",
            "message": "Connected to GSPro Bridge"
        }))

        try:
            # Keep connection alive and handle incoming messages
            async for message in websocket:
                data = json.loads(message)
                await self.handle_client_message(websocket, data)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.remove(websocket)
            print(f"Client disconnected. Total clients: {len(self.clients)}")

    async def handle_client_message(self, websocket, data: dict):
        """Handle messages from web clients"""
        msg_type = data.get("type", "")

        if msg_type == "ping":
            await websocket.send(json.dumps({"type": "pong"}))

        elif msg_type == "ready":
            # Client is ready to receive shots
            print(f"Client ready: {data.get('game', 'unknown')}")

        elif msg_type == "request_test_shot":
            # Send a test shot
            await self.broadcast_shot({
                "ball_speed": 120.0,
                "spin_axis": -2.0,
                "total_spin": 2800.0,
                "hla": 2.5,
                "vla": 15.0
            })

    async def broadcast_shot(self, shot_data: dict):
        """Broadcast shot data to all connected clients"""
        if not self.clients:
            return

        message = json.dumps({
            "type": "shot",
            "data": shot_data
        })

        # Send to all connected clients
        disconnected = set()
        for client in self.clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected.add(client)

        # Remove disconnected clients
        self.clients -= disconnected

    async def broadcast_message(self, msg_type: str, data: dict):
        """Broadcast any message to all clients"""
        if not self.clients:
            return

        message = json.dumps({
            "type": msg_type,
            "data": data
        })

        disconnected = set()
        for client in self.clients:
            try:
                await client.send(message)
            except:
                disconnected.add(client)

        self.clients -= disconnected

    async def start_server(self):
        """Start WebSocket server"""
        async with websockets.serve(self.register_client, self.ws_host, self.ws_port):
            print(f"WebSocket server started on ws://{self.ws_host}:{self.ws_port}")
            print(f"Open http://localhost:8000 in your browser")
            await asyncio.Future()  # Run forever

    def on_gspro_shot(self, ball_data: BallData, club_data: ClubData = None):
        """Callback when shot received from GSPro"""
        shot_data = {
            "ball_speed": ball_data.Speed,
            "spin_axis": ball_data.SpinAxis,
            "total_spin": ball_data.TotalSpin,
            "back_spin": ball_data.BackSpin,
            "side_spin": ball_data.SideSpin,
            "hla": ball_data.HLA,
            "vla": ball_data.VLA,
            "carry_distance": ball_data.CarryDistance
        }

        if club_data:
            shot_data["club"] = {
                "speed": club_data.Speed,
                "angle_of_attack": club_data.AngleOfAttack,
                "face_to_target": club_data.FaceToTarget,
                "path": club_data.Path
            }

        # Schedule broadcast in the event loop
        if self.loop:
            asyncio.run_coroutine_threadsafe(
                self.broadcast_shot(shot_data),
                self.loop
            )

        print(f"Forwarded shot to {len(self.clients)} browser client(s)")


class GSProWebBridge:
    """Combined bridge managing GSPro and WebSocket connections"""

    def __init__(self, device_id: str = "Web Minigames LM"):
        self.device_id = device_id
        self.ws_bridge = WebSocketBridge()
        self.gspro_client: GSProClient = None
        self.running = False

    def setup_gspro(self):
        """Setup GSPro client in separate thread"""
        print("Connecting to GSPro...")
        self.gspro_client = GSProClient(device_id=self.device_id)

        # Setup callbacks
        self.gspro_client.on_shot_success = lambda: None

        if not self.gspro_client.connect():
            print("⚠ Could not connect to GSPro - running in demo mode")
            print("  You can still test with the 'Test Shot' button")
            return False

        self.gspro_client.start_heartbeat(interval=5.0)
        print("✓ Connected to GSPro")
        return True

    async def run(self):
        """Run the bridge"""
        print("=== GSPro WebSocket Bridge ===\n")

        # Start GSPro client in background thread
        gspro_thread = threading.Thread(target=self.setup_gspro, daemon=True)
        gspro_thread.start()

        # Store event loop for callbacks
        self.ws_bridge.loop = asyncio.get_event_loop()

        # Start WebSocket server
        self.running = True
        await self.ws_bridge.start_server()

    def intercept_and_forward_shot(self, ball_data: BallData, club_data: ClubData = None):
        """Send shot to both GSPro and browser clients"""
        # Forward to browsers
        self.ws_bridge.on_gspro_shot(ball_data, club_data)

        # Send to GSPro if connected
        if self.gspro_client and self.gspro_client.connected:
            self.gspro_client.send_shot(ball_data, club_data)


def main():
    """Main entry point"""
    bridge = GSProWebBridge(device_id="Web Minigames 1.0")

    try:
        asyncio.run(bridge.run())
    except KeyboardInterrupt:
        print("\n\nShutting down...")


if __name__ == "__main__":
    main()
