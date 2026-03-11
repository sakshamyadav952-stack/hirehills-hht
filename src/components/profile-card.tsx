'use client';

import { useAuth } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, Calendar, ShieldCheck, Loader2, Edit, Trash2, LogOut, ChevronRight, Sun, Moon, Globe, UserCheck } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneVerificationDialog } from './phone-verification-dialog';
import { AddEmailDialog } from './add-email-dialog';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { EditProfileForm } from './edit-profile-form';
import Link from 'next/link';

export function ProfileCard() {
  const { userProfile, loading, emailVerified, sendVerificationEmail, logout, theme, setTheme } = useAuth();
  const { user } = useUser();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleSendVerification = async () => {
    if (!user?.email) {
        toast({
            title: 'Email Not Synced',
            description: 'Your authentication record has no email. Please use the "Change Email" button to re-sync it.',
            variant: 'destructive',
            duration: 8000,
        });
        return;
    }
    setIsSending(true);
    await sendVerificationEmail();
    setIsSending(false);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (loading || !userProfile) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2 text-center">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  const getRegistrationDate = () => {
    if (!userProfile?.createdAt) return 'N/A';
    let date;
    if (userProfile.createdAt instanceof Timestamp) date = userProfile.createdAt.toDate();
    else if (typeof userProfile.createdAt === 'object' && 'seconds' in userProfile.createdAt) date = new Date((userProfile.createdAt as any).seconds * 1000);
    else return 'N/A';
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const registrationDate = getRegistrationDate();
  const hasRealEmail = userProfile.email && !userProfile.email.endsWith('@hirehills.in');

  return (
    <div className="w-full px-3 sm:px-4">
      <div className="flex flex-col items-center gap-3 sm:gap-4 pt-6 sm:pt-8">
        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-4 border-background ring-2 ring-primary">
          {userProfile.profileImageUrl && <AvatarImage src={userProfile.profileImageUrl} alt={userProfile.fullName} />}
          <AvatarFallback className="text-3xl sm:text-4xl"><User /></AvatarFallback>
        </Avatar>
        <div className="text-center px-4">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight">{userProfile.fullName}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-1 opacity-60">ID: {userProfile.profileCode}</p>
           {userProfile.referredByName && userProfile.id !== userProfile.referredBy && (
              <div className="flex items-center justify-center gap-1.5 text-green-500 mt-2 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                  <UserCheck className="h-3 w-3" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Referred by {userProfile.referredByName}</span>
              </div>
          )}
        </div>
      </div>

      <Card className="mt-8 shadow-md border border-border overflow-hidden rounded-[1.5rem] sm:rounded-[2rem]">
        <CardHeader className="bg-secondary/30 pb-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Node Identity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-3 sm:gap-4">
                <div className='flex items-center gap-3 sm:gap-4 w-full sm:w-auto'>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Email_Address</p>
                        <p className="text-xs sm:text-sm font-bold text-foreground break-all">{hasRealEmail ? userProfile.email : 'NOT_SYNCED'}</p>
                    </div>
                </div>
                {emailVerified ? (
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase shrink-0 self-end sm:self-center">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {hasRealEmail && (
                      <Button onClick={handleSendVerification} disabled={isSending} size="sm" variant="secondary" className="h-8 text-[10px] font-black uppercase rounded-lg">
                          {isSending ? <Loader2 className="h-3 w-3 animate-spin" /> : <span>Verify</span>}
                      </Button>
                    )}
                    <AddEmailDialog />
                  </div>
                )}
            </div>

            {userProfile.mobileNumber && userProfile.mobileNumber.trim() !== '' && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 gap-3 sm:gap-4">
                  <div className='flex items-center gap-3 sm:gap-4 w-full sm:w-auto'>
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Mobile_Link</p>
                          <p className="text-xs sm:text-sm font-bold text-foreground">{userProfile.mobileNumber}</p>
                      </div>
                  </div>
                  {userProfile.phoneVerified ? (
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-green-500 uppercase shrink-0 self-end sm:self-center">
                          <ShieldCheck className="h-3.5 w-3.5" />
                          <span>Verified</span>
                      </div>
                  ) : (
                      <div className="self-end sm:self-center">
                        <PhoneVerificationDialog />
                      </div>
                  )}
              </div>
            )}

            <div className="flex items-center justify-between p-4 sm:p-5">
                <div className='flex items-center gap-3 sm:gap-4'>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Origin_Node</p>
                        <p className="text-xs sm:text-sm font-bold text-foreground uppercase">{userProfile.country || 'STATION_UNKNOWN'}</p>
                    </div>
                </div>
            </div>

             <div className="flex items-center justify-between p-4 sm:p-5">
                <div className='flex items-center gap-3 sm:gap-4'>
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Commission_Date</p>
                        <p className="text-xs sm:text-sm font-bold text-foreground uppercase">{registrationDate}</p>
                    </div>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-6 sm:mt-8 shadow-md border border-border overflow-hidden rounded-[1.5rem] sm:rounded-[2rem] mb-24 sm:mb-10">
        <CardHeader className="bg-secondary/30 pb-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">Node Config</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y divide-border/50">
                <div className="flex items-center justify-between p-4 sm:p-5">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            {theme === 'dark' ? <Sun className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
                        </div>
                        <Label htmlFor="theme-switch" className="text-xs sm:text-sm font-bold uppercase tracking-tight">
                            {theme === 'dark' ? 'Light Spectrum' : 'Dark Matrix'}
                        </Label>
                    </div>
                    <Switch id="theme-switch" checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                </div>

                 <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <button className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/50 active:bg-secondary/80 transition-colors text-left">
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                                    <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold uppercase tracking-tight">Update Node Metadata</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="text-foreground border-border w-[95%] max-w-md rounded-3xl p-6">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-black uppercase tracking-tighter">Edit Node Identity</DialogTitle>
                        </DialogHeader>
                        <EditProfileForm onSuccess={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>

                <Button asChild variant="ghost" className="w-full justify-between p-4 sm:p-5 h-auto font-normal rounded-none hover:bg-destructive/5 group transition-all">
                    <Link href="/delete-your-data">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0 group-hover:bg-destructive/20 transition-all">
                                <Trash2 className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
                            </div>
                            <span className="text-xs sm:text-sm font-bold uppercase tracking-tight text-destructive">Terminate Node Account</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30" />
                    </Link>
                </Button>
                
                 <button onClick={logout} className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-secondary/50 active:bg-secondary/80 transition-colors text-left">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                            <LogOut className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
                        </div>
                        <span className="text-xs sm:text-sm font-bold uppercase tracking-tight text-red-400">Disconnect Session</span>
                    </div>
                </button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
