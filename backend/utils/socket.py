import socketio
from sqlalchemy.orm import Session
from db.db import get_db
from utils.jwt import verify_token
from models.user_model import User
from services import messaging_service
from jose import JWTError
from urllib.parse import parse_qs

# --- 1. Initialize Socket.IO Server (no logging) ---
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*"
)

# Track connected users {user_id: sid}
connected_users = {}

def get_db_session() -> Session:
    return next(get_db())

@sio.event
async def connect(sid, environ, auth):
    print(f"⚡ New connection attempt. SID: {sid}")

    query_string = environ.get("QUERY_STRING", "")
    params = parse_qs(query_string)
    token = params.get("token", [None])[0]

    if not token and auth:
        token = auth.get("token") or auth.get("jwt")
        print(f"🔑 Token from auth: {token}")

    if token and token.startswith("Bearer "):
        token = token[7:]
        print(f"✅ Bearer token extracted: {token}")

    db = None
    try:
        db = get_db_session()
        print("📂 Database session started for connect")

        if token:
            try:
                payload = verify_token(token, JWTError("Invalid token"))
                user_email = payload.get("sub")
                print(f"👤 Token payload email: {user_email}")

                if not user_email:
                    print("❌ Token missing 'sub' field")
                    raise ValueError("Token missing 'sub' field")

                users = db.query(User).all()
                print(f"📋 Users fetched from DB: {len(users)}")
                user = next((u for u in users if u.email == user_email), None)

                if not user:
                    print(f"❌ User not found for email: {user_email}")
                    raise ValueError("User not found")

                print(f"✅ User authenticated: {user.email} (ID: {user.id})")
                await sio.save_session(sid, {"user_id": user.id, "email": user.email})
                connected_users[user.id] = sid
                await sio.enter_room(sid, f"user_{user.id}")

                await sio.emit("connect_success", {
                    "message": "Connected successfully",
                    "user_id": user.id,
                    "email": user.email
                }, room=sid)
                print(f"🎉 Connection success for user {user.email}")
                return
            except Exception as e:
                print(f"⚠️ Token verification/auth error: {e}")

        # --- Always allow anonymous ---
        print("🟡 Anonymous user connected")
        await sio.save_session(sid, {"user_id": "anonymous"})
        await sio.enter_room(sid, "anonymous_room")
        await sio.emit("connect_success", {
            "message": "Connected anonymously",
            "sid": sid
        }, room=sid)

    except Exception as e:
        print(f"💥 Error in connect: {e}")
    finally:
        if db:
            db.close()
            print("🔒 Database session closed for connect")


@sio.on("send_message")
async def handle_send_message(sid, data):
    print(f"✉️ Incoming message event from SID: {sid}, data: {data}")

    session = await sio.get_session(sid)
    user_id = session.get("user_id")
    print(f"📌 Session data: {session}")

    if not user_id or user_id == "anonymous":
        print("❌ Anonymous user tried to send a message")
        await sio.emit("error", {"message": "Authentication required to send messages"}, room=sid)
        return

    conversation_id = data.get("conversation_id")
    content = data.get("content")
    print(f"🗨️ Message details - Conversation: {conversation_id}, Content: {content}")

    if not all([conversation_id, content]):
        print("❌ Missing conversation_id or content")
        await sio.emit("error", {"message": "Missing conversation_id or content"}, room=sid)
        return

    db = None
    try:
        db = get_db_session()
        print("📂 Database session started for send_message")

        current_user = db.query(User).filter(User.id == user_id).first()
        if not current_user:
            print(f"❌ No user found with ID: {user_id}")
            await sio.emit("error", {"message": "Authenticated user not found"}, room=sid)
            return

        print(f"✅ Current user: {current_user.email} (ID: {current_user.id})")

        # Create the request object
        request = messaging_service.CreateMessageRequest(content=content)
        print(f"📤 Creating message for conversation {conversation_id}")

        await messaging_service.create_message(
            db=db,
            conversation_id=conversation_id,
            request=request,
            current_user=current_user
        )

        print("🎉 Message successfully created and broadcasted")

        # Confirmation back to sender
        await sio.emit("message_sent_confirmation", {
            "status": "success",
            "conversation_id": conversation_id,
            "content": content
        }, room=sid)
        print("✅ Sent message_sent_confirmation")

    except Exception as e:
        print(f"💥 Error in handle_send_message: {e}")
        await sio.emit("error", {"message": f"An error occurred: {str(e)}"}, room=sid)
    finally:
        if db:
            db.close()
            print("🔒 Database session closed for send_message")



