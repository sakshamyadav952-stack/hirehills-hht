
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { useFirestore } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function NotifyPage() {
  const { sendUniversalMessage } = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    const messageDocRef = doc(firestore, 'universal_messages', 'current');
    const unsubscribe = onSnapshot(messageDocRef, (doc) => {
      if (doc.exists()) {
        setMessage(doc.data().text || '');
      }
      setIsFetching(false);
    }, (error) => {
      console.error("Error fetching universal message:", error);
      setIsFetching(false);
    });

    return () => unsubscribe();
  }, [firestore]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await sendUniversalMessage(message);
      toast({
        title: 'Message Saved',
        description: 'The universal message has been updated for all users.',
      });
    } catch (error) {
      // Error is handled in the auth hook
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isFetching) {
    return (
        <div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Send Notification for you</CardTitle>
          <CardDescription>
            This message will appear at the top of the homepage for all users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="grid w-full gap-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea 
                    placeholder="Type your message here." 
                    id="message" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />
            </div>
            <Button onClick={handleSave} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
