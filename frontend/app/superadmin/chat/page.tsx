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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    ShieldCheck,
    Zap
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

export default function SuperAdminChat() {
    const dispatch = useDispatch();
    const appDispatch = useDispatch<AppDispatch>();
    const {
        list: conversations,
        detail: selectedConversation,
        contacts,
        listLoading,
        detailLoading,
        activeConversationId,
        error
    } = useSelector((state: RootState) => state.allChat);

    const currentUser = useSelector((state: RootState) => state.auth);
    const [isConnected, setIsConnected] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [contactSearchTerm, setContactSearchTerm] = useState("");
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
            case "Hospital_Admin": return "bg-purple-100 text-purple-800 border-purple-200";
            case "Super_Admin": return "bg-indigo-600 text-white border-indigo-700";
            default: return "bg-gray-100 text-gray-800";
        }
    };

    const getInitials = (n = "") => n.split(" ").map(i => i[0]).join("").toUpperCase() || "SA";
    const formatTime = (t: string) => t ? new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

    const activeRecipient = selectedConversation?.participants.find(p => p.user_id !== currentUser?.id);
    const isRecipientBlocked = contacts.find(c => c.user_id === activeRecipient?.user_id)?.is_blocked;

    const filteredConversations = conversations.filter(c =>
        c.receiver_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.last_message_preview.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const conversedUserIds = conversations.map(c => c.receiver_id);

    // Show ALL contacts, but mark active ones
    const filteredContacts = contacts.filter(c =>
        (c.first_name + " " + c.last_name).toLowerCase().includes(contactSearchTerm.toLowerCase()) ||
        c.role.toLowerCase().includes(contactSearchTerm.toLowerCase())
    );

    return (
        <div className="h-[82vh] bg-[#f8fafc] flex flex-col rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            {/* Super Admin Header */}
            <div className="px-8 py-6 border-b bg-white flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className={`p-3 rounded-2xl ${isConnected ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : 'bg-rose-500 shadow-lg shadow-rose-200'} transition-all duration-500`}>
                        <ShieldCheck className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                            Master Command Node
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold px-3">L4 ACCESS</Badge>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase flex items-center gap-2 mt-1">
                            <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            {isConnected ? 'ENCRYPTED QUANTUM LINK ESTABLISHED' : 'DOWNLINK FAILURE'}
                        </p>
                    </div>
                </div>
                <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                    <Button onClick={() => setIsComposeOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl px-7 h-12 font-bold shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95">
                        <Zap className="h-4 w-4 mr-2" /> Direct Override
                    </Button>
                    <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-[2rem]">
                        <DialogHeader><DialogTitle className="text-2xl font-black text-slate-900">Initiate Level 4 Link</DialogTitle></DialogHeader>
                        <div className="space-y-6 py-4">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between ml-1">
                                    <Label className="font-bold text-slate-500">Global Command Targets</Label>
                                    <Badge variant="outline" className="text-[9px] border-slate-100 text-slate-400">{filteredContacts.length} AVAILABLE</Badge>
                                </div>
                                <Select onValueChange={(val) => setNewConversationRecipient(Number(val))}>
                                    <SelectTrigger className="w-full bg-slate-50 border-none rounded-2xl h-14 px-6 font-bold text-slate-700 shadow-inner focus:ring-indigo-500/20">
                                        <SelectValue placeholder="Select administrator..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-none shadow-2xl bg-white p-2">
                                        {filteredContacts.length === 0 ? (
                                            <div className="p-4 text-center text-xs text-slate-400 font-bold italic">No targets accessible</div>
                                        ) : (
                                            filteredContacts.map(c => {
                                                const isActive = conversedUserIds.includes(c.user_id);
                                                return (
                                                    <SelectItem key={c.user_id} value={c.user_id.toString()} className="rounded-xl p-3 focus:bg-indigo-50 focus:text-indigo-600 transition-colors">
                                                        <div className="flex items-center justify-between w-full gap-3">
                                                            <div className="flex items-center gap-3">
                                                                <Avatar className="h-6 w-6"><AvatarFallback className="text-[8px] bg-indigo-100 text-indigo-600">{getInitials(c.first_name + " " + c.last_name)}</AvatarFallback></Avatar>
                                                                <span className="font-black text-sm">{c.first_name} {c.last_name}</span>
                                                            </div>
                                                            {isActive && <Badge variant="secondary" className="text-[8px] h-4">Active Chat</Badge>}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-3">
                                <Label className="font-bold text-slate-500 ml-1">Payload Content</Label>
                                <Textarea placeholder="Construct transmission..." value={newConversationMessage} onChange={e => setNewConversationMessage(e.target.value)} rows={4} className="rounded-3xl border-slate-200 bg-slate-50 focus:ring-indigo-500 resize-none font-medium px-5 py-4" />
                            </div>
                        </div>
                        <DialogFooter className="sm:justify-center">
                            <Button variant="ghost" onClick={() => setIsComposeOpen(false)} className="rounded-2xl font-bold text-slate-400">Abort</Button>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl px-10 h-12 font-bold text-white shadow-xl shadow-indigo-100" disabled={!newConversationRecipient || !newConversationMessage.trim()} onClick={handleStartNewConversation}>Launch Transmission</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Navigation Sidebar */}
                <div className={`w-full lg:w-[380px] border-r border-slate-100 bg-white flex flex-col ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                    <div className="p-6">
                        <div className="relative group">
                            <Input placeholder="Scan global identities..." className="bg-slate-50 border-none rounded-[1.5rem] h-12 pl-12 font-bold text-slate-600 focus:ring-2 focus:ring-indigo-500/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-3 space-y-1">
                        {listLoading ? <div className="p-20 text-center opacity-30 animate-pulse"><Loader2 className="h-12 w-12 mx-auto animate-spin" /></div> :
                            filteredConversations.map(c => (
                                <div key={c.conversation_id} onClick={() => handleSelectConversation(c)} className={`group p-5 rounded-[2rem] cursor-pointer transition-all flex gap-5 border-2 ${activeConversationId === c.conversation_id ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-100' : 'hover:bg-slate-50 border-transparent'}`}>
                                    <div className="relative">
                                        <Avatar className={`h-14 w-14 border-4 transition-all duration-500 ${activeConversationId === c.conversation_id ? 'border-indigo-400 rotate-3 shadow-lg' : 'border-white group-hover:scale-105 shadow-md'}`}><AvatarFallback className="font-black bg-indigo-50 text-indigo-700 text-lg">{getInitials(c.receiver_name)}</AvatarFallback></Avatar>
                                        {c.unread_count > 0 && <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black h-7 w-7 rounded-full flex items-center justify-center border-[4px] border-white shadow-xl animate-bounce">{c.unread_count}</span>}
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                                        <div className="flex justify-between items-center mb-1">
                                            <h4 className={`text-[15px] font-black truncate tracking-tight ${activeConversationId === c.conversation_id ? 'text-white' : 'text-slate-900 group-hover:text-indigo-600 transition-colors'}`}>{c.receiver_name}</h4>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${activeConversationId === c.conversation_id ? 'text-indigo-200' : 'text-slate-300'}`}>{formatTime(c.last_message_timestamp)}</span>
                                        </div>
                                        <Badge className={`text-[9px] h-4 w-fit mb-1.5 font-bold border-none ${activeConversationId === c.conversation_id ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{c.receiver_role}</Badge>
                                        <p className={`text-[12px] truncate font-medium ${activeConversationId === c.conversation_id ? 'text-indigo-100' : 'text-slate-400'}`}>{c.last_message_preview}</p>
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>

                {/* Tactical View */}
                <div className={`flex-1 flex flex-col bg-white ${selectedConversation ? 'flex' : 'hidden lg:flex'}`}>
                    {selectedConversation ? (
                        <>
                            <div className="px-10 py-5 border-b flex items-center justify-between bg-white z-20 shadow-[0_10px_30px_rgba(0,0,0,0.015)]">
                                <div className="flex items-center gap-5">
                                    <Button variant="ghost" size="icon" className="lg:hidden rounded-2xl bg-slate-50 h-10 w-10" onClick={() => dispatch(resetDetail())}><ArrowLeft className="h-5 w-5 text-slate-600" /></Button>
                                    <Avatar className="h-12 w-12 border-2 border-indigo-50 shadow-sm"><AvatarFallback className="font-black bg-white text-indigo-600">{getInitials(activeRecipient?.first_name + " " + activeRecipient?.last_name)}</AvatarFallback></Avatar>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 tracking-tight">{activeRecipient?.first_name} {activeRecipient?.last_name}</h3>
                                        <div className="flex items-center gap-2">
                                            <Badge className={`bg-indigo-50 text-indigo-600 font-bold text-[9px] uppercase tracking-widest h-4 px-2 border-none`}>{activeRecipient?.role}</Badge>
                                            <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-black uppercase tracking-tighter"><Circle className="h-1.5 w-1.5 fill-current" /> Tactical Channel</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" size="icon" className="rounded-2xl border-slate-100 hover:bg-slate-50 transition-all active:scale-90"><Info className="h-5 w-5 text-slate-400" /></Button>
                                    {activeRecipient && (
                                        <Button variant="ghost" size="sm" onClick={() => handleBlockAction(activeRecipient.user_id, isRecipientBlocked || false)} className={`rounded-xl font-black text-[10px] uppercase tracking-widest px-4 h-9 ${isRecipientBlocked ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>
                                            {isRecipientBlocked ? 'Restore Clearance' : 'Revoke Access'}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-12 space-y-10 bg-[#fafbfc] pattern-circuit">
                                {selectedConversation.messages.map(m => {
                                    const isMe = m.sender_id === currentUser?.id;
                                    return (
                                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[75%] px-7 py-5 rounded-[2.5rem] text-[14px] shadow-2xl leading-relaxed font-semibold transition-all duration-300 ${isMe ? 'bg-indigo-600 text-white rounded-br-none shadow-indigo-100/50 scale-100 hover:scale-[1.02]' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none hover:shadow-indigo-50/50'}`}>
                                                {m.content}
                                            </div>
                                            <span className="text-[10px] text-slate-400 mt-4 font-black tracking-widest px-3 uppercase opacity-60 flex items-center gap-2">
                                                {isMe && <Zap className="h-2 w-2 text-indigo-400" />} {formatTime(m.created_at)}
                                            </span>
                                        </div>
                                    );
                                })}
                                {isRecipientBlocked && <div className="flex justify-center"><Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 py-3 px-8 rounded-full font-black text-[11px] gap-3 uppercase animate-pulse shadow-xl shadow-rose-100"><Shield className="h-4 w-4" /> Link Restricted by SuperUser</Badge></div>}
                                <div ref={messagesEndRef} />
                            </div>
                            <div className="p-8 bg-white border-t border-slate-50">
                                <div className="flex gap-4 max-w-6xl mx-auto items-end">
                                    <div className="flex-1 relative bg-slate-50/50 rounded-[2.5rem] p-1 border-2 border-slate-100 transition-all focus-within:border-indigo-600/20 focus-within:bg-white shadow-inner">
                                        <Textarea
                                            placeholder={isRecipientBlocked ? "Revocation status active..." : "Declare command / transmission..."}
                                            className="min-h-[60px] max-h-[180px] resize-none border-none bg-transparent focus-visible:ring-0 rounded-[2rem] px-8 py-5 text-sm font-bold text-slate-800 placeholder:text-slate-300"
                                            value={newMessageText}
                                            onChange={e => setNewMessageText(e.target.value)}
                                            disabled={isRecipientBlocked}
                                        />
                                        <Smile className="h-6 w-6 absolute right-6 top-1/2 -translate-y-1/2 text-slate-200 hover:text-indigo-600 transition-all cursor-pointer" />
                                    </div>
                                    <Button
                                        className={`h-16 w-16 rounded-[2rem] transition-all duration-300 transform active:scale-90 flex items-center justify-center p-0 ${!newMessageText.trim() || isRecipientBlocked ? 'bg-slate-100 text-slate-300' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xl shadow-indigo-200 hover:rotate-6'}`}
                                        onClick={handleSendChatMessage}
                                        disabled={!newMessageText.trim() || isRecipientBlocked}
                                    >
                                        <Send className="h-7 w-7" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-24 text-center">
                            <div className="w-32 h-32 bg-indigo-50 rounded-[3rem] border-2 border-indigo-100 flex items-center justify-center mb-10 shadow-2xl shadow-indigo-50 relative group overflow-hidden">
                                <ShieldCheck className="h-14 w-14 text-indigo-400 group-hover:scale-125 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent animate-pulse" />
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 mb-5 tracking-tighter">Strategic Communication Hub</h3>
                            <p className="text-slate-500 font-bold text-sm max-w-[380px] leading-relaxed opacity-70 mb-8">Oversee organizational health and link directly with Hospital Administrators. Level 4 encryption enabled.</p>

                            <Button
                                onClick={() => setIsComposeOpen(true)}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2rem] px-10 h-14 font-black text-base shadow-2xl shadow-indigo-200 transition-all hover:scale-105 active:scale-95 group mb-12"
                            >
                                <Zap className="h-5 w-5 mr-3 text-indigo-200 group-hover:animate-pulse" />
                                Start New Connection
                            </Button>

                            <div className="flex gap-3">
                                <div className="h-1.5 w-12 rounded-full bg-slate-100" />
                                <div className="h-1.5 w-12 rounded-full bg-indigo-600 shadow-lg shadow-indigo-100" />
                                <div className="h-1.5 w-12 rounded-full bg-slate-100" />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
