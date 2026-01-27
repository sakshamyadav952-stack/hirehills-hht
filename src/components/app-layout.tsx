
"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Pickaxe, User, LogIn, UserPlus, LogOut, Menu, Wallet, Loader2, Copy, Check, Users, FileCode, Bell, Send, Inbox, History, Phone, FileText, Trash2, Plus, Zap, Percent, Edit, ChevronRight, UserCheck, LayoutDashboard, Banknote, X, Info, UserSearch, MessageSquare, FilePen, ShieldAlert, Moon, Sun, Fingerprint, BarChart2, Coins, Award, Facebook, ArrowLeft, Clock, ShieldCheck, Star, Gift, Sparkles, Bot, ExternalLink } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import {
  SidebarProvider,
  Sidebar,
  SidebarBody,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose, DialogFooter } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePathname, useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { TransactionHistory } from '@/components/transaction-history';
import { SendCoinsFlow } from '@/components/send-coins-flow';
import { GhostGuide } from '@/components/ghost-guide';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ProfileCard } from '@/components/profile-card';
import { OnboardingDialog } from '@/components/onboarding-dialog';
import { Label } from './ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { useFirestore } from '@/firebase';
import { collection, onSnapshot, query, getDocs, where, doc, updateDoc, increment } from 'firebase/firestore';
import type { UserProfile, WithdrawalRequest, PendingTransfer, Note, ChatMessage as ChatMessageType } from '@/lib/types';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { SpinWheel } from './spin-wheel';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { OnlineStatusIndicator } from './online-status-indicator';
import { askBlistreeAssistant } from '@/ai/flows/assistant-flow';


interface ChatMessage {
    id: number;
    text: string;
    sender: 'user' | 'ai';
}

function AssistantChatDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { userProfile } = useAuth();
    const firestore = useFirestore();
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);

    const messagesRemaining = Math.max(0, 3 - (userProfile?.aiMessageCount || 0));

    useEffect(() => {
        if (open) {
            setChatHistory([
                { id: 0, text: `Hi ${userProfile?.fullName || 'there'}! I'm the Blistree Assistant. How can I help you today?`, sender: 'ai' }
            ]);
        }
    }, [open, userProfile?.fullName]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatHistory]);

    const handleSendMessage = useCallback(async (text: string) => {
        if (!text.trim() || !userProfile || !firestore) return;

        const userMessage: ChatMessage = { id: Date.now(), text, sender: 'user' };
        setChatHistory(prev => [...prev, userMessage]);
        setMessage('');
        setIsFocused(false);

        if (text.trim().toLowerCase().startsWith('test/')) {
            return;
        }

        if (messagesRemaining <= 0) return;

        setIsSending(true);

        const userDocRef = doc(firestore, 'users', userProfile.id);
        await updateDoc(userDocRef, {
            aiMessageCount: increment(1)
        });

        try {
            const aiResponse = await askBlistreeAssistant({ question: text });
            const aiMessage: ChatMessage = { id: Date.now() + 1, text: aiResponse.answer, sender: 'ai' };
            setChatHistory(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMessage: ChatMessage = { id: Date.now() + 1, text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.", sender: 'ai' };
            setChatHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
        }
    }, [userProfile, firestore, messagesRemaining]);
    
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleSendMessage(message);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="text-white border-cyan-400/50 flex flex-col h-[80vh] max-h-[700px] p-0" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                 <DialogHeader className="p-6 pb-4 border-b border-cyan-400/20">
                    <DialogTitle className="text-cyan-300 flex items-center gap-2"><Sparkles className="h-5 w-5"/> Blistree Assistant</DialogTitle>
                    <DialogDescription className="text-cyan-200/80">Ask me anything about the Blistree project.</DialogDescription>
                </DialogHeader>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {chatHistory.map((msg) => (
                        <div
                            key={msg.id}
                            className={cn(
                                'flex items-end gap-2 max-w-[80%]',
                                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                            )}
                        >
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarImage src={msg.sender === 'user' ? userProfile?.profileImageUrl : '/logo.svg'} />
                                <AvatarFallback>{msg.sender === 'user' ? <User /> : <Bot />}</AvatarFallback>
                            </Avatar>
                            <div
                                className={cn(
                                    'p-3 rounded-lg',
                                    msg.sender === 'user'
                                        ? 'bg-cyan-500/20 text-white rounded-br-none'
                                        : 'bg-slate-700/50 text-white rounded-bl-none'
                                )}
                            >
                                <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isSending && (
                        <div className="flex items-end gap-2 max-w-[80%] mr-auto">
                            <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback><Bot /></AvatarFallback>
                            </Avatar>
                            <div className="p-3 rounded-lg bg-slate-700/50 text-white rounded-bl-none flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="text-sm">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                 {isFocused ? (
                    <div className="fixed top-0 left-0 right-0 p-4 bg-slate-900/80 backdrop-blur-md border-b border-purple-400/20 z-[60]">
                        <form onSubmit={handleFormSubmit} className="space-y-2">
                            <div className="flex justify-end items-center">
                                <Button variant="ghost" size="sm" type="button" onClick={() => setIsFocused(false)} className="text-purple-300 hover:text-white -mr-2">
                                    <X className="h-4 w-4 mr-1" />
                                    Close
                                </Button>
                            </div>
                            <div className="flex items-end gap-2">
                                <Textarea
                                    autoFocus
                                    placeholder={`Ask me anything... (${messagesRemaining} left today)`}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="flex-1 bg-slate-900/50 border-purple-400/30 text-white min-h-[80px] resize-none"
                                    rows={3}
                                />
                                <Button type="submit" disabled={isSending || !message.trim()} size="icon" className="bg-purple-500 hover:bg-purple-400 text-white shrink-0">
                                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                </Button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="p-4 border-t border-cyan-400/20 bg-slate-900/50 shrink-0 pb-safe">
                        {messagesRemaining > 0 ? (
                            <form onSubmit={handleFormSubmit} className="flex items-center gap-2">
                                <Textarea
                                    onFocus={() => setIsFocused(true)}
                                    placeholder={`Ask me anything... (${messagesRemaining} left today)`}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={1}
                                    className="flex-1 resize-none bg-slate-800 border-cyan-400/30 text-white"
                                />
                                <Button
                                    size="icon"
                                    type="submit"
                                    disabled={isSending || !message.trim()}
                                    className="bg-cyan-500 hover:bg-cyan-400 text-black"
                                >
                                    {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                </Button>
                            </form>
                         ) : (
                            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300">
                                <Info className="h-5 w-5" />
                                <p className="text-sm font-medium">Daily message limit reached.</p>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

function MiningRateBreakdown() {
  const { miningRateBreakdown, activeReferralsCount, userProfile } = useAuth();
  
  if (!miningRateBreakdown || !userProfile) return null;

  const fromReferralsValue = activeReferralsCount * 0.25;
  
  const baseRateDisplay = 0.25;
  const appliedCodeBonus = userProfile.referredBy ? 0.25 : 0;
  const totalRate = baseRateDisplay + appliedCodeBonus + miningRateBreakdown.boost + fromReferralsValue;

  return (
    <PopoverContent className="w-80">
      <div className="grid gap-4">
        <div className="space-y-2">
          <h4 className="font-medium leading-none">Mining Rate Breakdown</h4>
          <p className="text-sm text-muted-foreground">
            Your total mining rate is calculated from the following sources.
          </p>
        </div>
        <div className="grid gap-2">
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="col-span-2 flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Base Rate</span>
            </div>
            <span className="justify-self-end">{baseRateDisplay.toFixed(2)}</span>
          </div>
          {appliedCodeBonus > 0 && (
            <div className="grid grid-cols-3 items-center gap-4">
              <div className="col-span-2 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Applied Code Bonus</span>
              </div>
              <span className="justify-self-end">+{appliedCodeBonus.toFixed(2)}</span>
            </div>
          )}
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="col-span-2 flex items-center gap-2">
                <Gift className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Mystery Box Boosts</span>
            </div>
            <span className="justify-self-end">+{miningRateBreakdown.boost.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <div className="col-span-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">From referrals ({activeReferralsCount} active)</span>
            </div>
            <span className="justify-self-end">+{fromReferralsValue.toFixed(2)}</span>
          </div>
           <div className="grid grid-cols-3 items-center gap-4 font-bold text-lg mt-2 pt-2 border-t">
            <div className="col-span-2 flex items-center gap-2">
                <Pickaxe className="h-4 w-4" />
                <span className="font-medium">Total</span>
            </div>
            <span className="justify-self-end">{totalRate.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </PopoverContent>
  )
}

function SidebarLayoutContent({ onAssistantClick }: { onAssistantClick: () => void }) {
  const { userProfile, loading, logout, totalUserSupportCount } = useAuth();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const firestore = useFirestore();
  const [isSessionActive, setIsSessionActive] = React.useState(false);
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
  const [pendingTransferCount, setPendingTransferCount] = useState(0);
  const [pendingFollowsCount, setPendingFollowsCount] = useState(0);
  const [activeSessionsCount, setActiveSessionsCount] = useState(0);

  React.useEffect(() => {
    if (userProfile && userProfile.sessionEndTime) {
      const now = Date.now();
      const sessionActive = now < userProfile.sessionEndTime;
      setIsSessionActive(sessionActive);
    } else {
      setIsSessionActive(false);
    }
  }, [userProfile?.sessionEndTime]);

  useEffect(() => {
    if (!userProfile?.isAdmin || !firestore) return;

    const usersQuery = query(collection(firestore, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        let withdrawalCount = 0, followCount = 0, activeCount = 0;
        snapshot.forEach(userDoc => {
            const user = userDoc.data() as UserProfile;
            if (user.withdrawalRequests?.some(req => !req.classification || req.classification === 'unclassified')) withdrawalCount++;
            if (user.followStatusFacebook === 'pending' || user.followStatusX === 'pending') followCount++;
            if (user.sessionEndTime && Date.now() < user.sessionEndTime) activeCount++;
        });
        setPendingWithdrawalCount(withdrawalCount);
        setPendingFollowsCount(followCount);
        setActiveSessionsCount(activeCount);
    });

    const transfersQuery = query(collection(firestore, 'pendingTransfers'));
    const unsubscribeTransfers = onSnapshot(transfersQuery, (snapshot) => setPendingTransferCount(snapshot.size));

    return () => {
        unsubscribeUsers();
        unsubscribeTransfers();
    };
  }, [userProfile?.isAdmin, firestore]);

  const totalAdminTasks = pendingWithdrawalCount + pendingTransferCount + pendingFollowsCount + totalUserSupportCount;

  const handleLinkClick = () => setOpenMobile(false);
  const handleLogout = () => { logout(); handleLinkClick(); }
  const handleAssistantClick = (e: React.MouseEvent) => { e.preventDefault(); setOpenMobile(false); onAssistantClick(); }

  const renderMenuItems = () => {
    if (loading) {
      return (
        <>
          {[...Array(3)].map((_, i) => <SidebarMenuItem key={i}><Skeleton className="h-8 w-full" /></SidebarMenuItem>)}
        </>
      )
    }

    if (userProfile) {
      const isAdmin = userProfile.isAdmin || userProfile.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';
      return (
        <>
          {isAdmin ? (
            <>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Admin Dashboard" isActive={pathname === '/admin/dashboard'}><Link href="/admin/dashboard"><LayoutDashboard /><span>Admin Dashboard</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Requests" isActive={pathname === '/admin/requests'}><Link href="/admin/requests" className="flex justify-between items-center w-full"><div className="flex items-center gap-2"><Inbox /><span>Requests</span></div>{totalAdminTasks > 0 && <Badge variant="destructive" className="ml-2 h-5">{totalAdminTasks}</Badge>}</Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Track" isActive={pathname === '/admin/track'}><Link href="/admin/track"><BarChart2 /><span>Track</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Active Sessions" isActive={pathname === '/admin/active-sessions'}><Link href="/admin/active-sessions" className="flex justify-between items-center w-full"><div className="flex items-center gap-2"><Clock /><span>Active Sessions</span></div>{activeSessionsCount > 0 && <Badge variant="destructive" className="ml-2 h-5">{activeSessionsCount}</Badge>}</Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Users" isActive={pathname === '/admin/users'}><Link href="/admin/users"><Users /><span>Users</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Find User" isActive={pathname === '/admin/find-user'}><Link href="/admin/find-user"><UserSearch /><span>Find User</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Apply Code (User)" isActive={pathname === '/admin/apply-code-user'}><Link href="/admin/apply-code-user"><UserCheck /><span>Apply Code (User)</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Chat Admin" isActive={pathname.startsWith('/admin/chat-admin')}><Link href="/admin/chat-admin" className="flex justify-between items-center w-full"><div className="flex items-center gap-2"><MessageSquare /><span>Support</span></div></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Notify" isActive={pathname === '/admin/notify'}><Link href="/admin/notify"><Send /><span>Notify</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Profile" isActive={pathname === '/profile'}><Link href="/profile"><User /><span>Profile</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Security Circle" isActive={pathname === '/referrals'}><Link href="/referrals"><ShieldCheck /><span>Security Circle</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Invite Friends" isActive={pathname === '/invite'}><Link href="/invite"><UserPlus /><span>Invite Friends</span></Link></SidebarMenuButton></SidebarMenuItem>
            </>
          ) : (
            <>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Profile" isActive={pathname === '/profile'}><Link href="/profile"><User /><span>Profile</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Wallet" isActive={pathname === '/wallet'}><Link href="/wallet" className="flex justify-between items-center w-full"><div className="flex items-center gap-2"><Wallet /><span>Wallet</span></div><div className="flex items-center gap-1 font-bold text-green-500"><span className="font-sans font-bold">₿</span><span>{Math.floor(userProfile.minedCoins || 0)}</span></div></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem><SidebarMenuButton tooltip="Blistree Assistant" onClick={handleAssistantClick}><div className="flex items-center justify-between w-full"><div className="flex items-center gap-2"><Sparkles /><span>Assistant</span></div></div></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Support" isActive={pathname.startsWith('/chat')}><Link href="/chat" className="flex items-center justify-between w-full"><div className="flex items-center gap-2"><MessageSquare /><span>Support</span></div>{userProfile?.hasUnreadAdminMessage && <span className="w-2 h-2 bg-red-500 rounded-full"></span>}</Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Security Circle" isActive={pathname === '/referrals'}><Link href="/referrals"><ShieldCheck /><span>Security Circle</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Apply Code" isActive={pathname === '/apply-code'}><Link href="/apply-code"><FileCode /><span>Apply Code</span></Link></SidebarMenuButton></SidebarMenuItem>
              <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Invite Friends" isActive={pathname === '/invite'}><Link href="/invite"><UserPlus /><span>Invite Friends</span></Link></SidebarMenuButton></SidebarMenuItem>
            </>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Project Info">
                <a href="https://blistree.com" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between w-full" onClick={handleLinkClick}>
                    <div className="flex items-center gap-2">
                        <Info />
                        <span>Project Info</span>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Live Report" isActive={pathname === '/live-report'}><Link href="/live-report"><BarChart2 /><span>Live Report</span></Link></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Privacy Policy" isActive={pathname === '/privacy-policy'}><Link href="/privacy-policy"><FileText /><span>Privacy Policy</span></Link></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem><SidebarMenuButton asChild tooltip="Rate on Play Store"><a href="https://play.google.com/store/apps/details?id=com.blistree.app" target="_blank" rel="noopener noreferrer"><Star /><span>Rate on Play Store</span></a></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem onClick={handleLogout}><SidebarMenuButton tooltip="Logout"><LogOut /><span>Log Out</span></SidebarMenuButton></SidebarMenuItem>
        </>
      )
    }

    return (
       <>
        <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild isActive={pathname === '/auth/login'}><Link href="/auth/login"><LogIn /><span>Login</span></Link></SidebarMenuButton></SidebarMenuItem>
        <SidebarMenuItem onClick={handleLinkClick}><SidebarMenuButton asChild tooltip="Privacy Policy" isActive={pathname === '/privacy-policy'}><Link href="/privacy-policy"><FileText /><span>Privacy Policy</span></Link></SidebarMenuButton></SidebarMenuItem>
      </>
    )
  }

  return (
    <SidebarBody>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="h-10 w-10 p-0" asChild><Link href="/"><Pickaxe className="h-6 w-6 text-amber-400" /></Link></Button>
          <div className="flex flex-col">
              <h2 className="text-base font-semibold tracking-tight font-headline whitespace-nowrap"><span className="text-white">Blis</span><span className="text-green-500">tree</span> Tokens</h2>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent><SidebarMenu>{renderMenuItems()}</SidebarMenu></SidebarContent>
      <SidebarFooter>
          {loading ? (
            <div className="flex items-center gap-2 p-2"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex flex-col gap-1 w-full"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-full" /></div></div>
          ) : userProfile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild><div className="flex w-full cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-amber-400/10"><Avatar className="h-8 w-8">{userProfile.profileImageUrl && <AvatarImage src={userProfile.profileImageUrl} alt={userProfile.fullName} />}<AvatarFallback><User /></AvatarFallback></Avatar><div className="flex flex-col items-start truncate"><span className="text-sm font-medium">{userProfile.fullName}</span><span className="text-xs text-amber-300/70 truncate">{userProfile.email}</span></div></div></DropdownMenuTrigger>
              <DropdownMenuContent className='w-[448px]' side="top" align="start">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/wallet" className="flex justify-between items-center w-full"><span>Wallet</span><div className="flex items-center gap-1 font-bold text-green-500"><span className="font-sans font-bold">₿</span><span>{Math.floor(userProfile.minedCoins || 0)}</span></div></Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/profile">Profile</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}><LogOut className="mr-2 h-4 w-4" /><span>Log out</span></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
      </SidebarFooter>
    </SidebarBody>
  );
}

function MobileProfileSheet({ onAssistantClick }: { onAssistantClick: () => void }) {
    const { userProfile, logout } = useAuth();
    const router = useRouter();
    const [isOpen, setIsOpen] = React.useState(false);

    const handleLinkClick = (path: string) => { setIsOpen(false); router.push(path); };
    const handleLogout = () => { setIsOpen(false); logout(); };
    const handleAssistantClick = () => { setIsOpen(false); setTimeout(() => onAssistantClick(), 250); };

    const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';

    return (
      <>
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <button className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 focus:outline-none text-white"><User className="h-6 w-6" /><span className="text-[11px] font-medium leading-tight">Profile</span></button>
            </SheetTrigger>
            <SheetContent className="pt-8 text-white border-amber-400/50 flex flex-col" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                <SheetHeader><SheetTitle className="text-amber-300">My Account</SheetTitle></SheetHeader>
                <div className="flex-1 overflow-y-auto pb-8">
                    <div className="grid gap-4 py-4">
                        {isAdmin ? (
                          <>
                            <Button variant="outline" onClick={() => handleLinkClick('/admin/dashboard')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><LayoutDashboard className="mr-2 h-4 w-4" /> Admin Dashboard</Button>
                            <Button variant="outline" onClick={() => handleLinkClick('/admin/requests')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><Inbox className="mr-2 h-4 w-4" /> Requests</Button>
                            <Button variant="outline" onClick={() => handleLinkClick('/admin/track')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><BarChart2 className="mr-2 h-4 w-4" /> Track</Button>
                             <Button variant="outline" onClick={() => handleLinkClick('/admin/active-sessions')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><Clock className="mr-2 h-4 w-4" /> Active Sessions</Button>
                            <Button variant="outline" onClick={() => handleLinkClick('/admin/users')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><Users className="mr-2 h-4 w-4" /> Users</Button>
                            <Button variant="outline" onClick={() => handleLinkClick('/admin/find-user')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><UserSearch className="mr-2 h-4 w-4" /> Find User</Button>
                            <Button variant="outline" onClick={() => handleLinkClick('/admin/apply-code-user')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><UserCheck className="mr-2 h-4 w-4" /> Apply Code (User)</Button>
                             <Button variant="outline" onClick={() => handleLinkClick('/admin/chat-admin')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><MessageSquare className="mr-2 h-4 w-4" /> Support</Button>
                            <Button variant="outline" onClick={() => handleLinkClick('/admin/notify')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><Send className="mr-2 h-4 w-4" /> Notify</Button>
                            <Button variant="outline" onClick={() => handleLinkClick('/profile')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><User className="mr-2 h-4 w-4" /> View Profile</Button>
                             <Button variant="outline" onClick={() => handleLinkClick('/invite')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><UserPlus className="mr-2 h-4 w-4" /> Invite Friends</Button>
                             <Button variant="outline" onClick={() => handleLinkClick('/referrals')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><ShieldCheck className="mr-2 h-4 w-4" /> Security Circle</Button>
                             <Button variant="outline" onClick={() => handleLinkClick('/kyc')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><Fingerprint className="mr-2 h-4 w-4" /> KYC</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="outline" onClick={() => handleLinkClick('/profile')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><User className="mr-2 h-4 w-4" /> View Profile</Button>
                             <Button variant="outline" onClick={handleAssistantClick} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start relative"><Sparkles className="mr-2 h-4 w-4" /><span>Blistree Assistant</span></Button>
                             <Button variant="outline" onClick={() => handleLinkClick('/chat')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start relative"><MessageSquare className="mr-2 h-4 w-4" /><span>Support</span>{userProfile?.hasUnreadAdminMessage && <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>}</Button>
                             <Button variant="outline" onClick={() => handleLinkClick('/referrals')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><ShieldCheck className="mr-2 h-4 w-4" /> Security Circle</Button>
                            <Button variant="outline" onClick={() => handleLinkClick('/apply-code')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><FileCode className="mr-2 h-4 w-4" /> Apply Code</Button>
                            <Button variant="outline" onClick={() => { setIsOpen(false); window.open('https://blistree.com', '_blank'); }} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-between">
                                <div className="flex items-center"><Info className="mr-2 h-4 w-4" /> Project Info</div>
                                <ExternalLink className="h-4 w-4" />
                            </Button>
                             <Button variant="outline" onClick={() => handleLinkClick('/kyc')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><Fingerprint className="mr-2 h-4 w-4" /> KYC</Button>
                          </>
                        )}
                         <Button variant="outline" onClick={() => handleLinkClick('/live-report')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><BarChart2 className="mr-2 h-4 w-4" /> Live Report</Button>
                        <Button variant="outline" onClick={() => handleLinkClick('/privacy-policy')} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><FileText className="mr-2 h-4 w-4" /> Privacy Policy</Button>
                         <Button asChild variant="outline" className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><a href="https://play.google.com/store/apps/details?id=com.blistree.app" target="_blank" rel="noopener noreferrer"><Star className="mr-2 h-4 w-4" /> Rate on Play Store</a></Button>
                         <Button variant="outline" onClick={handleLogout} className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white justify-start"><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
      </>
    );
}

function BottomNav({ onAssistantClick }: { onAssistantClick: () => void }) {
  const { userProfile } = useAuth();
  const pathname = usePathname();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const initialHeight = window.visualViewport.height;
    const handleResize = () => {
      if (!window.visualViewport) return;
      setIsKeyboardOpen(window.visualViewport.height < initialHeight * 0.75);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => {
      if (window.visualViewport) window.visualViewport.removeEventListener('resize', handleResize);
    };
  }, []);

  const navItems = [
    { href: '/', icon: Pickaxe, label: 'Dashboard' },
    { href: '/invite', icon: UserPlus, label: 'Invite' },
    { href: '/spin-wheel', icon: Award, label: 'Spin' },
    { href: '/wallet', icon: Wallet, label: 'Wallet' },
  ];
  
  const authItems = [{ href: '/auth/login', icon: LogIn, label: 'Login' }];

  if (isKeyboardOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-amber-400/20 md:hidden pb-safe" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
      <nav className="grid h-16 grid-cols-5 items-stretch">
        {userProfile ? (
          <>
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn("flex flex-col items-center justify-center gap-1 p-2 text-white", pathname === item.href ? "text-amber-400" : "")}>
                <item.icon className="h-6 w-6" />
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </Link>
            ))}
            <MobileProfileSheet onAssistantClick={onAssistantClick} />
          </>
        ) : (
           <>
            {authItems.map((item) => <Link key={item.href} href={item.href} className={cn("flex flex-col items-center justify-center gap-1 p-2 text-white", pathname === item.href ? "text-amber-400" : "")}><item.icon className="h-6 w-6" /><span className="text-xs">{item.label}</span></Link>)}
             <Link href="/privacy-policy" className={cn("flex flex-col items-center justify-center gap-1 p-2 text-white", pathname === '/privacy-policy' ? "text-amber-400" : "")}><FileText className="h-6 w-6" /><span className="text-xs">Policy</span></Link>
          </>
        )}
      </nav>
    </div>
  );
}


function MainAppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading, showOnboarding, activeReferralsCount, miningRateBreakdown } = useAuth();
  const { open: isSidebarOpen, setOpen: setSidebarOpen } = useSidebar();
  const router = useRouter();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const isOnline = useOnlineStatus();
  const [isSessionActive, setIsSessionActive] = React.useState(false);
  const [showGhost, setShowGhost] = React.useState(false);
  const [isClient, setIsClient] = React.useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const handleAssistantClick = useCallback(() => setIsAssistantOpen(true), []);

  React.useEffect(() => setIsClient(true), []);
  
  const visualTotalRate = useMemo(() => {
    if (!miningRateBreakdown || !userProfile) return 0;
    const fromReferralsValue = activeReferralsCount * 0.25;
    const baseRate = 0.25;
    const appliedCodeBonus = userProfile.referredBy ? 0.25 : 0;
    return baseRate + appliedCodeBonus + miningRateBreakdown.boost + fromReferralsValue;
  }, [miningRateBreakdown, activeReferralsCount, userProfile]);


  React.useEffect(() => {
    if (userProfile && userProfile.sessionEndTime) {
      setIsSessionActive(Date.now() < userProfile.sessionEndTime);
    } else {
      setIsSessionActive(false);
    }
  }, [userProfile?.sessionEndTime]);

  React.useEffect(() => {
    if (isMobile) { setShowGhost(false); return; }
    if (!isSidebarOpen) {
      const hasSeen = localStorage.getItem('hasSeenSidebarGuide');
      if (!hasSeen) {
        const timer = setTimeout(() => setShowGhost(true), 2000);
        return () => clearTimeout(timer);
      }
    } else {
      if (showGhost) setShowGhost(false);
      localStorage.setItem('hasSeenSidebarGuide', 'true');
    }
  }, [isSidebarOpen, isMobile, showGhost]);
  
  const isChatPage = pathname === '/chat' || pathname.startsWith('/admin/chat-admin');
  const showHeader = isClient && !isChatPage;

  return (
    <div className={cn("relative flex h-screen w-full flex-col md:h-auto md:flex-row", !isOnline && "pointer-events-none opacity-50")}>
      <AssistantChatDialog open={isAssistantOpen} onOpenChange={setIsAssistantOpen} />
      <Sidebar><SidebarLayoutContent onAssistantClick={handleAssistantClick} /></Sidebar>
      <div className="flex flex-1 flex-col overflow-hidden">
        {showHeader && (
            <header className={cn("sticky top-0 z-30 flex h-14 w-full items-center justify-between pt-safe backdrop-blur-sm px-4", isMobile ? "bg-black" : "border-b bg-black hidden md:flex")}>
                <div className="flex items-center gap-2">
                    {isMobile ? (
                        <Link href="/" className="flex items-center gap-2"><Pickaxe className="h-6 w-6 text-amber-400" /><h1 className="text-base font-semibold font-headline whitespace-nowrap"><span className="text-white">Blis</span><span className="text-green-500">tree</span> Tokens</h1></Link>
                    ) : (
                        <>
                            <SidebarTrigger className="h-8 w-8 text-white" />
                            <Link href="/" className="flex items-center gap-2"><Pickaxe className="h-6 w-6 text-amber-400" /><h1 className="hidden text-base font-semibold font-headline whitespace-nowrap md:block"><span className="text-white">Blis</span><span className="text-green-500">tree</span> Tokens</h1></Link>
                        </>
                    )}
                </div>
              <div className="flex flex-1 items-center justify-end">
                <div className="flex items-center gap-3">
                  {userProfile && isSessionActive && (
                    <Popover>
                        <PopoverTrigger asChild><div className="flex items-center gap-2 text-sm font-medium text-green-500 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 cursor-pointer hover:bg-green-500/20"><Pickaxe className="h-4 w-4 animate-spin" /><span>{visualTotalRate.toFixed(2)}/hr</span></div></PopoverTrigger>
                        <MiningRateBreakdown />
                    </Popover>
                  )}
                </div>
              </div>
          </header>
        )}
        <SidebarInset>
            <main className={cn("flex-1 overflow-y-auto", !isChatPage && "pb-16 md:pb-0")}>
                <OnlineStatusIndicator />
                {children}
            </main>
        </SidebarInset>
      </div>
      {isClient && isMobile && <BottomNav onAssistantClick={handleAssistantClick} />}
      <GhostGuide show={showGhost} onToggle={() => setSidebarOpen(true)} />
      {userProfile && showOnboarding && <OnboardingDialog />}
    </div>
  );
}

function AppBody({ children }: { children: React.ReactNode }) {
  const { theme } = useAuth();
  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(theme);
  }, [theme]);
  return <>{children}</>;
}


export function AppLayout({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useAuth();
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) return <AppBody>{children}</AppBody>;

  return (
    <SidebarProvider>
      <AppBody><MainAppLayout>{children}</MainAppLayout></AppBody>
    </SidebarProvider>
  );
}
