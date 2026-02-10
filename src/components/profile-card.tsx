'use client';

import { useAuth } from '@/lib/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Mail, Phone, Calendar, Badge, ShieldCheck, ShieldAlert, Loader2, Hash, UserCheck, Edit, Trash2, LogOut, ChevronRight, Shield, Moon, Sun, Globe, Languages } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneVerificationDialog } from './phone-verification-dialog';
import { AddEmailDialog } from './add-email-dialog';
import { useUser } from '@/firebase'; // Import useUser to get the auth user object
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { EditProfileForm } from './edit-profile-form';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function ProfileCard() {
  const { userProfile, loading, emailVerified, sendVerificationEmail, logout, theme, setTheme, updateUserProfile } = useAuth();
  const { user } = useUser(); // Get the raw Firebase Auth user
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleSendVerification = async () => {
    // This is the critical check. The user object from Firebase Auth must have an email.
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

  const handleLogout = () => {
    logout();
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
    if (userProfile.createdAt instanceof Timestamp) {
      date = userProfile.createdAt.toDate();
    } else if (typeof userProfile.createdAt === 'object' && 'seconds' in userProfile.createdAt) {
      date = new Date((userProfile.createdAt as any).seconds * 1000);
    } else {
       return 'N/A';
    }
    
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const registrationDate = getRegistrationDate();
  const hasRealEmail = userProfile.email && !userProfile.email.endsWith('@blistree.in');

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary">
          {userProfile.profileImageUrl && <AvatarImage src={userProfile.profileImageUrl} alt={userProfile.fullName} />}
          <AvatarFallback className="text-4xl"><User /></AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{userProfile.fullName}</h1>
          <p className="text-sm text-muted-foreground font-mono">CODE: {userProfile.profileCode}</p>
           {userProfile.referredByName && userProfile.id !== userProfile.referredBy && (
              <div className="flex items-center justify-center gap-1.5 text-green-500 mt-1">
                  <UserCheck className="h-4 w-4" />
                  <span className="text-xs font-medium">Referred by: {userProfile.referredByName}</span>
              </div>
          )}
        </div>
      </div>

      {/* Details Card */}
      <Card className="mt-6 shadow-none border-x-0 rounded-none sm:rounded-lg sm:border">
        <CardHeader>
          <CardTitle>Personal Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                <div className='flex items-center gap-4'>
                    <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground break-all">{hasRealEmail ? userProfile.email : 'Not provided'}</p>
                    </div>
                </div>
                {emailVerified ? (
                  <div className="flex items-center gap-2 text-xs text-green-500 shrink-0 self-end sm:self-center">
                      <ShieldCheck className="h-4 w-4" />
                      <span>Verified</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {hasRealEmail && (
                      <Button onClick={handleSendVerification} disabled={isSending} size="sm" variant="secondary">
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Verify</span>}
                      </Button>
                    )}
                    <AddEmailDialog />
                  </div>
                )}
            </div>
            {userProfile.mobileNumber && userProfile.mobileNumber.trim() !== '' && (
              <div className="flex items-center justify-between p-4">
                  <div className='flex items-center gap-4'>
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                          <p className="text-sm font-medium">Mobile</p>
                          <p className="text-sm text-muted-foreground">{userProfile.mobileNumber}</p>
                      </div>
                  </div>
                  {userProfile.phoneVerified ? (
                      <div className="flex items-center gap-2 text-xs text-green-500 shrink-0">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Verified</span>
                      </div>
                  ) : (
                      <PhoneVerificationDialog />
                  )}
              </div>
            )}
            <div className="flex items-center justify-between p-4">
                <div className='flex items-center gap-4'>
                    <Badge className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm font-medium">Gender</p>
                        <p className="text-sm text-muted-foreground capitalize">{userProfile.gender}</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between p-4">
                <div className='flex items-center gap-4'>
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm font-medium">Country</p>
                        <p className="text-sm text-muted-foreground">{userProfile.country || 'Not specified'}</p>
                    </div>
                </div>
            </div>
             <div className="flex items-center justify-between p-4">
                <div className='flex items-center gap-4'>
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <p className="text-sm font-medium">Joined On</p>
                        <p className="text-sm text-muted-foreground">{registrationDate}</p>
                    </div>
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Actions Card */}
      <Card className="mt-6 shadow-none border-x-0 rounded-none sm:rounded-lg sm:border">
        <CardHeader>
          <CardTitle>Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
           <div className="divide-y">
                {/* <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        <Languages className="h-5 w-5 text-muted-foreground" />
                        <Label htmlFor="language-select" className="text-sm font-medium">
                            Language
                        </Label>
                    </div>
                    <Select value={userProfile.language || 'en'} onValueChange={(value) => updateUserProfile({ language: value })}>
                        <SelectTrigger id="language-select" className="w-[150px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="es">Español</SelectItem>
                            <SelectItem value="fr">Français</SelectItem>
                            <SelectItem value="de">Deutsch</SelectItem>
                            <SelectItem value="hi">हिन्दी</SelectItem>
                            <SelectItem value="pt">Português</SelectItem>
                            <SelectItem value="zh">中文</SelectItem>
                        </SelectContent>
                    </Select>
                </div> */}
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                        {theme === 'dark' ? <Sun className="h-5 w-5 text-muted-foreground" /> : <Moon className="h-5 w-5 text-muted-foreground" />}
                        <Label htmlFor="theme-switch" className="text-sm font-medium">
                            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                        </Label>
                    </div>
                    <Switch
                        id="theme-switch"
                        checked={theme === 'dark'}
                        onCheckedChange={toggleTheme}
                    />
                </div>
                 <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 active:bg-muted/80 transition-colors">
                            <div className="flex items-center gap-4">
                                <Edit className="h-5 w-5 text-muted-foreground" />
                                <span className="text-sm font-medium">Edit Profile</span>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </button>
                    </DialogTrigger>
                    <DialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                        <DialogHeader>
                            <DialogTitle className="text-amber-300">Edit Profile</DialogTitle>
                        </DialogHeader>
                        <EditProfileForm onSuccess={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>

                <Button asChild variant="ghost" className="w-full justify-between p-4 h-auto font-normal">
                    <Link href="/delete-your-data">
                        <div className="flex items-center gap-4">
                            <Trash2 className="h-5 w-5 text-destructive" />
                            <span className="text-sm font-medium text-destructive">Delete Account</span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </Link>
                </Button>
                
                 <button onClick={handleLogout} className="w-full flex items-center justify-between p-4 hover:bg-muted/50 active:bg-muted/80 transition-colors">
                    <div className="flex items-center gap-4">
                        <LogOut className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">Log Out</span>
                    </div>
                </button>
           </div>
        </CardContent>
      </Card>
    </div>
  );
}
