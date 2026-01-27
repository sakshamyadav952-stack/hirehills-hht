
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star, Loader2, Send, Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  claimedAmount: number;
}

export function FeedbackDialog({ open, onOpenChange, claimedAmount }: FeedbackDialogProps) {
  const { userProfile, setUserHasRatedOnPlayStore, createSupportChatFromFeedback } = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasPlayStorePrompted, setWasPlayStorePrompted] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const hasAlreadyRated = userProfile?.hasRatedOnPlayStore || false;

  useEffect(() => {
    // Reset state when dialog is reopened
    if (open) {
      setRating(0);
      setHoverRating(0);
      setFeedback('');
      setWasPlayStorePrompted(false);
      setIsSubmitting(false);
      setIsSubmitted(false);
    }
  }, [open]);
  
  const createOrUpdateReview = async (currentRating: number, feedbackText: string = '', prompted: boolean = wasPlayStorePrompted) => {
    if (!userProfile || currentRating === 0) return;
    
    try {
      const reviewDocRef = doc(firestore, 'reviews', userProfile.id);
      
      await setDoc(reviewDocRef, {
        userId: userProfile.id,
        userName: userProfile.fullName,
        profileCode: userProfile.profileCode,
        rating: currentRating,
        feedback: feedbackText || feedback,
        wasPlayStorePrompted: prompted,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

    } catch (error) {
      console.error("Error submitting review:", error);
    }
  };

  const handleRatingClick = (newRating: number) => {
    setRating(newRating);
    // Immediately create/update the review when a star is clicked
    createOrUpdateReview(newRating);
  };

  const handleSubmitFeedback = async () => {
      if (isSubmitting || !feedback.trim()) return;
      setIsSubmitting(true);
      
      if (rating <= 3) {
          await createSupportChatFromFeedback(rating, feedback);
          onOpenChange(false);
          router.push('/chat');
      } else {
          // For high ratings, update the existing review with the feedback text
          await createOrUpdateReview(rating, feedback);
          setIsSubmitted(true); // Show confirmation
      }
      
      setIsSubmitting(false);
  }

  const handleRateOnPlayStore = () => {
    setWasPlayStorePrompted(true);
    setUserHasRatedOnPlayStore();
    // Ensure the latest state is saved before redirecting
    createOrUpdateReview(rating, feedback, true);
    setIsSubmitted(true); // Show confirmation
  };

  const ConfirmationMessage = () => (
    <DialogHeader className="text-center">
        <DialogTitle className="text-xl font-bold flex items-center justify-center gap-2">
            ✨ Congratulations! ✨
        </DialogTitle>
        <DialogDescription className="text-green-200/80 pt-2">
            You’ve gained ownership of {claimedAmount.toFixed(4)} BLIT coins from the 200M total supply. They’ve been added to your wallet.
        </DialogDescription>
    </DialogHeader>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="text-white border-amber-400/50" 
        style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}
      >
        <ConfirmationMessage />
        
        {!hasAlreadyRated && (
             <div className="py-4 border-t border-amber-400/20 mt-4">
                <DialogHeader>
                    <DialogTitle className="text-amber-300 text-center text-xl">How was your experience?</DialogTitle>
                    <DialogDescription className="text-amber-200/80 text-center">
                        Your feedback helps us improve Blistree.
                    </DialogDescription>
                </DialogHeader>
                
                {isSubmitted ? (
                    <div className="text-center space-y-4 my-6 animate-in fade-in-50">
                        <Check className="mx-auto h-12 w-12 text-green-400" />
                        <p className="text-lg font-semibold">Thank you for your feedback!</p>
                        <p className="text-sm text-muted-foreground">Your input is valuable to us.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center gap-2 my-6">
                            {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                                key={star}
                                className={cn(
                                "w-10 h-10 cursor-pointer transition-all duration-200 transform",
                                star <= (hoverRating || rating)
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-gray-600",
                                star <= hoverRating ? "scale-110" : ""
                                )}
                                onClick={() => handleRatingClick(star)}
                                onMouseEnter={() => setHoverRating(star)}
                                onMouseLeave={() => setHoverRating(0)}
                            />
                            ))}
                        </div>

                        {rating > 0 && rating <= 3 && (
                            <div className="space-y-4">
                                <Textarea
                                    placeholder="Tell us how we can improve..."
                                    value={feedback}
                                    onChange={(e) => setFeedback(e.target.value)}
                                    className="bg-slate-900/50 border-amber-400/30 text-white min-h-[100px]"
                                />
                                <div className="flex flex-col gap-2">
                                    <Button onClick={handleSubmitFeedback} disabled={isSubmitting || !feedback.trim()} className="w-full bg-amber-500 text-black hover:bg-amber-400">
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Submit Feedback
                                    </Button>
                                </div>
                            </div>
                        )}

                        {rating > 3 && (
                            <div className="text-center space-y-4 animate-in fade-in-50">
                                <p className="text-lg font-semibold">Thank you for the high rating!</p>
                                <p className="text-sm text-muted-foreground">We appreciate your support.</p>
                                <div className="flex flex-col gap-2">
                                    <Button onClick={handleRateOnPlayStore} className="w-full bg-green-500 text-white hover:bg-green-600">
                                        <Check className="mr-2 h-4 w-4" />
                                        Confirm Feedback
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
             </div>
        )}

        <DialogFooter className="mt-4">
            <DialogClose asChild>
                <Button variant="outline" className="w-full bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Close</Button>
            </DialogClose>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
