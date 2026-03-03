"use client";

import React from 'react';
import Link from 'next/link';
import { 
  User, LogIn, LogOut, Wallet, 
  Trophy, LayoutGrid,
  FileText, ShieldCheck, UserPlus,
  ArrowLeft, ChevronRight, Ticket
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
              <Link href="/"><LayoutGrid className="text-primary" /><span>Dashboard</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/profile'} tooltip="Profile">
              <Link href="/profile"><User className="text-blue-400" /><span>Profile</span></Link>
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
            <SidebarMenuButton asChild isActive={pathname === '/apply-code'} tooltip="Apply Code">
              <Link href="/apply-code"><Ticket className="text-yellow-400" /><span>Apply Code</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/invite'} tooltip="Invite">
              <Link href="/invite"><UserPlus className="text-pink-400" /><span>Invite Friends</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={handleLinkClick}>
            <SidebarMenuButton asChild isActive={pathname === '/privacy-policy'} tooltip="Privacy">
              <Link href="/privacy-policy"><FileText className="text-muted-foreground" /><span>Privacy Policy</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem onClick={() => { logout(); handleLinkClick(); }}>
            <SidebarMenuButton tooltip="Logout">
              <LogOut className="text-destructive" /><span>Log Out</span>
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
    <SidebarBody className="bg-background h-full border-r">
      <SidebarHeader>
        <div className="flex items-center justify-between p-4 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)]">
              <LayoutGrid className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-foreground font-black leading-none tracking-tight text-sm sm:text-base uppercase">HIREHILLS</h2>
              <p className="text-muted-foreground text-[8px] sm:text-[10px] font-bold uppercase tracking-widest mt-1">HOT NETWORK</p>
            </div>
          </div>
          <button 
            onClick={() => setOpenMobile(false)}
            className="md:hidden w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu className="px-3 sm:px-4 py-2">{renderMenuItems()}</SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="pb-8 sm:pb-10 border-t">
        {userProfile && (
          <Link 
            href="/profile" 
            onClick={handleLinkClick}
            className="flex items-center gap-3 p-3 sm:p-4 rounded-xl hover:bg-secondary transition-colors group"
          >
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border">
              <AvatarImage src={userProfile.profileImageUrl} />
              <AvatarFallback><User /></AvatarFallback>
            </Avatar>
            <div className="flex flex-col truncate flex-1">
              <span className="text-foreground text-xs sm:text-sm font-bold truncate">{userProfile.fullName}</span>
              <span className="text-primary text-[8px] sm:text-[10px] uppercase font-bold tracking-wider leading-none mt-0.5">View Profile</span>
            </div>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
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
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-safe bg-background border-t border-border shadow-lg">
      <nav className="h-16 xs:h-20 flex items-center justify-around px-2">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href} 
            className={cn(
              "flex flex-col items-center justify-center gap-1 transition-all duration-300 w-14 h-14 rounded-xl",
              pathname === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", pathname === item.href && "animate-pulse")} />
            <span className="text-[8px] font-black uppercase tracking-wider">{item.label}</span>
          </Link>
        ))}
        <button 
          onClick={() => setOpenMobile(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1 transition-all duration-300 w-14 h-14 rounded-xl",
            pathname === '/profile' ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-5 w-5" />
          <span className="text-[8px] font-black uppercase tracking-wider">Profile</span>
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