# --- 2. Events ---
# @sio.event
# async def connect(sid, environ, auth):
#     query_string = environ.get("QUERY_STRING", "")
#     params = parse_qs(query_string)
#     token = params.get("token", [None])[0]

#     if not token and auth:
#         token = auth.get("token") or auth.get("jwt")
#         print(f"Token : {token}")

#     if token and token.startswith("Bearer "):
#         token = token[7:]

#     db = None
#     try:
#         db = get_db_session()
#         if token:
#             try:
#                 payload = verify_token(token, JWTError("Invalid token"))
#                 user_email = payload.get("sub")
#                 print(f"🔴 User: {user_email}")

#                 if not user_email:
#                     print(f"🔴 User not found for email : {user_email}")
#                     raise ValueError("Token missing 'sub' field")

#                 users = db.query(User).all()
#                 user = next((u for u in users if u.email == user_email), None)
#                 if not user:
#                     raise ValueError("User not found")

#                 await sio.save_session(sid, {"user_id": user.id, "email": user.email})
#                 connected_users[user.id] = sid
#                 await sio.enter_room(sid, f"user_{user.id}")
                

#                 await sio.emit("connect_success", {
#                     "message": "Connected successfully",
#                     "user_id": user.id,
#                     "email": user.email
#                 }, room=sid)
#                 return
#             except Exception:
#                 pass

#         # --- Always allow anonymous ---
#         await sio.save_session(sid, {"user_id": "anonymous"})
#         await sio.enter_room(sid, "anonymous_room")
#         await sio.emit("connect_success", {
#             "message": "Connected anonymously",
#             "sid": sid
#         }, room=sid)

#     except Exception:
#         pass
#     finally:
#         if db:
#             db.close()



# @sio.on("send_message")
# async def handle_send_message(sid, data):
#     session = await sio.get_session(sid)
#     user_id = session.get("user_id")

#     if not user_id or user_id == "anonymous":
#         await sio.emit("error", {"message": "Authentication required to send messages"}, room=sid)
#         return

#     conversation_id = data.get("conversation_id")
#     content = data.get("content")

#     if not all([conversation_id, content]):
#         await sio.emit("error", {"message": "Missing conversation_id or content"}, room=sid)
#         return

#     db = None
#     try:
#         # Get a new DB session for this event
#         db = get_db_session()
#         current_user = db.query(User).filter(User.id == user_id).first()

#         if not current_user:
#             await sio.emit("error", {"message": "Authenticated user not found"}, room=sid)
#             return
        
#         # Create the request object that the service function expects
#         request = messaging_service.CreateMessageRequest(content=content)
        
#         # Reuse your existing service function to handle message creation and broadcasting
#         # This keeps your logic centralized and avoids duplicating code (DRY)
#         await messaging_service.create_message(
#             db=db,
#             conversation_id=conversation_id,
#             request=request,
#             current_user=current_user
#         )

#         # Optionally, send a direct confirmation back to the sender
#         await sio.emit("message_sent_confirmation", {
#             "status": "success",
#             "conversation_id": conversation_id,
#             "content": content
#         }, room=sid)

#     except Exception as e:
#         # It's good practice to log the actual error on the server
#         print(f"Error in handle_send_message: {e}")
#         await sio.emit("error", {"message": f"An error occurred: {str(e)}"}, room=sid)
#     finally:
#         # Make sure to close the database session
#         if db:
#             db.close()
# @sio.on("send_message")
# async def handle_send_message(sid, data):
#     session = await sio.get_session(sid)
#     user_id = session.get("user_id", "anonymous")

#     conversation_id = data.get("conversation_id")
#     content = data.get("content")

#     if not all([conversation_id, content]):
#         await sio.emit("error", {"message": "Missing conversation_id or content"}, room=sid)
#         return

#     await sio.emit("message_sent", {
#         "message": "Message sent",
#         "conversation_id": conversation_id,
#         "content": content,
#         "sender": user_id
#     }, room=sid)

@sio.event
async def disconnect(sid):
    try:
        session = await sio.get_session(sid)
        user_id = session.get("user_id")
        if user_id in connected_users:
            del connected_users[user_id]
    except Exception:
        pass

@sio.on("ping")
async def handle_ping(sid, data):
    try:
        session = await sio.get_session(sid)
        await sio.emit("pong", {
            "message": "Connection is alive",
            "session": session
        }, room=sid)
    except Exception:
        await sio.emit("error", {"message": "Ping failed"}, room=sid)