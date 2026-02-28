import socketio
import logging

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
logging.basicConfig(level=logging.DEBUG)

@sio.event
async def connect(sid, environ, auth):
    print("CONNECT", sid, auth)
    return True

@sio.event
async def disconnect(sid):
    print("❌ DISCONNECT", sid)

app = socketio.ASGIApp(sio)
