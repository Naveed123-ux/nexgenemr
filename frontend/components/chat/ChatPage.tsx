"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Search,
    Plus,
    Send,
    MessageSquareDashed,
    Shield,
    Loader2,
    ArrowLeft,
    UserMinus,
    UserCheck,
    CheckCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    fetchConversations,
    fetchConversationDetail,
    fetchContacts,
    blockUnblockUser,
    resetDetail,
    ConversationPreview,
    ConversationMessage,
    updateDetail,
    updateConversationPreview,
    setActiveConversation,
    setOnlineUsers,
    setUserOnline,
    setUserOffline,
    Contact,
} from "@/store/slices/chat";
import { AppDispatch, RootState } from "@/store/store";
import { connectSocket } from "@/lib/socket";
import { privateApi } from "@/lib/axios";
import { sendMessage } from "@/app/_apis/common/chat";

interface IncomingMessage {
    id: number;
    conversation_id: number;
    content: string;
    sender_id: number;
    sender_name: string;
    sender_role?: string;
    created_at: string;
}

// Which roles can block which
function canBlock(myRole: string, theirRole: string): boolean {
    if (myRole === "Super_Admin") return true; // can block anyone
    if (myRole === "Hospital_Admin" && theirRole !== "Super_Admin") return true;
    if (myRole === "Doctor" && theirRole === "Patient") return true;
    return false;
}

const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    Super_Admin: { label: "Super Admin", color: "text-violet-700", bg: "bg-violet-100", dot: "bg-violet-500" },
    Hospital_Admin: { label: "Hospital Admin", color: "text-indigo-700", bg: "bg-indigo-100", dot: "bg-indigo-500" },
    Doctor: { label: "Doctor", color: "text-sky-700", bg: "bg-sky-100", dot: "bg-sky-500" },
    Lab_Technician: { label: "Lab Tech", color: "text-pink-700", bg: "bg-pink-100", dot: "bg-pink-500" },
    Receptionist: { label: "Receptionist", color: "text-amber-700", bg: "bg-amber-100", dot: "bg-amber-500" },
    Staff: { label: "Staff", color: "text-teal-700", bg: "bg-teal-100", dot: "bg-teal-500" },
    Patient: { label: "Patient", color: "text-emerald-700", bg: "bg-emerald-100", dot: "bg-emerald-500" },
};

const getRoleConf = (role: string) => ROLE_CONFIG[role] || { label: role, color: "text-gray-700", bg: "bg-gray-100", dot: "bg-gray-400" };

const getInitials = (name = "") =>
    name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";

