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
    AlertCircle,
    Smile,
    Info
} from "lucide-react";
import toast from "react-hot-toast";
import {
    fetchConversations,
    fetchConversationDetail,
    fetchContacts,
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

    const getInitials = (n = "") => n.split(" ").map(i => i[0]).join("").toUpperCase() || "U";
    const formatTime = (t: string) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

    const activeRecipient = selectedConversation?.participants.find(p => p.user_id !== currentUser?.id);

    const filteredConversations = conversations.filter(c =>
        c.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.last_message_preview.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-[80vh] bg-sky-50/30 flex flex-col rounded-2xl border border-sky-100 shadow-sm overflow-hidden m-4">
            {/* Patient Header */}
            <div className="px-6 py-5 border-b bg-white flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-2xl ${isConnected ? 'bg-sky-50 text-sky-600' : 'bg-red-50 text-red-600'}`}>
                        <MessageSquare className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            My Doctor Connect
                            {totalUnreadCount > 0 && <Badge variant="destructive" className="rounded-full h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-sky-500">{totalUnreadCount}</Badge>}
                        </h1>
                        <p className="text-[11px] text-slate-500 font-medium tracking-wide">
                            {isConnected ? 'ENCRYPTED • HIPAA SECURE CHANNEL' : 'OFFLINE MODE'}
                        </p>
                    </div>
                </div>
                <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-6 font-semibold shadow-md shadow-sky-100">
                            <Plus className="h-4 w-4 mr-2" /> Message Doctor
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px] rounded-3xl">
                        <DialogHeader><DialogTitle className="text-slate-900 font-bold">New Consultation Chat</DialogTitle></DialogHeader>
                        <div className="space-y-5 py-6">
                            <div className="space-y-3">
                                <Label className="text-slate-600 font-semibold ml-1">Select Your Doctor</Label>
                                <div className="max-h-[220px] overflow-y-auto space-y-3 p-1">
                                    {contacts.length === 0 ? (
                                        <div className="bg-slate-50 border border-dashed rounded-2xl p-8 text-center">
                                            <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                            <p className="text-sm text-slate-500 font-medium">You can only message doctors you have previously visited.</p>
                                        </div>
                                    ) : (
                                        contacts.map(c => (
                                            <div
                                                key={c.user_id}
                                                onClick={() => setNewConversationRecipient(c.user_id)}
                                                className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${newConversationRecipient === c.user_id ? 'border-sky-500 bg-sky-50 shadow-sm' : 'border-slate-100 hover:bg-slate-50'}`}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm font-bold"><AvatarFallback className="bg-sky-100 text-sky-700">{getInitials(c.first_name + " " + c.last_name)}</AvatarFallback></Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900">Dr. {c.first_name} {c.last_name}</p>
                                                        <Badge className="text-[9px] bg-slate-100 text-slate-600 font-bold uppercase rounded-md">{c.role}</Badge>
                                                    </div>
                                                </div>
                                                {newConversationRecipient === c.user_id && <Circle className="h-4 w-4 fill-sky-600 text-sky-600 shadow-xl" />}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                            <div className="space-y-3">
                                <Label className="text-slate-600 font-semibold ml-1">Your Message</Label>
                                <Textarea placeholder="How can Dr. assist you today?" value={newConversationMessage} onChange={e => setNewConversationMessage(e.target.value)} rows={4} className="rounded-2xl border-slate-200 focus:ring-sky-500 resize-none" />
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-center">
                            <Button variant="ghost" className="rounded-xl text-slate-500 font-bold" onClick={() => setIsComposeOpen(false)}>Maybe Later</Button>
                            <Button className="bg-sky-600 hover:bg-sky-700 rounded-xl px-8 font-bold text-white shadow-lg shadow-sky-100" disabled={!newConversationRecipient || !newConversationMessage.trim()} onClick={handleStartNewConversation}>Start Consultation</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Chat List */}
                <div className={`w-full lg:w-[360px] border-r border-slate-100 bg-white/50 backdrop-blur-md flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-5 border-b border-slate-50"><Input placeholder="Search your chats..." className="bg-slate-50/50 border-none rounded-2xl h-11 pl-5 font-medium" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                    <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
                        {listLoading ? <div className="p-16 text-center"><Loader2 className="animate-spin h-10 w-10 mx-auto text-sky-400 opacity-30" /></div> :
                            filteredConversations.map(c => (
                                <div key={c.conversation_id} onClick={() => handleSelectConversation(c)} className={`p-4 rounded-3xl mb-1 cursor-pointer transition-all flex gap-4 ${activeConversationId === c.conversation_id ? 'bg-sky-100 shadow-sm border border-sky-200' : 'hover:bg-slate-50/80 border border-transparent'}`}>
                                    <div className="relative">
                                        <Avatar className="h-14 w-14 border-2 border-white shadow-sm"><AvatarFallback className="font-bold bg-sky-50 text-sky-700 text-lg">{getInitials(c.receiver_name)}</AvatarFallback></Avatar>
                                        {c.unread_count > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-4 border-white shadow-sm">{c.unread_count}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-0.5">
                                            <h4 className="text-[15px] font-bold truncate text-slate-900">Dr. {c.receiver_name}</h4>
                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{formatTime(c.last_message_timestamp)}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 truncate font-medium">{c.last_message_preview}</p>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* Chat Main */}
                <div className={`flex-1 flex flex-col bg-white ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
                    {selectedConversation ? (
                        <>
                            <div className="px-8 py-5 border-b flex items-center justify-between bg-white/90 backdrop-blur-xl z-20 sticky top-0 border-slate-50 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                <div className="flex items-center gap-4">
                                    <Button variant="ghost" size="icon" className="lg:hidden rounded-2xl bg-slate-50" onClick={() => dispatch(resetDetail())}><ArrowLeft className="h-5 w-5 text-slate-600" /></Button>
                                    <Avatar className="h-12 w-12 border-2 border-sky-50 shadow-sm"><AvatarFallback className="font-bold bg-white text-sky-600">{getInitials(activeRecipient?.first_name + " " + activeRecipient?.last_name)}</AvatarFallback></Avatar>
                                    <div>
                                        <h3 className="text-[16px] font-black text-slate-900">Dr. {activeRecipient?.first_name} {activeRecipient?.last_name}</h3>
                                        <div className="flex items-center gap-2">
                                            <Badge className="bg-sky-50 text-sky-600 font-bold text-[9px] uppercase tracking-widest h-4 px-2">Medical Practitioner</Badge>
                                            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-black uppercase tracking-tighter"><Circle className="h-1.5 w-1.5 fill-current" /> Secured Line</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button variant="outline" size="icon" className="rounded-2xl border-slate-100 hover:bg-slate-50"><Info className="h-5 w-5 text-slate-400" /></Button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-10 space-y-8 bg-[#fdfdfd] pattern-dots">
                                {selectedConversation.messages.map(m => {
                                    const isMe = m.sender_id === currentUser?.id;
                                    return (
                                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[80%] px-6 py-4 rounded-[2.5rem] text-sm shadow-[0_8px_30px_rgba(0,0,0,0.04)] leading-relaxed font-medium ${isMe ? 'bg-[#2563eb] text-white rounded-br-none shadow-blue-100/50' : 'bg-white border border-slate-100 text-slate-700 rounded-bl-none'}`}>
                                                {m.content}
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-3 font-bold tracking-widest px-2 uppercase">{formatTime(m.created_at)}</span>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-6 bg-white border-t border-slate-50">
                                <div className="flex gap-4 max-w-5xl mx-auto items-center">
                                    <div className="flex-1 relative bg-slate-50 rounded-3xl p-1 shadow-inner border border-slate-100/50">
                                        <Textarea
                                            placeholder="Tell Dr. your symptoms or questions..."
                                            className="min-h-[56px] max-h-[160px] resize-none border-none bg-transparent focus-visible:ring-0 rounded-3xl px-6 py-4 text-sm font-medium text-slate-800"
                                            value={newMessageText}
                                            onChange={e => setNewMessageText(e.target.value)}
                                        />
                                        <Smile className="h-6 w-6 absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-sky-500 transition-colors cursor-pointer" />
                                    </div>
                                    <Button
                                        className="h-14 w-14 rounded-3xl bg-sky-600 hover:bg-sky-700 shadow-xl shadow-sky-200 transition-all hover:scale-105 active:scale-95 flex items-center justify-center p-0"
                                        onClick={handleSendChatMessage}
                                        disabled={!newMessageText.trim()}
                                    >
                                        <Send className="h-7 w-7 text-white" />
                                    </Button>
                                </div>
                                <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest flex items-center justify-center gap-2 opacity-50"><Shield className="h-3 w-3" /> HIPAA Compliant End-to-End Encryption Enabled</p>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                            <div className="w-28 h-28 bg-sky-50 rounded-[3rem] border border-sky-100/50 flex items-center justify-center mb-10 shadow-inner overflow-hidden relative group">
                                <MessageSquare className="h-12 w-12 text-sky-200 group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-gradient-to-br from-sky-400/10 to-transparent" />
                            </div>
                            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Your Patient Care Hub</h3>
                            <p className="text-slate-500 font-medium text-sm max-w-[320px] leading-relaxed">Reach out to your doctors securely. All medical information is private and encrypted.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
