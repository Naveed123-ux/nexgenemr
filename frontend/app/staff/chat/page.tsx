"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sendMessage } from "@/app/_apis/common/chat";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Search,
  Plus,
  Send,
  MessageSquare,
  Shield,
  Loader2,
  ArrowLeft,
  Circle,
  X,
  AlertCircle,
  Bell,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast from "react-hot-toast";
import {
  fetchConversations,
  fetchConversationDetail,
  resetDetail,
  ConversationPreview,
  ConversationDetail,
  ConversationMessage,
  updateDetail,
  updateConversationPreview,
  setActiveConversation,
  markAsRead,
  markConversationAsRead,
} from "../../../store/slices/chat";
import { AppDispatch, RootState } from "@/store/store";
import { connectSocket, getSocket } from "@/lib/socket";
import { getTokenFromCookie, privateApi } from "@/lib/axios";

interface IncomingMessage {
  id: number;
  conversation_id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  created_at: string;
}

let tempIdCounter = 0;

export default function SecureMessaging() {
  const dispatch = useDispatch();
  const appDispatch = useDispatch<AppDispatch>();
  const {
    list: conversations,
    detail: selectedConversation,
    listLoading,
    detailLoading,
    error,
    activeConversationId,
  } = useSelector((state: RootState) => state.allChat);

  const currentUser = useSelector((state: RootState) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newConversationRecipient, setNewConversationRecipient] = useState("");
  const [newConversationMessage, setNewConversationMessage] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pendingMessages, setPendingMessages] = useState<Set<string>>(
    new Set()
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate total unread count for page title/notification
  const totalUnreadCount = conversations.reduce(
    (sum, convo) => sum + (convo.unread_count || 0),
    0
  );

  // Update page title with unread count
  useEffect(() => {
    const originalTitle = document.title.replace(/^\(\d+\)\s*/, "");
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }

    return () => {
      document.title = originalTitle;
    };
  }, [totalUnreadCount]);

  useEffect(() => {
    if (messagesEndRef.current && selectedConversation?.messages) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages]);

  const isDuplicateMessage = useCallback(
    (newMsg: ConversationMessage, existingMessages: ConversationMessage[]) => {
      return existingMessages.some((msg) => {
        if (
          msg.id === newMsg.id &&
          typeof msg.id === "number" &&
          typeof newMsg.id === "number"
        ) {
          return true;
        }

        if (
          msg.sender_id === newMsg.sender_id &&
          msg.content === newMsg.content
        ) {
          const timeDiff = Math.abs(
            new Date(msg.created_at).getTime() -
            new Date(newMsg.created_at).getTime()
          );
          return timeDiff < 5000;
        }

        return false;
      });
    },
    []
  );

  // WebSocket setup
  useEffect(() => {
    let socket: any = null;

    if (isInitialLoad) {
      appDispatch(fetchConversations());
      setIsInitialLoad(false);
    }

    socket = connectSocket();
    if (socket) {
      setIsConnected(true);

      socket.on("connect", () => {
        setIsConnected(true);
        console.log("Connected to WebSocket server");
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
        console.log("Disconnected from WebSocket server");
      });

      socket.on("connect_error", (error: any) => {
        setIsConnected(false);
        console.error("WebSocket connection error:", error);
        toast.error("Failed to connect to messaging service");
      });

      socket.on("new_message", (newMessage: IncomingMessage) => {
        console.log("Received new message via WebSocket:", newMessage);

        // Update conversation preview with unread tracking
        const updatedConvo = conversations.find(
          (convo) => convo.conversation_id === newMessage.conversation_id
        );

        dispatch(
          updateConversationPreview({
            conversation_id: newMessage.conversation_id,
            last_message_preview: newMessage.content,
            last_message_timestamp: newMessage.created_at,
            receiver_id: updatedConvo?.receiver_id || newMessage.sender_id,
            receiver_name:
              updatedConvo?.receiver_name || newMessage.sender_name,
            subject: updatedConvo?.subject || "",
            sender_id: newMessage.sender_id,
            current_user_id: currentUser?.id,
          })
        );

        // Only process message content if it's the active conversation
        if (newMessage.conversation_id !== selectedConversation?.id) {
          // Show browser notification for background conversations
          if (
            newMessage.sender_id !== currentUser?.id &&
            "Notification" in window
          ) {
            if (Notification.permission === "granted") {
              new Notification(`New message from ${newMessage.sender_name}`, {
                body:
                  newMessage.content.substring(0, 100) +
                  (newMessage.content.length > 100 ? "..." : ""),
                icon: "/favicon.ico",
              });
            }
          }
          return;
        }

        const messageToAdd: ConversationMessage = {
          id: newMessage.id,
          sender_id: newMessage.sender_id,
          sender_name: newMessage.sender_name,
          content: newMessage.content,
          created_at: newMessage.created_at,
          isTemp: false,
        };

        const existingMessages = selectedConversation?.messages || [];

        const tempIndex = existingMessages.findIndex((msg) => {
          if (
            msg.isTemp &&
            msg.sender_id === newMessage.sender_id &&
            msg.content === newMessage.content
          ) {
            const timeDiff = Math.abs(
              new Date(msg.created_at).getTime() -
              new Date(newMessage.created_at).getTime()
            );
            return timeDiff < 5000;
          }
          return false;
        });

        if (tempIndex >= 0) {
          const updatedMessages = [...existingMessages];
          updatedMessages[tempIndex] = messageToAdd;

          dispatch(
            updateDetail({
              ...selectedConversation,
              messages: updatedMessages,
            })
          );

          setPendingMessages((prev) => {
            const newSet = new Set(prev);
            const tempId = (existingMessages[tempIndex] as ConversationMessage)
              .tempId;
            if (tempId) newSet.delete(tempId);
            return newSet;
          });
        } else if (!isDuplicateMessage(messageToAdd, existingMessages)) {
          dispatch(
            updateDetail({
              ...selectedConversation,
              messages: [...existingMessages, messageToAdd],
            })
          );
        }
      });
    } else {
      setIsConnected(false);
      toast.error("No authentication token found");
    }

    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
        socket.off("new_message");
      }
    };
  }, [
    appDispatch,
    dispatch,
    selectedConversation?.id,
    isInitialLoad,
    conversations,
    isDuplicateMessage,
    currentUser?.id,
  ]);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Enhanced conversation selection with read marking
  const handleSelectConversation = useCallback(
    async (conversation: ConversationPreview) => {
      // Set as active conversation immediately (this will mark as read in Redux)
      dispatch(setActiveConversation(conversation.conversation_id));

      // Fetch conversation details
      appDispatch(fetchConversationDetail(conversation.conversation_id));

      // Mark as read on backend (optional, for persistence)
      if (conversation.has_unread) {
        appDispatch(markConversationAsRead(conversation.conversation_id));
      }
    },
    [appDispatch, dispatch]
  );

  const handleSendChatMessage = async () => {
    if (!newMessageText.trim() || !selectedConversation) {
      return;
    }

    if (!isConnected) {
      toast.error("No WebSocket connection available");
      return;
    }

    const tempId = `temp-${Date.now()}-${tempIdCounter++}`;
    const messageContent = newMessageText.trim();

    const tempMessage: ConversationMessage = {
      id: tempId,
      sender_id: currentUser?.id,
      sender_name: currentUser?.name,
      content: messageContent,
      created_at: new Date().toISOString(),
      isTemp: true,
      tempId: tempId,
    };

    setPendingMessages((prev) => new Set([...prev, tempId]));

    dispatch(
      updateDetail({
        ...selectedConversation,
        messages: [...(selectedConversation?.messages || []), tempMessage],
      })
    );

    setNewMessageText("");

    try {
      const response = await sendMessage(
        selectedConversation.id,
        messageContent
      );
      console.log(
        "Message sent, awaiting WebSocket confirmation. TempId:",
        tempId
      );
    } catch (err: any) {
      console.error("Error sending message:", err);

      setPendingMessages((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tempId);
        return newSet;
      });

      dispatch(
        updateDetail({
          ...selectedConversation,
          messages: selectedConversation.messages.filter(
            (msg) => msg.tempId !== tempId
          ),
        })
      );

      toast.error("Failed to send message");
    }
  };

  const handleStartNewConversation = async () => {
    if (!newConversationRecipient || !newConversationMessage.trim()) {
      return;
    }

    try {
      const token = getTokenFromCookie();
      if (!token) {
        toast.error("No authentication token found");
        return;
      }

      const response = await privateApi.post(
        "/messaging/conversations",
        {
          recipient_id: parseInt(newConversationRecipient),
          content: newConversationMessage.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      appDispatch(fetchConversations());
      setIsComposeOpen(false);
      setNewConversationRecipient("");
      setNewConversationMessage("");
      toast.success("Conversation started");
    } catch (err: any) {
      console.error("Error starting conversation:", err);
      toast.error("Failed to start conversation");
    }
  };

  // Enhanced filtering with unread priority
  const filteredConversations = conversations
    .filter(
      (conversation: ConversationPreview) =>
        (conversation.receiver_name || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (conversation.last_message_preview || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by: unread first, then by timestamp
      if (a.has_unread && !b.has_unread) return -1;
      if (!a.has_unread && b.has_unread) return 1;
      return (
        new Date(b.last_message_timestamp).getTime() -
        new Date(a.last_message_timestamp).getTime()
      );
    });

  const formatMessageTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getInitials = (name = "") => {
    return (
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase() || "U"
    );
  };

  return (
    <div className="min-h-[100%] overflow-hidden bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-semibold text-gray-900">
                Secure Messaging
              </h1>
              {totalUnreadCount > 0 && (
                <Badge variant="destructive" className="bg-red-500">
                  {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center mt-2 text-sm text-gray-600">
              <Shield className="h-4 w-4 mr-2 text-[#388fe5]" />
              <span>End-to-end encrypted • HIPAA compliant</span>
              {isConnected ? (
                <span className="ml-2 text-[#388fe5]">• Connected</span>
              ) : (
                <span className="ml-2 text-red-600">• Disconnected</span>
              )}
            </div>
          </div>
          <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setIsComposeOpen(true)}
                className="bg-green-primary hover:bg-green-700"
                disabled={!isConnected}
              >
                <Plus className="mr-2 h-4 w-4" /> New Chat
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
                <DialogDescription>
                  Select a patient to start a new secure chat.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient</Label>
                  <Select
                    value={newConversationRecipient}
                    onValueChange={setNewConversationRecipient}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Add your available users here */}
                      {/* Example:
                      <SelectItem value="1">John Doe (johndoe)</SelectItem>
                      <SelectItem value="2">Jane Smith (janesmith)</SelectItem>
                      */}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">Message</Label>
                  <Textarea
                    id="content"
                    placeholder="Type your first message here..."
                    value={newConversationMessage}
                    onChange={(e) => setNewConversationMessage(e.target.value)}
                    rows={6}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsComposeOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-800 hover:bg-green-700"
                  disabled={
                    !newConversationRecipient || !newConversationMessage.trim()
                  }
                  onClick={handleStartNewConversation}
                >
                  <Send className="mr-2 h-4 w-4" /> Start Chat
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Error Alerts */}
      {error && (
        <Alert className="mx-6 mt-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversations Sidebar */}
        <div
          className={`w-full lg:max-w-67 bg-white border-r flex-col ${selectedConversation ? "hidden lg:flex" : "flex"
            }`}
        >
          {/* Search */}
          <div className="p-4 border-b">
            <div className="relative mb-3 bg-extraLight rounded-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-extraLight py-3"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {listLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {conversations.length === 0 ? (
                  <div>
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p>No conversations yet</p>
                    <p className="text-xs">Start a new chat with a patient</p>
                  </div>
                ) : (
                  <p>No conversations match your search</p>
                )}
              </div>
            ) : (
              filteredConversations.map((convo: ConversationPreview) => {
                const isSelected =
                  selectedConversation?.id === convo.conversation_id;
                const hasUnread = convo.has_unread;

                return (
                  <div
                    key={convo.conversation_id}
                    className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${isSelected
                        ? "bg-blue-50 border-l-4 border-l-blue-500"
                        : hasUnread
                          ? "bg-blue-50/20 border-l-4 border-l-blue-400"
                          : ""
                      }`}
                    onClick={() => handleSelectConversation(convo)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={undefined} />
                          <AvatarFallback className="bg-blue-100 text-blue-700">
                            {getInitials(convo.receiver_name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* 👉 UNREAD DOT */}
                        {hasUnread && (
                          <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-sm font-medium truncate ${hasUnread
                                ? "font-bold text-gray-900"
                                : "text-gray-900"
                              }`}
                          >
                            {convo.receiver_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatMessageTime(convo.last_message_timestamp)}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-sm text-gray-600 truncate">
                            {convo.last_message_preview || "No messages yet"}
                          </p>

                          {/* 👉 UNREAD COUNT BADGE */}
                          {convo.unread_count > 0 && (
                            <Badge variant="destructive" className="ml-2">
                              {convo.unread_count > 99
                                ? "99+"
                                : convo.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div
          className={`flex-1 flex-col ${selectedConversation ? "flex" : "hidden lg:flex"
            }`}
        >
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-6 py-4">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="lg:hidden p-2 -ml-2"
                    onClick={() => dispatch(resetDetail())}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation?.participants?.find(
                        (p) =>
                          p.user_id !== selectedConversation.current_user_id
                      )?.first_name +
                        " " +
                        selectedConversation?.participants?.find(
                          (p) =>
                            p.user_id !== selectedConversation.current_user_id
                        )?.last_name || "Unknown"}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {detailLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : selectedConversation.messages?.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p>No messages yet</p>
                      <p className="text-sm">Start the conversation below</p>
                    </div>
                  </div>
                ) : (
                  selectedConversation.messages?.map((message) => {
                    const isOwn =
                      message.sender_id ===
                      selectedConversation.current_user_id;
                    const senderDetails =
                      selectedConversation.participants.find(
                        (p) => p.user_id === message.sender_id
                      );

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"
                          }`}
                      >
                        <div
                          className={`flex items-end space-x-2 max-w-xs lg:max-w-md ${isOwn ? "flex-row-reverse space-x-reverse" : ""
                            }`}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage
                              src={senderDetails?.profile_picture_url}
                            />
                            <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                              {getInitials(
                                senderDetails
                                  ? senderDetails.first_name +
                                  " " +
                                  senderDetails.last_name
                                  : message.sender_name || "unknown"
                              )}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex flex-col">
                            <div
                              className={`${!isOwn ? "text-start" : "text-end"
                                } text-midGray text-[11px]`}
                            >
                              {senderDetails
                                ? senderDetails.first_name +
                                " " +
                                senderDetails.last_name
                                : message.sender_name || "Unknown"}
                            </div>
                            <div
                              className={`rounded-lg px-4 py-2 relative ${isOwn
                                  ? "bg-green-primary text-white"
                                  : "bg-extraLight text-gray-900 shadow-sm border"
                                } ${message.isTemp ? "opacity-70" : ""}`}
                            >
                              <p className="text-sm whitespace-pre-wrap">
                                {message.content}
                              </p>
                              <div
                                className={`text-xs mt-1 flex items-center ${isOwn ? "text-blue-100" : "text-gray-500"
                                  }`}
                              >
                                {formatMessageTime(message.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="bg-white border-t p-4">
                <div className="flex space-x-2 items-center">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-xs">
                      {getInitials(currentUser?.name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-extraLight px-2 py-2 w-full flex items-center rounded-sm">
                    <Input
                      placeholder="Type a message..."
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendChatMessage();
                        }
                      }}
                      className="flex-1 border-0 focus:ring-0 focus:ring-offset-0 focus:border-none"
                      disabled={!isConnected}
                    />
                    <Button
                      onClick={handleSendChatMessage}
                      disabled={!newMessageText.trim() || !isConnected}
                      className="bg-green-primary hover:bg-green-700 rounded-sm px-3 py-1"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {!isConnected && (
                  <p className="text-xs text-red-500 mt-2">
                    Connection lost. Messages cannot be sent.
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Empty State */
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">
                  Select a conversation
                </h3>
                <p className="text-gray-600 mb-4">
                  Choose a patient from the list to start messaging.
                </p>
                {conversations.length === 0 && (
                  <Button
                    onClick={() => setIsComposeOpen(true)}
                    className="bg-blue-800 hover:bg-green-700"
                    disabled={!isConnected}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Start Your First Chat
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
