# app/websockets.py

from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import asyncio

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}
        self.loop = None  # Will be set in main.py

    async def connect(self, websocket: WebSocket, image_id: int):
        await websocket.accept()
        if image_id not in self.active_connections:
            self.active_connections[image_id] = []
        self.active_connections[image_id].append(websocket)

    def disconnect(self, websocket: WebSocket, image_id: int):
        if image_id in self.active_connections:
            self.active_connections[image_id].remove(websocket)
            if not self.active_connections[image_id]:
                del self.active_connections[image_id]

    async def send_progress(self, image_id: int, progress: int):
        if image_id in self.active_connections:
            message = json.dumps({"progress": progress})
            for connection in self.active_connections[image_id]:
                await connection.send_text(message)

    def send_progress_sync(self, image_id: int, progress: int):
        if self.loop is None:
            # Attempt to get the current event loop
            try:
                self.loop = asyncio.get_event_loop()
            except RuntimeError:
                # No event loop in this thread
                pass
        if self.loop:
            coro = self.send_progress(image_id, progress)
            asyncio.run_coroutine_threadsafe(coro, self.loop)

manager = ConnectionManager()
