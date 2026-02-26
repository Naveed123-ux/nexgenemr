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
  Smile,
  UserMinus,
  UserCheck,
  Info
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import toast from "react-hot-toast";
import {
  fetchConversations,
  fetchConversationDetail,
  fetchContacts,
  blockUnblockUser,
  resetDetail,
  ConversationPreview,
  ConversationDetail,
  ConversationMessage,
  updateDetail,
  updateConversationPreview,
  setActiveConversation,
} from "../../../store/slices/chat";
import { AppDispatch, RootState } from "@/store/store";
import { connectSocket, getSocket } from "@/lib/socket";
import { privateApi } from "@/lib/axios";

interface IncomingMessage {
  id: number;
  conversation_id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  sender_role?: string;
  created_at: string;
}

export default function SecureMessaging() {
  const dispatch = useDispatch();
  const appDispatch = useDispatch<AppDispatch>();
  const {
    list: conversations,
    detail: selectedConversation,
    contacts,
    listLoading,
    detailLoading,
    contactsLoading,
    error,
    activeConversationId,
  } = useSelector((state: RootState) => state.allChat);

  const currentUser = useSelector((state: RootState) => state.auth);
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newMessageText, setNewMessageText] = useState("");
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [newConversationRecipient, setNewConversationRecipient] = useState<number | null>(null);
  const [newConversationMessage, setNewConversationMessage] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const totalUnreadCount = conversations.reduce((sum, convo) => sum + (convo.unread_count || 0), 0);

  useEffect(() => {
    const originalTitle = document.title.replace(/^\(\d+\)\s*/, "");
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
    return () => { document.title = originalTitle; };
  }, [totalUnreadCount]);

  useEffect(() => {
    if (messagesEndRef.current && selectedConversation?.messages) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages]);

  const isDuplicateMessage = useCallback(
    (newMsg: ConversationMessage, existingMessages: ConversationMessage[]) => {
      return existingMessages.some((msg) => {
        if (msg.id === newMsg.id && typeof msg.id === "number" && typeof newMsg.id === "number") return true;
        if (msg.sender_id === newMsg.sender_id && msg.content === newMsg.content) {
          const timeDiff = Math.abs(new Date(msg.created_at).getTime() - new Date(newMsg.created_at).getTime());
          return timeDiff < 5000;
        }
        return false;
      });
    },
    []
  );

  useEffect(() => {
    if (isInitialLoad) {
      appDispatch(fetchConversations());
      appDispatch(fetchContacts());
      setIsInitialLoad(false);
    }

    const socket = connectSocket();
    if (socket) {
      setIsConnected(true);
      socket.on("connect", () => setIsConnected(true));
      socket.on("disconnect", () => setIsConnected(false));
      socket.on("new_message", (newMessage: IncomingMessage) => {
        dispatch(updateConversationPreview({
          conversation_id: newMessage.conversation_id,
          last_message_preview: newMessage.content,
          last_message_timestamp: newMessage.created_at,
          sender_id: newMessage.sender_id,
          sender_name: newMessage.sender_name,
          sender_role: newMessage.sender_role,
          current_user_id: currentUser?.id,
        }));

        if (newMessage.conversation_id !== selectedConversation?.id) {
          if (newMessage.sender_id !== currentUser?.id && "Notification" in window && Notification.permission === "granted") {
            new Notification(`New from ${newMessage.sender_name}`, { body: newMessage.content.substring(0, 50) });
          }
          return;
        }

        const msgToAdd: ConversationMessage = {
          id: newMessage.id,
          sender_id: newMessage.sender_id,
          sender_name: newMessage.sender_name,
          content: newMessage.content,
          created_at: newMessage.created_at,
        };

        if (selectedConversation && !isDuplicateMessage(msgToAdd, selectedConversation.messages)) {
          dispatch(updateDetail({ ...selectedConversation, messages: [...selectedConversation.messages, msgToAdd] }));
        }
      });
    }
    return () => {
      if (socket) {
        socket.off("connect"); socket.off("disconnect"); socket.off("new_message");
      }
    };
  }, [appDispatch, dispatch, selectedConversation, isInitialLoad, currentUser?.id, isDuplicateMessage]);

  const handleSelectConversation = (convo: ConversationPreview) => {
    dispatch(setActiveConversation(convo.conversation_id));
    appDispatch(fetchConversationDetail(convo.conversation_id));
  };

  const handleSendChatMessage = async () => {
    if (!newMessageText.trim() || !selectedConversation) return;
    const content = newMessageText.trim();
    setNewMessageText("");
    try {
      await sendMessage(selectedConversation.id, content);
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const handleStartNewConversation = async () => {
    if (!newConversationRecipient || !newConversationMessage.trim()) return;
    try {
      const res = await privateApi.post("/messaging/conversations", { recipient_user_id: newConversationRecipient });
      const convId = res.data.conversation_id;
      await sendMessage(convId, newConversationMessage.trim());
      appDispatch(fetchConversations());
      setIsComposeOpen(false);
      setNewConversationRecipient(null);
      setNewConversationMessage("");
      appDispatch(fetchConversationDetail(convId));
    } catch (err) {
      toast.error("Failed to start conversation");
    }
  };

  const handleBlockAction = (userId: number, isBlocked: boolean) => {
    appDispatch(blockUnblockUser({ userId, action: isBlocked ? 'unblock' : 'block' }));
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "Doctor": return "bg-blue-100 text-blue-800";
      case "Patient": return "bg-green-100 text-green-800";
      case "Hospital_Admin": return "bg-purple-100 text-purple-800";
      case "Receptionist": return "bg-orange-100 text-orange-800";
      case "Lab_Technician": return "bg-pink-100 text-pink-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getInitials = (n = "") => n.split(" ").map(i => i[0]).join("").toUpperCase() || "U";
  const formatTime = (t: string) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

  const activeRecipient = selectedConversation?.participants.find(p => p.user_id !== currentUser?.id);
  const isRecipientBlocked = contacts.find(c => c.user_id === activeRecipient?.user_id)?.is_blocked;

  const filteredConversations = conversations.filter(c =>
    c.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.last_message_preview.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[82vh] bg-white flex flex-col rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isConnected ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              Secure Messaging
              {totalUnreadCount > 0 && <Badge variant="destructive" className="rounded-full h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">{totalUnreadCount}</Badge>}
            </h1>
            <p className="text-[11px] text-gray-500 flex items-center gap-1">
              <Circle className={`h-2 w-2 fill-current ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
              {isConnected ? 'HIPAA Complaint • Encrypted' : 'Connection Lost'}
            </p>
          </div>
        </div>
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <Button onClick={() => setIsComposeOpen(true)} className="bg-slate-900 hover:bg-slate-800 text-white"><Plus className="h-4 w-4 mr-2" /> New Chat</Button>
          <DialogContent>
            <DialogHeader><DialogTitle>New Secure Chat</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Recipient</Label>
                <div className="max-h-[200px] overflow-y-auto space-y-2">
                  {contacts.map(c => (
                    <div key={c.user_id} onClick={() => setNewConversationRecipient(c.user_id)} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer ${newConversationRecipient === c.user_id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{getInitials(c.first_name + " " + c.last_name)}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-medium">{c.first_name} {c.last_name}</p>
                          <Badge className={`text-[9px] h-3.5 ${getRoleBadgeColor(c.role)}`}>{c.role}</Badge>
                        </div>
                      </div>
                      {newConversationRecipient === c.user_id && <Circle className="h-3 w-3 fill-blue-500 text-blue-500" />}
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Initial Message</Label>
                <Textarea placeholder="Type message..." value={newConversationMessage} onChange={e => setNewConversationMessage(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
              <Button className="bg-blue-600" disabled={!newConversationRecipient || !newConversationMessage.trim()} onClick={handleStartNewConversation}>Start Chat</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Inbox Sidebar */}
        <div className={`w-full lg:w-[320px] border-r flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4"><Input placeholder="Search chats..." className="bg-gray-50 border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="flex-1 overflow-y-auto">
            {listLoading ? <div className="p-8 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-gray-300" /></div> :
              filteredConversations.map(c => (
                <div key={c.conversation_id} onClick={() => handleSelectConversation(c)} className={`p-4 border-b cursor-pointer hover:bg-gray-50 flex gap-3 ${activeConversationId === c.conversation_id ? 'bg-blue-50' : ''}`}>
                  <div className="relative">
                    <Avatar className="h-11 w-11"><AvatarFallback>{getInitials(c.receiver_name)}</AvatarFallback></Avatar>
                    {c.unread_count > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white">{c.unread_count}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className="text-sm font-semibold truncate">{c.receiver_name}</h4>
                      <span className="text-[10px] text-gray-400">{formatTime(c.last_message_timestamp)}</span>
                    </div>
                    <Badge className={`text-[9px] h-3.5 mb-1 ${getRoleBadgeColor(c.receiver_role)}`}>{c.receiver_role}</Badge>
                    <p className="text-xs text-gray-400 truncate">{c.last_message_preview}</p>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Chat Main */}
        <div className={`flex-1 flex flex-col bg-slate-50/50 ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
          {selectedConversation ? (
            <>
              <div className="px-6 py-3 border-b bg-white flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => dispatch(resetDetail())}><ArrowLeft className="h-5 w-5" /></Button>
                  <Avatar className="h-9 w-9"><AvatarFallback>{getInitials(activeRecipient?.first_name + " " + activeRecipient?.last_name)}</AvatarFallback></Avatar>
                  <div>
                    <h3 className="text-sm font-bold">{activeRecipient?.first_name} {activeRecipient?.last_name}</h3>
                    <Badge className={`text-[9px] h-3.5 ${getRoleBadgeColor(activeRecipient?.role || "")}`}>{activeRecipient?.role}</Badge>
                  </div>
                </div>
                {activeRecipient && (
                  <Button variant="ghost" size="sm" onClick={() => handleBlockAction(activeRecipient.user_id, isRecipientBlocked || false)} className={isRecipientBlocked ? "text-green-600" : "text-red-500"}>
                    {isRecipientBlocked ? <><UserCheck className="h-4 w-4 mr-2" /> Unblock</> : <><UserMinus className="h-4 w-4 mr-2" /> Block</>}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedConversation.messages.map(m => {
                  const isMe = m.sender_id === currentUser?.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border rounded-tl-none shadow-sm'}`}>
                        {m.content}
                      </div>
                      <span className="text-[9px] text-gray-400 mt-1">{formatTime(m.created_at)}</span>
                    </div>
                  );
                })}
                {isRecipientBlocked && (
                  <div className="flex justify-center"><Badge variant="outline" className="bg-red-50 text-red-600 border-red-100 py-2 px-4 rounded-full gap-2"><Info className="h-3 w-3" /> User is blocked</Badge></div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 bg-white border-t">
                <div className="flex gap-2 max-w-4xl mx-auto">
                  <Textarea placeholder={isRecipientBlocked ? "Unblock to send" : "Type message..."} className="min-h-[44px] max-h-[100px] resize-none border-none bg-gray-50 focus-visible:ring-1" value={newMessageText} onChange={e => setNewMessageText(e.target.value)} disabled={isRecipientBlocked} />
                  <Button className="h-11 w-11 rounded-xl bg-blue-600 shadow-lg" size="icon" onClick={handleSendChatMessage} disabled={!newMessageText.trim() || isRecipientBlocked}><Send className="h-5 w-5" /></Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
              <h3 className="text-lg font-bold text-gray-600">Secure Inbox</h3>
              <p className="text-sm max-w-xs">Select a contact to view your encrypted conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
