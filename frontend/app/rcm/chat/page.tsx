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
    Smile,
    Wallet
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

export default function RCMChat() {
    const dispatch = useDispatch();
    const appDispatch = useDispatch<AppDispatch>();
    const {
        list: conversations,
        detail: selectedConversation,
        contacts,
        listLoading,
        detailLoading,
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
        <div className="h-[80vh] bg-slate-900 flex flex-col rounded-2xl border border-slate-800 shadow-2xl overflow-hidden m-4">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                        <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white flex items-center gap-2">
                            Billing Support Lane
                            {conversations.reduce((s, c) => s + (c.unread_count || 0), 0) > 0 && <Badge className="bg-emerald-500 hover:bg-emerald-600 text-[10px] rounded-full px-2">Live</Badge>}
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase flex items-center gap-1.5">
                            <Circle className={`h-1.5 w-1.5 fill-current ${isConnected ? 'text-emerald-500' : 'text-rose-500'}`} />
                            {isConnected ? 'Signal Encryption Optimal' : 'Signal Degraded'}
                        </p>
                    </div>
                </div>
                <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-900/20">
                            <Plus className="h-4 w-4 mr-2" /> New Memo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900 border-slate-800 text-white">
                        <DialogHeader><DialogTitle>Administrative Link</DialogTitle></DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-slate-400">Recipient Contact</Label>
                                <div className="max-h-[200px] overflow-y-auto space-y-2">
                                    {contacts.map(c => (
                                        <div key={c.user_id} onClick={() => setNewConversationRecipient(c.user_id)} className={`flex items-center justify-between p-3 rounded-xl border border-slate-800 cursor-pointer transition-all ${newConversationRecipient === c.user_id ? 'border-emerald-500 bg-emerald-500/10' : 'hover:bg-slate-800/50'}`}>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border-slate-700"><AvatarFallback className="text-xs bg-slate-800 text-slate-300">{getInitials(c.first_name + " " + c.last_name)}</AvatarFallback></Avatar>
                                                <div>
                                                    <p className="text-sm font-bold">{c.first_name} {c.last_name}</p>
                                                    <Badge className={`text-[9px] h-3.5 ${getRoleBadgeColor(c.role)}`}>{c.role}</Badge>
                                                </div>
                                            </div>
                                            {newConversationRecipient === c.user_id && <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-400">Memo Content</Label>
                                <Textarea placeholder="Details regarding claim / payment..." value={newConversationMessage} onChange={e => setNewConversationMessage(e.target.value)} rows={3} className="bg-slate-800 border-slate-700" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsComposeOpen(false)} className="text-slate-400">Cancel</Button>
                            <Button className="bg-emerald-600 hover:bg-emerald-500" disabled={!newConversationRecipient || !newConversationMessage.trim()} onClick={handleStartNewConversation}>Dispatch</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className={`w-full lg:w-[320px] border-r border-slate-800 flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-4"><Input placeholder="Search archives..." className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
                        {filteredConversations.map(c => (
                            <div key={c.conversation_id} onClick={() => handleSelectConversation(c)} className={`p-4 cursor-pointer transition-all flex gap-3 ${activeConversationId === c.conversation_id ? 'bg-emerald-500/5 border-l-2 border-emerald-500' : 'hover:bg-slate-800/30'}`}>
                                <div className="relative">
                                    <Avatar className="h-11 w-11 border-slate-800 shadow-xl"><AvatarFallback className="font-bold text-slate-300 bg-slate-800">{getInitials(c.receiver_name)}</AvatarFallback></Avatar>
                                    {c.unread_count > 0 && <span className="absolute -top-1 -right-1 bg-emerald-500 text-black text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900">{c.unread_count}</span>}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-center mb-0.5">
                                        <h4 className="text-sm font-bold truncate text-slate-100">{c.receiver_name}</h4>
                                        <span className="text-[10px] text-slate-500 font-bold">{formatTime(c.last_message_timestamp)}</span>
                                    </div>
                                    <Badge className={`text-[9px] h-3.5 mb-1 ${getRoleBadgeColor(c.receiver_role)}`}>{c.receiver_role}</Badge>
                                    <p className="text-xs text-slate-500 truncate">{c.last_message_preview}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chat Main */}
                <div className={`flex-1 flex flex-col bg-[#0b0e14] ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
                    {selectedConversation ? (
                        <>
                            <div className="px-6 py-3 border-b border-slate-800/50 flex items-center justify-between bg-slate-900/20">
                                <div className="flex items-center gap-3">
                                    <Button variant="ghost" size="icon" className="lg:hidden text-slate-400" onClick={() => dispatch(resetDetail())}><ArrowLeft className="h-5 w-5" /></Button>
                                    <Avatar className="h-9 w-9 border-slate-800"><AvatarFallback className="font-bold bg-slate-800 text-slate-300">{getInitials(activeRecipient?.first_name + " " + activeRecipient?.last_name)}</AvatarFallback></Avatar>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-100">{activeRecipient?.first_name} {activeRecipient?.last_name}</h3>
                                        <Badge className={`text-[9px] h-3.5 ${getRoleBadgeColor(activeRecipient?.role || "")}`}>{activeRecipient?.role}</Badge>
                                    </div>
                                </div>
                                {activeRecipient && (
                                    <Button variant="ghost" size="sm" onClick={() => handleBlockAction(activeRecipient.user_id, isRecipientBlocked || false)} className={`text-[11px] font-bold ${isRecipientBlocked ? "text-emerald-500 hover:bg-emerald-500/10" : "text-rose-500 hover:bg-rose-500/10"}`}>
                                        {isRecipientBlocked ? 'Unrestrict Channel' : 'Restrict Channel'}
                                    </Button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                {selectedConversation.messages.map(m => {
                                    const isMe = m.sender_id === currentUser?.id;
                                    return (
                                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[13px] shadow-2xl leading-relaxed ${isMe ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700/50'}`}>
                                                {m.content}
                                            </div>
                                            <span className="text-[9px] text-slate-500 mt-2 font-black uppercase tracking-widest">{formatTime(m.created_at)}</span>
                                        </div>
                                    );
                                })}
                                {isRecipientBlocked && (
                                    <div className="flex justify-center"><Badge variant="outline" className="bg-rose-500/5 text-rose-500 border-rose-500/20 py-2 px-6 rounded-2xl gap-2 font-bold text-[11px]"><Info className="h-4 w-4" /> CHANNEL RESTRICTED BY ADMIN</Badge></div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-5 bg-slate-900 border-t border-slate-800">
                                <div className="flex gap-3 max-w-4xl mx-auto items-end">
                                    <div className="flex-1 relative">
                                        <Textarea placeholder={isRecipientBlocked ? "Review restrictions..." : "Type formal memo..."} className="min-h-[48px] max-h-[120px] resize-none border-slate-700 bg-slate-800 text-white text-sm focus-visible:ring-emerald-500/50" value={newMessageText} onChange={e => setNewMessageText(e.target.value)} disabled={isRecipientBlocked} />
                                    </div>
                                    <Button className="h-12 w-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow-2xl shadow-emerald-500/20 transition-all hover:scale-105" size="icon" onClick={handleSendChatMessage} disabled={!newMessageText.trim() || isRecipientBlocked}><Send className="h-5 w-5" /></Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
                            <div className="w-20 h-20 bg-slate-800/30 rounded-3xl flex items-center justify-center mb-6 border border-slate-800 shadow-inner">
                                <Shield className="h-10 w-10 text-slate-700" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-300">RCM Billing Gateway</h3>
                            <p className="text-slate-500 text-sm max-w-xs mt-2 italic">Select an authorized clinical contact to discuss secure financial or administrative matters.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
