import socketio

TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzaHNoYXZoc3N2dkBnbWFpbC5jb20iLCJyb2xlIjoiUmVjZXB0aW9uaXN0IiwiZXhwIjoxNzU3MDk5NzU1fQ.wurzDyhunLMjutShNhyYUeLH9xwDB4yyWyiJg13Eykw"

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to server")

@sio.event
def connect_error(data):
    print("❌ Connection failed:", data)

@sio.event
def disconnect():
    print("❌ Disconnected from server")

sio.connect("http://localhost:8000/ws", auth={"token": TOKEN}, socketio_path="ws/socket.io")
sio.wait()
