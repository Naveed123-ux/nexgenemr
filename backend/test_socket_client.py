import socketio
import asyncio

sio = socketio.AsyncClient()

@sio.event
async def connect():
    print("✅ Connection established!")

@sio.event
async def connect_error(data):
    print(f"❌ Connection failed: {data}")

@sio.event
async def disconnect():
    print("🔌 Disconnected")

async def main():
    try:
        print("Attempting to connect to http://localhost:8000/socket.io/ ...")
        # Ensure we match the backend settings: socketio_path='socket.io'
        await sio.connect('http://localhost:8000', socketio_path='socket.io', transports=['websocket', 'polling'])
        await sio.wait()
    except Exception as e:
        print(f"💥 Exception: {e}")

if __name__ == '__main__':
    asyncio.run(main())
