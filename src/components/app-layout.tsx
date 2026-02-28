"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Pickaxe, User, LogIn, LogOut, Menu, Wallet, 
  Loader2, Settings, Activity, Trophy, BarChart2,
  FileText, Star, ShieldCheck, UserPlus, FileCode
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
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
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
              <Link href="/"><BarChart2 /><span>Dashboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/wallet'} tooltip="Wallet">
              <Link href="/wallet"><Wallet /><span>Wallet</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/leaderboard'} tooltip="Leaderboard">
              <Link href="/leaderboard"><Trophy /><span>Leaderboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/referrals'} tooltip="Security Circle">
              <Link href="/referrals"><ShieldCheck /><span>Security Circle</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/invite'} tooltip="Invite">
              <Link href="/invite"><UserPlus /><span>Invite Friends</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/privacy-policy'} tooltip="Privacy">
              <Link href="/privacy-policy"><FileText /><span>Privacy Policy</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={() => { logout(); handleLinkClick(); }}>
            <SidebarMenuButton tooltip="Logout">
              <LogOut /><span>Log Out</span>
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
    <SidebarBody>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.5)]">
            <Pickaxe className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold leading-tight">Hirehills</h2>
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">HOT Token</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>{renderMenuItems()}</SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        {userProfile && (
          <div className="flex items-center gap-3 p-4 glass-card rounded-2xl m-2 border-white/5">
            <Avatar className="h-10 w-10 border border-white/10">
              <AvatarImage src={userProfile.profileImageUrl} />
              <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate">
              <span className="text-white text-sm font-bold truncate">{userProfile.fullName}</span>
              <span className="text-white/40 text-[10px] truncate">{userProfile.email}</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </SidebarBody>
  );
}

function BottomNav() {
  const pathname = usePathname();
  const { userProfile } = useAuth();

  if (!userProfile) return null;

  const navItems = [
    { href: '/', icon: BarChart2, label: 'Stats' },
    { href: '/leaderboard', icon: Trophy, label: 'Rank' },
    { href: '/wallet', icon: Wallet, label: 'Wallet' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe px-4 py-2">
      <nav className="glass-card rounded-[2rem] h-16 flex items-center justify-around px-4 border-white/10 shadow-2xl">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300",
              pathname === item.href ? "text-neon-cyan scale-110" : "text-white/40 hover:text-white/60"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          </Link>
        ))}
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
        <Sidebar>
          <SidebarLayoutContent />
        </Sidebar>
        <SidebarInset className="bg-transparent">
          <div className="flex flex-col h-full overflow-hidden">
            <header className="h-14 flex items-center px-4 md:hidden">
              <SidebarTrigger className="text-white" />
            </header>
            <main className="flex-1 overflow-y-auto">
              {children}
            </main>
          </div>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}