import { Socket, io } from "socket.io-client";
import { getTokenFromCookie } from "./axios";

let socket: Socket | null = null;

export const connectSocket = () => {
  if (!socket) {
    const token = getTokenFromCookie();
    console.log("Connecting with token:", token);

    if (!token) {
      console.error("No authentication token available");
      return null;
    }

    const apiUrl =
      typeof window === 'undefined' ? process.env.NEXT_PRIVATE_API_BASE_URL : process.env.NEXT_PUBLIC_API_BASE_URL;
    console.log("Connecting to:", apiUrl);

    socket = io(apiUrl, {
      path: "/socket.io",
      auth: { token }, // :white_check_mark: send JWT to backend
      transports: ["polling", "websocket"], // try polling first to debug
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    // Connection lifecycle events
    socket.on("connect", () => {
      console.log(":white_check_mark: Socket connected:", socket?.id);
    });

    socket.on("connect_success", (data) => {
      console.log(":white_check_mark: Socket authentication successful:", data);
    });

    socket.on("connect_error", (error: any) => {
      console.error(":x: Socket connection error:", error.message);
      console.error("Error details:", error);

      if (error.message.includes("Authentication failed")) {
        console.log(
          ":arrows_counterclockwise: Authentication failed, consider refreshing token"
        );
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(":electric_plug: Socket disconnected:", reason);
    });

    socket.on("error", (error) => {
      console.error(":x: Socket error event:", error);
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log(
        ":arrows_counterclockwise: Socket reconnected after",
        attemptNumber,
        "attempts"
      );
    });

    socket.on("reconnect_error", (error: any) => {
      console.error(":x: Socket reconnection error:", error.message);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log(":electric_plug: Socket manually disconnected");
  }
};

export const getSocket = () => socket;

export const isSocketConnected = () => {
  return socket !== null && socket.connected;
};

export const sendMessage = (event: string, data: any) => {
  if (!socket || !socket.connected) {
    console.error("Socket not connected");
    return false;
  }

  socket.emit(event, data);
  return true;
};
