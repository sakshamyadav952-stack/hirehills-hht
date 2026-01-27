
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, Timestamp, collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send, MessageSquare, User, Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { UserProfile, ChatMessage } from '@/lib/types';

export default function ChatPage() {
  const { userProfile: authProfile } = useAuth();
  const firestore = useFirestore();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!authProfile) return null;
    return doc(firestore, 'users', authProfile.id);
  }, [authProfile, firestore]);

  const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

  const messages = userProfile?.chat || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  useEffect(() => {
    if (!isFocused) {
        scrollToBottom();
    }
  }, [isFocused]);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !userProfile || !firestore) return;

    setIsSending(true);

    const newMessage: ChatMessage = {
      id: doc(collection(firestore, 'temp')).id, // Generate a client-side ID
      text,
      senderId: userProfile.id,
      senderName: userProfile.fullName,
      isBot: false,
      timestamp: Timestamp.now(), // Use client-side timestamp for immediate display
    };

    try {
        await updateDoc(doc(firestore, 'users', userProfile.id), { 
          chat: arrayUnion(newMessage),
          hasUnreadAdminMessage: false, 
          hasUnreadUserMessage: true,
          chatStatus: 'open', // Re-open chat on new message
        });
        setMessage('');
        setIsFocused(false);
    } catch (error) {
        console.error('Error sending message:', error);
    } finally {
        setIsSending(false);
    }
  }, [userProfile, firestore]);

  return (
    <>
      <div className={cn("fixed inset-0 flex flex-col app-background pb-16 md:pb-0", isFocused && "blur-sm opacity-50 pointer-events-none")}>
        <header className="flex items-center gap-4 p-4 border-b border-cyan-400/20 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <MessageSquare className="h-6 w-6 text-cyan-300" />
          <h1 className="text-xl font-bold text-white">Support</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && (
              <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin" />
              </div>
          )}
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex items-end gap-2 max-w-[80%]',
                msg.senderId === userProfile?.id ? 'ml-auto flex-row-reverse' : 'mr-auto'
              )}
            >
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0',  msg.senderId === userProfile?.id ? 'bg-cyan-600' : 'bg-purple-600')}>
                {msg.isBot ? <Bot className="h-5 w-5"/> : <User className="h-5 w-5" />}
              </div>
              <div
                className={cn(
                  'p-3 rounded-lg',
                  msg.senderId === userProfile?.id
                    ? 'bg-cyan-500/20 text-white rounded-br-none'
                    : 'bg-slate-700/50 text-white rounded-bl-none'
                )}
              >
                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {msg.timestamp ? formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true }) : 'sending...'}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-cyan-400/20 bg-slate-900/50 backdrop-blur-sm shrink-0 pb-safe">
          <div className="flex items-center gap-2">
            <Textarea
              placeholder="Type your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(message);
                }
              }}
              onFocus={() => setIsFocused(true)}
              rows={1}
              className="flex-1 resize-none bg-slate-800 border-cyan-400/30 text-white"
            />
            <Button
              size="icon"
              onClick={() => handleSendMessage(message)}
              disabled={isSending || !message.trim()}
              className="bg-cyan-500 hover:bg-cyan-400 text-black"
            >
              {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>
      
      {isFocused && (
        <div className="fixed top-0 left-0 right-0 p-4 bg-slate-900/80 backdrop-blur-md border-b border-cyan-400/20 z-50">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(message); }} className="space-y-2">
                <div className="flex justify-end items-center">
                    <Button variant="ghost" size="sm" type="button" onClick={() => setIsFocused(false)} className="text-cyan-300 hover:text-white -mr-2">
                        <X className="h-4 w-4 mr-1" />
                        Close
                    </Button>
                </div>
                <div className="flex items-end gap-2">
                    <Textarea
                        autoFocus
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="flex-1 bg-slate-900/50 border-cyan-400/30 text-white min-h-[80px] resize-none"
                        rows={3}
                    />
                    <Button type="submit" disabled={isSending || !message.trim()} size="icon" className="bg-cyan-500 text-black hover:bg-cyan-400 shrink-0">
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </form>
        </div>
      )}
    </>
  );
}