const formatTime = (t?: string) => {
    if (!t) return "";
    const d = new Date(t);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    return isToday
        ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const formatMsgTime = (t?: string) => {
    if (!t) return "";
    return new Date(t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ChatPage() {
    const dispatch = useDispatch();
    const appDispatch = useDispatch<AppDispatch>();

    const {
        list: conversations,
        detail: selectedConversation,
        contacts,
        listLoading,
        detailLoading,
        activeConversationId,
        onlineUserIds,
    } = useSelector((state: RootState) => state.allChat);

    const currentUser = useSelector((state: RootState) => state.auth);

    const [isConnected, setIsConnected] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [newMessageText, setNewMessageText] = useState("");
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [contactSearch, setContactSearch] = useState("");
    const [selectedRecipient, setSelectedRecipient] = useState<Contact | null>(null);
    const [newConversationMessage, setNewConversationMessage] = useState("");
    const [sending, setSending] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // --- Initial Load + Socket ---
    useEffect(() => {
        appDispatch(fetchConversations());
        appDispatch(fetchContacts());
    }, [appDispatch]);

    useEffect(() => {
        const socket = connectSocket();
        if (!socket) return;

        setIsConnected(socket.connected);

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        const onOnlineUsers = (data: { user_ids: number[] }) => {
            dispatch(setOnlineUsers(data.user_ids));
        };
        const onUserOnline = (data: { user_id: number }) => {
            dispatch(setUserOnline(data.user_id));
        };
        const onUserOffline = (data: { user_id: number }) => {
            dispatch(setUserOffline(data.user_id));
        };

        const onNewMessage = (msg: IncomingMessage) => {
            dispatch(updateConversationPreview({
                conversation_id: msg.conversation_id,
                last_message_preview: msg.content,
                last_message_timestamp: msg.created_at,
                sender_id: msg.sender_id,
                sender_name: msg.sender_name,
                sender_role: msg.sender_role,
                current_user_id: currentUser?.id,
            }));
            if (msg.conversation_id === selectedConversation?.id) {
                const msgToAdd: ConversationMessage = {
                    id: msg.id,
                    sender_id: msg.sender_id,
                    sender_name: msg.sender_name,
                    content: msg.content,
                    created_at: msg.created_at,
                };
                dispatch(updateDetail({ ...selectedConversation, messages: [...selectedConversation.messages, msgToAdd] }));
            }
        };

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);
        socket.on("online_users", onOnlineUsers);
        socket.on("user_online", onUserOnline);
        socket.on("user_offline", onUserOffline);
        socket.on("new_message", onNewMessage);

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
            socket.off("online_users", onOnlineUsers);
            socket.off("user_online", onUserOnline);
            socket.off("user_offline", onUserOffline);
            socket.off("new_message", onNewMessage);
        };
    }, [dispatch, selectedConversation, currentUser?.id]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [selectedConversation?.messages]);

    const handleSelectConversation = (convo: ConversationPreview) => {
        dispatch(setActiveConversation(convo.conversation_id));
        appDispatch(fetchConversationDetail(convo.conversation_id));
    };

    const handleSend = async () => {
        if (!newMessageText.trim() || !selectedConversation || sending) return;
        const content = newMessageText.trim();
        setNewMessageText("");
        setSending(true);
        try {
            await sendMessage(selectedConversation.id, content);
        } catch {
            toast.error("Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleStartConversation = async () => {
        if (!selectedRecipient || !newConversationMessage.trim()) return;
        setSending(true);
        try {
            const res = await privateApi.post("/messaging/conversations", { recipient_user_id: selectedRecipient.user_id });
            const convId = res.data.conversation_id;
            await sendMessage(convId, newConversationMessage.trim());
            appDispatch(fetchConversations());
            setIsComposeOpen(false);
            setSelectedRecipient(null);
            setNewConversationMessage("");
            setContactSearch("");
            dispatch(setActiveConversation(convId));
            appDispatch(fetchConversationDetail(convId));
        } catch (err: any) {
            toast.error(err?.response?.data?.detail || "Failed to start conversation");
        } finally {
            setSending(false);
        }
    };

    const handleBlockAction = (userId: number, isBlocked: boolean) => {
        appDispatch(blockUnblockUser({ userId, action: isBlocked ? "unblock" : "block" }));
    };

    // Derived state
    const activeRecipient = selectedConversation?.participants.find((p) => p.user_id !== currentUser?.id);
    const recipientContact = contacts.find((c) => c.user_id === activeRecipient?.user_id);
    const isRecipientBlocked = recipientContact?.is_blocked ?? false;
    const isRecipientOnline = activeRecipient ? onlineUserIds.includes(activeRecipient.user_id) : false;
    const myRole = currentUser?.role ?? "";
    const canBlockRecipient = activeRecipient
        ? canBlock(myRole, activeRecipient.role)
        : false;

    const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

    const filteredConversations = conversations.filter(
        (c) =>
            c.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.last_message_preview || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredContacts = contacts.filter((c) => {
        const name = `${c.first_name} ${c.last_name}`.toLowerCase();
        const role = c.role.toLowerCase();
        const query = contactSearch.toLowerCase();
        return name.includes(query) || role.includes(query);
    });

    const alreadyChattedIds = new Set(conversations.map((c) => c.receiver_id));

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-slate-50 rounded-2xl overflow-hidden border border-slate-200 shadow-xl">
            {/* ── LEFT SIDEBAR ── */}
            <div className={`flex flex-col w-full lg:w-[340px] bg-white border-r border-slate-100 shrink-0 ${selectedConversation ? "hidden lg:flex" : "flex"}`}>
                {/* Sidebar Header */}
                <div className="px-5 pt-6 pb-4 border-b border-slate-50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl font-bold text-slate-900">Messages</h1>
                            {totalUnread > 0 && (
                                <span className="bg-rose-500 text-white text-[11px] font-bold h-5 min-w-5 rounded-full flex items-center justify-center px-1.5 animate-pulse">
                                    {totalUnread}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full transition-colors ${isConnected ? "bg-emerald-400" : "bg-slate-300"}`} />
                            <Button
                                size="icon"
                                className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100 text-white"
                                onClick={() => setIsComposeOpen(true)}
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search conversations..."
                            className="pl-9 bg-slate-50 border-none rounded-xl h-9 text-sm focus-visible:ring-indigo-500/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto py-2">
                    {listLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span className="text-xs font-medium">Loading chats...</span>
                        </div>
                    ) : filteredConversations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                            <MessageSquareDashed className="h-10 w-10 opacity-30" />
                            <p className="text-sm font-medium">No conversations yet</p>
                            <p className="text-xs opacity-60">Start one with the + button</p>
                        </div>
                    ) : (
                        filteredConversations.map((c) => {
                            const isActive = activeConversationId === c.conversation_id;
                            const roleConf = getRoleConf(c.receiver_role);
                            const isOnline = onlineUserIds.includes(c.receiver_id);
                            return (
                                <div
                                    key={c.conversation_id}
                                    onClick={() => handleSelectConversation(c)}
                                    className={`mx-2 mb-0.5 px-4 py-3 rounded-xl cursor-pointer transition-all flex gap-3 ${isActive
                                        ? "bg-indigo-600 shadow-md shadow-indigo-100"
                                        : "hover:bg-slate-50"
                                        }`}
                                >
                                    <div className="relative shrink-0">
                                        <Avatar className="h-11 w-11">
                                            <AvatarFallback className={`text-sm font-bold ${isActive ? "bg-indigo-500 text-white" : "bg-indigo-50 text-indigo-600"}`}>
                                                {getInitials(c.receiver_name)}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 ${isActive ? "border-indigo-600" : "border-white"} ${isOnline ? "bg-emerald-400" : "bg-slate-300"}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-1 mb-0.5">
                                            <span className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-slate-900"}`}>
                                                {c.receiver_name}
                                            </span>
                                            <span className={`text-[10px] shrink-0 ${isActive ? "text-indigo-200" : "text-slate-400"}`}>
                                                {formatTime(c.last_message_timestamp)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${isActive ? "bg-indigo-500 text-white" : `${roleConf.bg} ${roleConf.color}`}`}>
                                                {roleConf.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className={`text-xs truncate flex-1 ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                                                {c.last_message_preview || "No messages yet"}
                                            </p>
                                            {c.unread_count > 0 && !isActive && (
                                                <span className="bg-rose-500 text-white text-[10px] font-bold h-5 min-w-5 rounded-full flex items-center justify-center px-1 ml-1 shrink-0">
                                                    {c.unread_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* ── MAIN CHAT PANEL ── */}
            <div className={`flex-1 flex flex-col min-w-0 ${selectedConversation ? "flex" : "hidden lg:flex"}`}>
                {selectedConversation && activeRecipient ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-5 py-3 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="lg:hidden h-9 w-9 rounded-xl"
                                    onClick={() => dispatch(resetDetail())}
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                                <div className="relative">
                                    <Avatar className="h-10 w-10 border-2 border-slate-100">
                                        <AvatarFallback className="text-sm font-bold bg-indigo-50 text-indigo-600">
                                            {getInitials(`${activeRecipient.first_name} ${activeRecipient.last_name}`)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white ${isRecipientOnline ? "bg-emerald-400" : "bg-slate-300"}`} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        {activeRecipient.first_name} {activeRecipient.last_name}
                                    </h3>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${getRoleConf(activeRecipient.role).bg} ${getRoleConf(activeRecipient.role).color}`}>
                                            {getRoleConf(activeRecipient.role).label}
                                        </span>
                                        <span className={`text-[10px] font-medium ${isRecipientOnline ? "text-emerald-500" : "text-slate-400"}`}>
                                            {isRecipientOnline ? "● Online" : "○ Offline"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                {canBlockRecipient && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleBlockAction(activeRecipient.user_id, isRecipientBlocked)}
                                        className={`rounded-xl h-8 text-xs font-semibold px-3 ${isRecipientBlocked ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-500 hover:bg-rose-50"}`}
                                    >
                                        {isRecipientBlocked ? (
                                            <><UserCheck className="h-3.5 w-3.5 mr-1.5" />Unblock</>
                                        ) : (
                                            <><UserMinus className="h-3.5 w-3.5 mr-1.5" />Block</>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-4 bg-slate-50/60">
                            {detailLoading ? (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="h-7 w-7 animate-spin text-indigo-300" />
                                </div>
                            ) : (
                                selectedConversation.messages.map((m) => {
                                    const isMe = m.sender_id === currentUser?.id;
                                    return (
                                        <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                                            <div className={`group flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                                                <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                                                    ? "bg-indigo-600 text-white rounded-br-sm"
                                                    : "bg-white text-slate-800 rounded-bl-sm border border-slate-100"
                                                    }`}>
                                                    {m.content}
                                                </div>
                                                <span className="text-[10px] text-slate-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {formatMsgTime(m.created_at)}
                                                    {isMe && <CheckCheck className="inline h-3 w-3 ml-1 text-indigo-400" />}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            {isRecipientBlocked && (
                                <div className="flex justify-center">
                                    <div className="bg-rose-50 text-rose-600 border border-rose-100 text-xs font-medium px-4 py-2 rounded-full flex items-center gap-2">
                                        <Shield className="h-3.5 w-3.5" />
                                        Messaging is disabled — you have blocked this user
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Box */}
                        <div className="px-5 py-4 bg-white border-t border-slate-100">
                            <div className={`flex gap-3 items-end rounded-2xl border transition-all ${isRecipientBlocked ? "border-slate-100 bg-slate-50" : "border-slate-200 bg-white focus-within:border-indigo-300 focus-within:shadow-sm focus-within:shadow-indigo-50"}`}>
                                <Textarea
                                    ref={textareaRef}
                                    placeholder={isRecipientBlocked ? "Unblock this user to send messages..." : "Type a message... (Enter to send)"}
                                    className="flex-1 min-h-[44px] max-h-[140px] resize-none border-none bg-transparent focus-visible:ring-0 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300"
                                    value={newMessageText}
                                    onChange={(e) => setNewMessageText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={isRecipientBlocked}
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSend}
                                    disabled={!newMessageText.trim() || isRecipientBlocked || sending}
                                    className={`h-10 w-10 rounded-xl shrink-0 mb-1.5 mr-1.5 transition-all ${newMessageText.trim() && !isRecipientBlocked
                                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"
                                        : "bg-slate-100 text-slate-300"
                                        }`}
                                >
                                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    </>
                ) : (
                    /* Empty state */
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
                        <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                            <MessageSquareDashed className="h-10 w-10 text-indigo-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Your Messages</h3>
                        <p className="text-sm text-slate-400 max-w-xs mb-6">
                            Select a conversation or start a new one with a colleague, patient, or administrator.
                        </p>
                        <Button
                            onClick={() => setIsComposeOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 h-10 text-sm font-semibold shadow-md shadow-indigo-100"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            New Message
                        </Button>
                    </div>
                )}
            </div>

            {/* ── COMPOSE DIALOG ── */}
            <Dialog open={isComposeOpen} onOpenChange={(open) => {
                setIsComposeOpen(open);
                if (!open) { setSelectedRecipient(null); setContactSearch(""); setNewConversationMessage(""); }
            }}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl p-0 overflow-hidden shadow-2xl">
                    <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100">
                        <DialogTitle className="text-lg font-bold text-slate-900">New Message</DialogTitle>
                    </DialogHeader>

                    <div className="px-6 py-4 space-y-4">
                        {/* Contact search */}
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">To</label>
                            {selectedRecipient ? (
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                                    <Avatar className="h-9 w-9">
                                        <AvatarFallback className="text-sm font-bold bg-indigo-100 text-indigo-600">
                                            {getInitials(`${selectedRecipient.first_name} ${selectedRecipient.last_name}`)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-900">{selectedRecipient.first_name} {selectedRecipient.last_name}</p>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${getRoleConf(selectedRecipient.role).bg} ${getRoleConf(selectedRecipient.role).color}`}>
                                            {getRoleConf(selectedRecipient.role).label}
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-7 text-slate-400 hover:text-slate-600" onClick={() => setSelectedRecipient(null)}>
                                        ✕
                                    </Button>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <div className="relative border-b border-slate-100">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or role..."
                                            value={contactSearch}
                                            onChange={(e) => setContactSearch(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 text-sm outline-none bg-transparent text-slate-700 placeholder:text-slate-400"
                                        />
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {filteredContacts.length === 0 ? (
                                            <div className="py-6 text-center text-sm text-slate-400">No contacts found</div>
                                        ) : (
                                            filteredContacts.map((c) => {
                                                const rc = getRoleConf(c.role);
                                                const isOnline = onlineUserIds.includes(c.user_id);
                                                const hasChat = alreadyChattedIds.has(c.user_id);
                                                return (
                                                    <div
                                                        key={c.user_id}
                                                        onClick={() => setSelectedRecipient(c)}
                                                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div className="relative">
                                                            <Avatar className="h-8 w-8">
                                                                <AvatarFallback className={`text-xs font-bold ${rc.bg} ${rc.color}`}>
                                                                    {getInitials(`${c.first_name} ${c.last_name}`)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <span className={`absolute bottom-0 right-0 h-2 w-2 rounded-full border border-white ${isOnline ? "bg-emerald-400" : "bg-slate-300"}`} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-semibold text-slate-900 truncate">{c.first_name} {c.last_name}</p>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${rc.bg} ${rc.color}`}>
                                                                {rc.label}
                                                            </span>
                                                            {hasChat && (
                                                                <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Active</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Message */}
                        {selectedRecipient && (
                            <div>
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Message</label>
                                <Textarea
                                    placeholder="Type your message..."
                                    value={newConversationMessage}
                                    onChange={(e) => setNewConversationMessage(e.target.value)}
                                    rows={3}
                                    className="resize-none rounded-xl border-slate-200 text-sm focus-visible:ring-indigo-400"
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter className="px-6 pb-6 gap-2">
                        <Button variant="outline" className="rounded-xl" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 shadow-md shadow-indigo-100"
                            disabled={!selectedRecipient || !newConversationMessage.trim() || sending}
                            onClick={handleStartConversation}
                        >
                            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Send
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
