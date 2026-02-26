"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { sendMessage } from "@/app/_apis/common/chat";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
    UserMinus,
    UserCheck,
    Info,
    Smile
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
} from "../../../store/slices/chat";
import { AppDispatch, RootState } from "@/store/store";
import { connectSocket } from "@/lib/socket";
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

                if (newMessage.conversation_id === selectedConversation?.id) {
                    const msgToAdd: ConversationMessage = {
                        id: newMessage.id,
                        sender_id: newMessage.sender_id,
                        sender_name: newMessage.sender_name,
                        content: newMessage.content,
                        created_at: newMessage.created_at,
                    };
                    dispatch(updateDetail({ ...selectedConversation, messages: [...selectedConversation.messages, msgToAdd] }));
                }
            });
        }
        return () => { if (socket) { socket.off("connect"); socket.off("disconnect"); socket.off("new_message"); } };
    }, [appDispatch, dispatch, selectedConversation, isInitialLoad, currentUser?.id]);

    useEffect(() => {
        if (messagesEndRef.current && selectedConversation?.messages) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [selectedConversation?.messages]);

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
        <div className="h-[82vh] bg-white flex flex-col rounded-xl border shadow-sm overflow-hidden m-4">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isConnected ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
                        <Shield className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-900">
                            Admin Gateway
                            {totalUnreadCount > 0 && <Badge variant="destructive" className="rounded-full h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">{totalUnreadCount}</Badge>}
                        </h1>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1">
                            <Circle className={`h-2 w-2 fill-current ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
                            {isConnected ? 'Fully Encrypted Signal' : 'Connection Interrupted'}
                        </p>
                    </div>
                </div>
                <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-900 hover:bg-indigo-800 text-white shadow-lg shadow-indigo-100">
                            <Plus className="h-4 w-4 mr-2" /> Direct Message
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Secure Staff Communication</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Recipient</Label>
                                <div className="max-h-[220px] overflow-y-auto space-y-2 p-1">
                                    {contacts.map(c => (
                                        <div key={c.user_id} onClick={() => setNewConversationRecipient(c.user_id)} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${newConversationRecipient === c.user_id ? 'border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50'}`}>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border"><AvatarFallback className="text-sm bg-gray-100">{getInitials(c.first_name + " " + c.last_name)}</AvatarFallback></Avatar>
                                                <div>
                                                    <p className="text-sm font-semibold">{c.first_name} {c.last_name}</p>
                                                    <Badge className={`text-[9px] h-3.5 ${getRoleBadgeColor(c.role)}`}>{c.role}</Badge>
                                                </div>
                                            </div>
                                            {newConversationRecipient === c.user_id && <Circle className="h-3.5 w-3.5 fill-indigo-600 text-indigo-600" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Instructions / Message</Label>
                                <Textarea placeholder="Type message..." value={newConversationMessage} onChange={e => setNewConversationMessage(e.target.value)} rows={3} className="resize-none" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700" disabled={!newConversationRecipient || !newConversationMessage.trim()} onClick={handleStartNewConversation}>Launch Chat</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Inbox */}
                <div className={`w-full lg:w-[340px] border-r flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4 bg-gray-50/50"><Input placeholder="Filter by name..." className="bg-white border-gray-200" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <div className="flex-1 overflow-y-auto divide-y">
                        {listLoading ? <div className="p-12 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-200" /></div> :
                            filteredConversations.map(c => (
                                <div key={c.conversation_id} onClick={() => handleSelectConversation(c)} className={`p-4 cursor-pointer hover:bg-gray-50 flex gap-4 transition-colors ${activeConversationId === c.conversation_id ? 'bg-indigo-50/50 border-l-4 border-indigo-600' : 'pl-[19px]'}`}>
                                    <div className="relative">
                                        <Avatar className="h-12 w-12 shadow-sm border"><AvatarFallback className="font-bold text-indigo-700 bg-indigo-50">{getInitials(c.receiver_name)}</AvatarFallback></Avatar>
                                        {c.unread_count > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">{c.unread_count}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className="text-sm font-bold truncate text-gray-900">{c.receiver_name}</h4>
                                            <span className="text-[10px] text-gray-400 font-medium">{formatTime(c.last_message_timestamp)}</span>
                                        </div>
                                        <Badge className={`text-[9px] h-4 mb-2 ${getRoleBadgeColor(c.receiver_role)}`}>{c.receiver_role}</Badge>
                                        <p className="text-xs text-gray-500 truncate italic">"{c.last_message_preview}"</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* Chat Canvas */}
                <div className={`flex-1 flex flex-col bg-slate-50/30 ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
                    {selectedConversation ? (
                        <>
                            <div className="px-6 py-4 bg-white/60 backdrop-blur-sm border-b flex items-center justify-between sticky top-0 z-10 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => dispatch(resetDetail())}><ArrowLeft className="h-5 w-5" /></Button>
                                    <Avatar className="h-10 w-10 border shadow-sm ring-2 ring-indigo-50"><AvatarFallback className="font-bold bg-white text-indigo-600">{getInitials(activeRecipient?.first_name + " " + activeRecipient?.last_name)}</AvatarFallback></Avatar>
                                    <div>
                                        <h3 className="text-sm font-bold text-indigo-950">{activeRecipient?.first_name} {activeRecipient?.last_name}</h3>
                                        <Badge className={`text-[9px] h-4 ${getRoleBadgeColor(activeRecipient?.role || "")}`}>{activeRecipient?.role}</Badge>
                                    </div>
                                </div>
                                {activeRecipient && (
                                    <Button variant="ghost" size="sm" onClick={() => handleBlockAction(activeRecipient.user_id, isRecipientBlocked || false)} className={`rounded-full px-4 ${isRecipientBlocked ? "text-emerald-600 hover:bg-emerald-50" : "text-rose-500 hover:bg-rose-50"}`}>
                                        {isRecipientBlocked ? <><UserCheck className="h-4 w-4 mr-2" /> Restore Access</> : <><UserMinus className="h-4 w-4 mr-2" /> Restrict Access</>}
                                    </Button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                                {selectedConversation.messages.map(m => {
                                    const isMe = m.sender_id === currentUser?.id;
                                    return (
                                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[70%] px-5 py-3 rounded-2xl text-sm shadow-sm leading-relaxed ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border text-slate-800 rounded-tl-none font-medium'}`}>
                                                {m.content}
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-2 font-medium tracking-wide px-1 uppercase">{formatTime(m.created_at)}</span>
                                        </div>
                                    );
                                })}
                                {isRecipientBlocked && (
                                    <div className="flex justify-center p-4">
                                        <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 py-2.5 px-6 rounded-2xl gap-3 shadow-sm">
                                            <Info className="h-4 w-4" />
                                            Security Restriction: Messaging disabled for this channel.
                                        </Badge>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-5 bg-white border-t">
                                <div className="flex gap-3 max-w-5xl mx-auto items-end">
                                    <div className="flex-1 relative">
                                        <Textarea
                                            placeholder={isRecipientBlocked ? "Review restrictions to reply..." : "Broadcast message..."}
                                            className={`min-h-[48px] max-h-[140px] resize-none border-none bg-slate-50 focus-visible:ring-indigo-500 rounded-xl px-4 py-3 text-sm ${isRecipientBlocked ? 'opacity-50' : ''}`}
                                            value={newMessageText}
                                            onChange={e => setNewMessageText(e.target.value)}
                                            disabled={isRecipientBlocked}
                                        />
                                        <Smile className="h-5 w-5 absolute right-3 bottom-3 text-slate-300 hover:text-indigo-400 cursor-pointer" />
                                    </div>
                                    <Button
                                        className="h-12 w-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95"
                                        size="icon"
                                        onClick={handleSendChatMessage}
                                        disabled={!newMessageText.trim() || isRecipientBlocked}
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
                            <div className="w-24 h-24 bg-indigo-50 rounded-[2rem] flex items-center justify-center mb-8 rotate-3 shadow-inner">
                                <MessageSquare className="h-12 w-12 text-indigo-300 -rotate-3" />
                            </div>
                            <h3 className="text-2xl font-black text-indigo-950 mb-3">Staff Communications</h3>
                            <p className="text-slate-400 text-sm max-w-[280px] leading-relaxed">Encrypted direct line to hospital staff and clinical departments.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
