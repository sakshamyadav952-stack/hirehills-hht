
"use client";

import React from 'react';
import Link from 'next/link';
import { 
  User, LogIn, LogOut, Wallet, 
  Trophy, LayoutGrid,
  FileText, ShieldCheck, UserPlus,
  ArrowLeft, ChevronRight
} from 'lucide-react';
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
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

function SidebarLayoutContent() {
  const { userProfile, loading, logout } = useAuth();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => setOpenMobile(false);

  const renderMenuItems = () => {
    if (loading) return null;

    if (userProfile) {
      return (
        <>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/'} tooltip="Dashboard">
              <Link href="/"><LayoutGrid className="text-purple-400" /><span>Dashboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/wallet'} tooltip="Wallet">
              <Link href="/wallet"><Wallet className="text-cyan-400" /><span>Wallet</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/leaderboard'} tooltip="Leaderboard">
              <Link href="/leaderboard"><Trophy className="text-amber-400" /><span>Leaderboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/referrals'} tooltip="Security Circle">
              <Link href="/referrals"><ShieldCheck className="text-green-400" /><span>Security Circle</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/invite'} tooltip="Invite">
              <Link href="/invite"><UserPlus className="text-pink-400" /><span>Invite Friends</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/privacy-policy'} tooltip="Privacy">
              <Link href="/privacy-policy"><FileText className="text-white/40" /><span>Privacy Policy</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={() => { logout(); handleLinkClick(); }}>
            <SidebarMenuButton tooltip="Logout">
              <LogOut className="text-red-400" /><span>Log Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </>
      )
    }

    return (
      <SidebarMenuItem onClick={handleLinkClick}>
        <SidebarMenuButton asChild isActive={pathname === '/auth/login'}>
          <Link href="/auth/login"><LogIn /><span>Login</span></Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <SidebarBody className="bg-black h-full">
      <SidebarHeader>
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <LayoutGrid className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-black leading-none tracking-tight">HIREHILLS</h2>
              <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-1">HOT NETWORK</p>
            </div>
          </div>
          <button 
            onClick={() => setOpenMobile(false)}
            className="md:hidden w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-4 py-2">{renderMenuItems()}</SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="pb-10">
        {userProfile && (
          <Link 
            href="/profile" 
            onClick={handleLinkClick}
            className="flex items-center gap-3 p-4 glass-card rounded-3xl m-4 border-white/5 hover:bg-white/10 transition-colors group"
          >
            <Avatar className="h-10 w-10 border border-white/10">
              <AvatarImage src={userProfile.profileImageUrl} />
              <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate flex-1">
              <span className="text-white text-sm font-bold truncate">{userProfile.fullName}</span>
              <span className="text-purple-400 text-[10px] uppercase font-bold tracking-wider">View Profile</span>
            </div>
            <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-white transition-colors" />
          </Link>
        )}
      </SidebarFooter>
    </SidebarBody>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { userProfile } = useAuth();
  const { setOpenMobile } = useSidebar();

  if (!userProfile) return null;

  const navItems = [
    { href: '/', icon: LayoutGrid, label: 'Dash' },
    { href: '/invite', icon: UserPlus, label: 'Invite' },
    { href: '/wallet', icon: Wallet, label: 'Wallet' },
    { href: '/referrals', icon: ShieldCheck, label: 'Circle' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe px-6 py-4">
      <nav className="glass-card rounded-[2.5rem] h-20 flex items-center justify-around px-2 border-white/10 shadow-2xl shadow-black bg-zinc-900/90 backdrop-blur-xl">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-14 h-14 rounded-2xl",
              pathname === item.href ? "bg-white/5 text-purple-400" : "text-white/30 hover:text-white/60"
            )}
          >
            <item.icon className={cn("h-5 w-5", pathname === item.href && "animate-pulse")} />
            <span className="text-[8px] font-black uppercase tracking-[0.1em]">{item.label}</span>
          </Link>
        ))}
        {/* Profile Trigger */}
        <button 
          onClick={() => setOpenMobile(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-14 h-14 rounded-2xl",
            pathname === '/profile' ? "text-purple-400" : "text-white/30 hover:text-white/60"
          )}
        >
          <User className="h-5 w-5" />
          <span className="text-[8px] font-black uppercase tracking-[0.1em]">Profile</span>
        </button>
      </nav>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) return <div className="app-background">{children}</div>;

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden app-background">
        <Sidebar className="hidden md:flex">
          <SidebarLayoutContent />
        </Sidebar>
        <SidebarInset className="bg-transparent">
          <div className="flex flex-col h-full overflow-hidden">
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </SidebarInset>
        {/* Mobile Full-Page Sidebar via Sheet */}
        <div className="md:hidden">
          <Sidebar>
            <SidebarLayoutContent />
          </Sidebar>
        </div>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
