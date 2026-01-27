
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, query, where, updateDoc, arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import type { UserProfile, ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Send, User, Bot, Sparkles, Wand2, ArrowLeft, MessageSquare, Archive, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { professionalizeReply } from '@/ai/flows/professional-reply-flow';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

function ChatInterface({ selectedUser, onBack }: { selectedUser: UserProfile, onBack: () => void }) {
    const { userProfile: adminProfile } = useAuth();
    const firestore = useFirestore();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [useAI, setUseAI] = useState(false);
    const [aiDialogState, setAiDialogState] = useState({ open: false, originalText: '', aiSuggestion: '' });

    const messages = selectedUser.chat || [];

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => {
      const markAsRead = async () => {
          if (firestore && selectedUser?.hasUnreadUserMessage) {
              const userDocRef = doc(firestore, 'users', selectedUser.id);
              await updateDoc(userDocRef, { hasUnreadUserMessage: false });
          }
      };
      markAsRead();
      scrollToBottom();
  }, [selectedUser, firestore, messages]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !adminProfile || !selectedUser || !firestore) return;
        setIsSending(true);

        const newMessage: ChatMessage = {
            id: doc(collection(firestore, 'temp')).id,
            text,
            senderId: adminProfile.id,
            senderName: "Admin",
            isBot: true,
            timestamp: Timestamp.now(),
        };

        try {
            await updateDoc(doc(firestore, 'users', selectedUser.id), { 
                chat: arrayUnion(newMessage),
                hasUnreadAdminMessage: true 
            });
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setIsSending(false);
        }
    }, [adminProfile, selectedUser, firestore]);
    
    const handleResolveChat = async () => {
        if (!selectedUser || !firestore) return;
        try {
            await updateDoc(doc(firestore, 'users', selectedUser.id), {
                chatStatus: 'resolved'
            });
            onBack(); // Go back to the user list
        } catch (error) {
            console.error('Error resolving chat:', error);
        }
    };


    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (useAI && message.trim()) {
            setIsSending(true);
            try {
                const suggestion = await professionalizeReply({ rawReply: message });
                setAiDialogState({
                    open: true,
                    originalText: message,
                    aiSuggestion: suggestion.professionalReply
                });
            } catch (error) {
                console.error("AI reply generation failed:", error);
                await handleSendMessage(message); // Fallback to sending original message
            } finally {
                setIsSending(false);
            }
        } else {
            await handleSendMessage(message);
        }
    };
    
    const handleConfirmAiReply = async () => {
        setAiDialogState({ open: false, originalText: '', aiSuggestion: '' });
        await handleSendMessage(aiDialogState.aiSuggestion);
    };

    return (
        <div className="flex flex-col h-full">
            <header className="flex items-center gap-4 p-4 border-b border-purple-400/20 bg-slate-900/50 backdrop-blur-sm">
                <Button variant="ghost" size="icon" onClick={onBack} className="md:hidden">
                    <ArrowLeft />
                </Button>
                <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedUser.profileImageUrl} alt={selectedUser.fullName} />
                    <AvatarFallback>{selectedUser.fullName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <h2 className="font-bold text-white">{selectedUser.fullName}</h2>
                    <p className="text-xs text-muted-foreground">{selectedUser.profileCode}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleResolveChat}>
                    <Archive className="mr-2 h-4 w-4" /> Resolve
                </Button>
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages?.map((msg) => (
                    <div key={msg.id} className={cn('flex items-end gap-2 max-w-[80%]', msg.senderId === adminProfile?.id ? 'ml-auto flex-row-reverse' : 'mr-auto')}>
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', msg.senderId === adminProfile?.id ? 'bg-purple-600' : 'bg-cyan-600')}>
                            {msg.isBot ? <Bot className="h-5 w-5"/> : <User className="h-5 w-5" />}
                        </div>
                        <div className={cn('p-3 rounded-lg', msg.senderId === adminProfile?.id ? 'bg-purple-500/20 text-white rounded-br-none' : 'bg-slate-700/50 text-white rounded-bl-none')}>
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            <p className="text-xs text-muted-foreground mt-1 text-right">
                                {msg.timestamp ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'sending...'}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-purple-400/20 bg-slate-900/50 backdrop-blur-sm">
                <form onSubmit={handleFormSubmit} className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Textarea placeholder="Type your message..." value={message} onChange={(e) => setMessage(e.target.value)} rows={1} className="flex-1 resize-none bg-slate-800 border-purple-400/30 text-white" />
                        <Button size="icon" type="submit" disabled={isSending || !message.trim()} className="bg-purple-500 hover:bg-purple-400 text-white">
                            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="ai-checkbox" checked={useAI} onCheckedChange={(checked) => setUseAI(Boolean(checked))} />
                        <Label htmlFor="ai-checkbox" className="flex items-center gap-1.5 text-sm font-medium text-purple-300"><Sparkles className="h-4 w-4" /> AI Professional Reply</Label>
                    </div>
                </form>
            </div>
             <Dialog open={aiDialogState.open} onOpenChange={(open) => setAiDialogState(prev => ({...prev, open}))}>
                <DialogContent className="text-white border-purple-400/50" style={{ background: 'linear-gradient(145deg, #2c1a2e, #1e163e)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-purple-300 flex items-center gap-2"><Wand2 className="h-5 w-5"/> AI Suggestion</DialogTitle>
                        <DialogDescription className="text-purple-200/80">Review and edit the AI-generated professional reply.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-1"><Label className="text-xs text-muted-foreground">Your original text:</Label><p className="text-sm p-2 bg-black/20 rounded-md border border-white/10">{aiDialogState.originalText}</p></div>
                        <div className="space-y-2"><Label htmlFor="ai-suggestion" className="text-purple-200/90">AI Enhanced Reply:</Label><Textarea id="ai-suggestion" value={aiDialogState.aiSuggestion} onChange={(e) => setAiDialogState(prev => ({...prev, aiSuggestion: e.target.value }))} className="bg-slate-900/50 border-purple-400/30 text-white min-h-[150px]" rows={6}/></div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild><Button variant="outline" className="bg-transparent text-purple-300 border-purple-400/50 hover:bg-purple-400/10 hover:text-white">Cancel</Button></DialogClose>
                        <Button onClick={handleConfirmAiReply} disabled={isSending} className="bg-purple-500 text-white hover:bg-purple-600">{isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : "Confirm and Send"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function ChatAdminPage() {
    const firestore = useFirestore();
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const usersWithChatQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'users'),
            where('chatStatus', 'in', ['open', null]),
            where('chat', '!=', null)
        );
    }, [firestore]);
    

    const { data: users, isLoading } = useCollection<UserProfile>(usersWithChatQuery);

    const sortedAndFilteredUsers = useMemo(() => {
        if (!users) return [];
        const filtered = users.filter(user => 
            user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.profileCode.includes(searchTerm)
        );
        return filtered.sort((a, b) => {
            if (a.hasUnreadUserMessage && !b.hasUnreadUserMessage) return -1;
            if (!a.hasUnreadUserMessage && b.hasUnreadUserMessage) return 1;
            const lastMessageA = a.chat?.[a.chat.length - 1]?.timestamp?.toMillis() || 0;
            const lastMessageB = b.chat?.[b.chat.length - 1]?.timestamp?.toMillis() || 0;
            return lastMessageB - lastMessageA;
        });
    }, [users, searchTerm]);

    const handleSelectUser = async (user: UserProfile) => {
        setSelectedUser(user);
        if (firestore && user.hasUnreadUserMessage) {
            const userDocRef = doc(firestore, 'users', user.id);
            await updateDoc(userDocRef, { hasUnreadUserMessage: false });
        }
    };
    
    if (isLoading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    return (
        <div className="h-screen grid md:grid-cols-[350px_1fr] app-background text-white">
            <div className={cn("flex-col border-r border-purple-400/20", selectedUser ? "hidden md:flex" : "flex")}>
                <header className="p-4 border-b border-purple-400/20 space-y-2">
                    <h1 className="text-xl font-bold">Admin Chat</h1>
                     <Button asChild variant="outline" className="w-full">
                        <Link href="/admin/chat-admin/resolved">
                            <Eye className="mr-2 h-4 w-4" /> View Resolved Chats
                        </Link>
                    </Button>
                    <Input 
                        placeholder="Search by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mt-2 bg-slate-800 border-purple-400/30"
                    />
                </header>
                <div className="flex-1 overflow-y-auto">
                    {sortedAndFilteredUsers.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No active user chats found.</div>
                    ) : (
                        <div className="space-y-1 p-2">
                            {sortedAndFilteredUsers.map(user => (
                                <button key={user.id} onClick={() => handleSelectUser(user)} className="w-full text-left p-2 rounded-md hover:bg-slate-800/50 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                                            <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-semibold">{user.fullName}</p>
                                            <p className="text-xs text-muted-foreground">{user.profileCode}</p>
                                        </div>
                                    </div>
                                    {user.hasUnreadUserMessage && <Badge variant="destructive">New</Badge>}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className={cn("flex-col", selectedUser ? "flex" : "hidden md:flex")}>
                {selectedUser ? (
                    <ChatInterface selectedUser={selectedUser} onBack={() => setSelectedUser(null)} />
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <p>Select a user to start chatting</p>
                    </div>
                )}
            </div>
        </div>
    );
}

