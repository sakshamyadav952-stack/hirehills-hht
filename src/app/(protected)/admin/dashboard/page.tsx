
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFirestore, useMemoFirebase } from '@/firebase';
import { collection, onSnapshot, doc, updateDoc, runTransaction, arrayUnion, query, where, getDocs, writeBatch, increment, getDoc, orderBy, Timestamp, documentId } from 'firebase/firestore';
import { Loader2, User, Shield, Inbox, Check, X, Coins, Award, Settings, MessageSquare, Send, Star, Banknote, Building2, UserCheck, Share2, AtSign, Smartphone, Gift, Save, FilePen } from 'lucide-react';
import type { UserProfile, WithdrawalRequest, PendingTransfer, Transaction, Note, Review, ReferralRequest, AirdropConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { FacebookIcon, XIcon } from '@/components/icons/social-icons';
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DatePicker } from '@/components/ui/date-picker';

type RequestWithUser = {
    user: UserProfile;
    request: WithdrawalRequest;
};

type Classification = 'accepted' | 'rejected' | 'unclassified';

function WithdrawalRequestsList({
    requests,
    isLoading,
    onUpdateClassification,
}: {
    requests: RequestWithUser[],
    isLoading: boolean,
    onUpdateClassification?: (user: UserProfile, request: WithdrawalRequest, classification: Classification) => void,
}) {
    const { setWithdrawalRate } = useAuth();
    const { toast } = useToast();
    
    const [rateDialogOpen, setRateDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RequestWithUser | null>(null);

    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState<'inr' | 'usd'>('inr');
    const [blistreeCoins, setBlistreeCoins] = useState('');

    const openRateDialog = (item: RequestWithUser) => {
        setSelectedRequest(item);
        setRateDialogOpen(true);
    };

    const handleSendRate = async () => {
        if (!selectedRequest || !amount || !blistreeCoins) {
            toast({ title: "Missing fields", description: "Please fill out all rate fields.", variant: "destructive" });
            return;
        }

        const rateData = {
            amount: parseFloat(amount),
            currency: currency,
            blistreeCoins: parseFloat(blistreeCoins),
        };

        try {
            await setWithdrawalRate(selectedRequest.user.id, selectedRequest.request.requestId, rateData);
            setRateDialogOpen(false);
            // Reset form
            setAmount('');
            setCurrency('inr');
            setBlistreeCoins('');
            setSelectedRequest(null);
        } catch (error) {
            // Toast is handled in the auth hook
        }
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (requests.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                <Inbox className="h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold">No Requests Found</h3>
                <p className="text-sm text-muted-foreground">There are currently no requests in this category.</p>
            </div>
        );
    }

    return (
        <>
            <Accordion type="single" collapsible className="w-full space-y-4">
                {requests.map((item) => {
                    return (
                        <AccordionItem value={item.request.requestId} key={item.request.requestId}>
                            <Card>
                                <AccordionTrigger className="p-6 w-full">
                                   <div className="flex justify-between items-center w-full">
                                        <div>
                                            <p className="font-bold">{item.user.fullName}</p>
                                            <p className="text-sm text-muted-foreground">
                                                Requests to withdraw <span className="font-semibold text-foreground">{item.request.requestedAmount.toLocaleString()}</span> coins
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-xs">{new Date(item.request.createdAt).toLocaleString()}</p>
                                        </div>
                                   </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-6">
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div><span className="font-medium">User ID:</span> <span className="font-mono">{item.user.id}</span></div>
                                            <div><span className="font-medium">Profile Code:</span> <span className="font-mono">{item.user.profileCode}</span></div>
                                            <div><span className="font-medium">Available Coins:</span> <span className="font-mono">{(item.request.availableCoins ?? 0).toFixed(4)}</span></div>
                                            <div><span className="font-medium">Requested:</span> <span className="font-mono">{item.request.requestedAmount} BLIT</span></div>
                                            
                                            {item.request.withdrawalMethod === 'bank' ? (
                                                <>
                                                    <div className="col-span-2 mt-2 pt-2 border-t">
                                                        <p className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> Bank Details</p>
                                                    </div>
                                                    <div><span className="font-medium">Holder Name:</span> <span className="font-mono">{item.request.accountHolderName}</span></div>
                                                    <div><span className="font-medium">Bank:</span> <span className="font-mono">{item.request.bankName}</span></div>
                                                    <div><span className="font-medium">Account No:</span> <span className="font-mono">{item.request.accountNumber}</span></div>
                                                    <div><span className="font-medium">IFSC:</span> <span className="font-mono">{item.request.ifscCode}</span></div>
                                                </>
                                            ) : (
                                                <div className="col-span-2"><span className="font-medium">UPI ID:</span> <span className="font-mono">{item.request.upiId}</span></div>
                                            )}
                                            
                                            {item.request.rateStatus && (
                                                <div>
                                                    <span className="font-medium">Rate Status:</span>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "ml-2",
                                                            item.request.rateStatus === 'accepted' && "border-green-500 text-green-500",
                                                            item.request.rateStatus === 'denied' && "border-red-500 text-red-500",
                                                        )}
                                                    >
                                                        {item.request.rateStatus.charAt(0).toUpperCase() + item.request.rateStatus.slice(1)}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                        {item.request.adminComment && (
                                            <div className="p-3 rounded-md bg-muted text-sm">
                                                <p className="font-medium">Admin Comment:</p>
                                                <p className="text-muted-foreground">{item.request.adminComment}</p>
                                            </div>
                                        )}
                                        {onUpdateClassification && (
                                            <div className="flex justify-end gap-2 mt-4">
                                                <Button size="sm" variant="destructive" onClick={() => onUpdateClassification(item.user, item.request, 'rejected')}>
                                                  <X className="mr-2 h-4 w-4" />
                                                  Reject
                                                </Button>
                                                <Button size="sm" variant="secondary" onClick={() => onUpdateClassification(item.user, item.request, 'accepted')}>
                                                  <Check className="mr-2 h-4 w-4" />
                                                  Accept
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => openRateDialog(item)}>
                                                    <Star className="mr-2 h-4 w-4" />
                                                    Rate
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </AccordionContent>
                            </Card>
                        </AccordionItem>
                    )
                })}
            </Accordion>
            
            <Dialog open={rateDialogOpen} onOpenChange={setRateDialogOpen}>
                <DialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-amber-300">Set Blistree Rate</DialogTitle>
                        <DialogDescription className="text-amber-200/80">
                            Set the conversion rate for Blistree coins for this user's request.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="amount" className="text-amber-200/90">Amount</Label>
                            <Input id="amount" placeholder="Enter the amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-slate-900/50 border-amber-400/30 text-white" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="currency" className="text-amber-200/90">Currency</Label>
                            <Select onValueChange={(value: 'inr' | 'usd') => setCurrency(value)} defaultValue={currency}>
                                <SelectTrigger className="bg-slate-900/50 border-amber-400/30 text-white">
                                    <SelectValue placeholder="Select a currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inr">INR</SelectItem>
                                    <SelectItem value="usd">USD</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="blistree-coins" className="text-amber-200/90">Blistree Coins</Label>
                            <Input id="blistree-coins" placeholder="How many Blistree coins" type="number" value={blistreeCoins} onChange={(e) => setBlistreeCoins(e.target.value)} className="bg-slate-900/50 border-amber-400/30 text-white" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleSendRate} className="bg-amber-500 text-black hover:bg-amber-400">Send</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

function WithdrawalRequestsManager() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [allRequests, setAllRequests] = useState<RequestWithUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectionComment, setRejectionComment] = useState('');
    const [requestToProcess, setRequestToProcess] = useState<{ user: UserProfile; request: WithdrawalRequest } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        if (!firestore) return;
        
        const q = query(collection(firestore, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setIsLoading(true);
            const requests: RequestWithUser[] = [];
            snapshot.forEach(doc => {
                const user = { id: doc.id, ...doc.data() } as UserProfile;
                if (user.withdrawalRequests && Array.isArray(user.withdrawalRequests)) {
                    user.withdrawalRequests.forEach(request => {
                        requests.push({ user, request: { ...request, classification: request.classification || 'unclassified' } });
                    });
                }
            });
            requests.sort((a, b) => new Date(b.request.createdAt).getTime() - new Date(a.request.createdAt).getTime());
            setAllRequests(requests);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching withdrawal requests:", error);
            toast({ title: "Error fetching data", description: "Could not fetch withdrawal requests.", variant: "destructive" });
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, toast]);
    
    const processRequest = useCallback(async (requestToProcess: { user: UserProfile, request: WithdrawalRequest }, classification: Classification, comment?: string) => {
        if (!firestore || !requestToProcess) return;
    
        setIsProcessing(true);
        const { user, request } = requestToProcess;
        const userDocRef = doc(firestore, 'users', user.id);
    
        try {
            await runTransaction(firestore, async (transaction) => {
                const userDoc = await transaction.get(userDocRef);
                if (!userDoc.exists()) throw new Error("User document not found.");
    
                const userData = userDoc.data() as UserProfile;
    
                const updatedRequests = (userData.withdrawalRequests || []).map(req => {
                    if (req.requestId === request.requestId) {
                        const updatedReq: Partial<WithdrawalRequest> = { ...req, classification };
                        if (comment) {
                            updatedReq.adminComment = comment;
                        }
                        return updatedReq as WithdrawalRequest;
                    }
                    return req;
                });
    
                const updatePayload: { withdrawalRequests: WithdrawalRequest[], minedCoins?: any, notifications?: any } = {
                    withdrawalRequests: updatedRequests
                };
    
                let notificationMessage = '';
                if (classification === 'accepted') {
                    if ((userData.minedCoins || 0) < request.requestedAmount) {
                        throw new Error("User has insufficient funds.");
                    }
                    updatePayload.minedCoins = increment(-request.requestedAmount);
                    notificationMessage = `Congratulations! Your withdrawal request of ${request.requestedAmount} coins has been approved. You will receive the funds within 24 hours.`;
                } else if (classification === 'rejected') {
                    notificationMessage = `Your withdrawal request of ${request.requestedAmount} coins was rejected.`;
                    if (comment) {
                        notificationMessage += ` Reason: ${comment}`;
                    }
                }
    
                if (notificationMessage) {
                    updatePayload.notifications = arrayUnion(notificationMessage);
                }
    
                transaction.update(userDocRef, updatePayload);
            });
    
            toast({
                title: 'Request Classified',
                description: `The request has been moved to the '${classification}' tab.`,
            });
    
            setAllRequests(prevRequests => prevRequests.map(item => {
                if (item.user.id === user.id && item.request.requestId === request.requestId) {
                    const updatedRequest: WithdrawalRequest = { ...item.request, classification: classification };
                    if (comment) {
                        updatedRequest.adminComment = comment;
                    }
                    return { ...item, request: updatedRequest };
                }
                return item;
            }));
    
        } catch (error: any) {
            console.error('Error updating classification: ', error);
            const contextualError = new FirestorePermissionError({
                path: `users/${user.id}`,
                operation: 'update',
                requestResourceData: { withdrawalRequests: '...' } 
            });
            errorEmitter.emit('permission-error', contextualError);
            toast({
                title: 'Classification Failed',
                description: `Could not update the request. Reason: ${error.message || 'Permission denied.'}`,
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
            setRequestToProcess(null);
            setIsRejectDialogOpen(false);
            setRejectionComment('');
        }
    }, [firestore, toast]);

    const handleUpdateClassification = useCallback((user: UserProfile, request: WithdrawalRequest, classification: Classification) => {
        const itemToProcess = { user, request };
        if (classification === 'rejected') {
            setRequestToProcess(itemToProcess);
            setIsRejectDialogOpen(true);
        } else if (classification === 'accepted') {
            processRequest(itemToProcess, 'accepted');
        }
    }, [processRequest]);
    

    const handleConfirmRejection = () => {
        if (requestToProcess) {
            processRequest(requestToProcess, 'rejected', rejectionComment);
        }
    };

    const { pending, accepted, rejected } = useMemo(() => {
        return allRequests.reduce((acc, item) => {
            switch (item.request.classification) {
                case 'accepted':
                    acc.accepted.push(item);
                    break;
                case 'rejected':
                    acc.rejected.push(item);
                    break;
                default:
                    acc.pending.push(item);
                    break;
            }
            return acc;
        }, { pending: [] as RequestWithUser[], accepted: [] as RequestWithUser[], rejected: [] as RequestWithUser[] });
    }, [allRequests]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Withdrawal Requests</CardTitle>
                <CardDescription>Review and process withdrawal requests from users.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="pending">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="pending">
                            Pending
                            {pending.length > 0 && (
                                <Badge variant="destructive" className="ml-2">{pending.length}</Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="accepted">Accepted</TabsTrigger>
                        <TabsTrigger value="rejected">Rejected</TabsTrigger>
                    </TabsList>
                    <TabsContent value="pending" className="mt-6">
                        <WithdrawalRequestsList
                            requests={pending}
                            isLoading={isLoading}
                            onUpdateClassification={handleUpdateClassification}
                        />
                    </TabsContent>
                    <TabsContent value="accepted" className="mt-6">
                        <WithdrawalRequestsList
                            requests={accepted}
                            isLoading={isLoading}
                        />
                    </TabsContent>
                     <TabsContent value="rejected" className="mt-6">
                        <WithdrawalRequestsList
                            requests={rejected}
                            isLoading={isLoading}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>

             <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                    <DialogHeader>
                        <DialogTitle className="text-amber-300">Confirm Rejection</DialogTitle>
                        <DialogDescription className="text-amber-200/80">
                            Are you sure you want to reject this request? You can provide an optional comment for the user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2">
                        <Label htmlFor="rejection-comment" className="text-amber-200/90">Comment (Optional)</Label>
                        <Textarea 
                            id="rejection-comment"
                            placeholder="e.g., Invalid UPI ID"
                            value={rejectionComment}
                            onChange={(e) => setRejectionComment(e.target.value)}
                            className="bg-slate-900/50 border-amber-400/30 text-white"
                        />
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                           <Button type="button" variant="outline" className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</Button>
                        </DialogClose>
                        <Button type="button" variant="destructive" onClick={handleConfirmRejection} disabled={isProcessing}>
                           {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                           Confirm Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

type EnrichedPendingTransfer = PendingTransfer & {
    senderProfileCode?: string;
    receiverProfileCode?: string;
    senderAvailableCoins?: number;
    senderDeviceId?: string;
    receiverDeviceId?: string;
};

function TransfersManager({
  pendingTransfers,
  isLoading,
  onRespond,
}: {
  pendingTransfers: EnrichedPendingTransfer[];
  isLoading: boolean;
  onRespond: (transfer: PendingTransfer, action: "approve" | "reject") => void;
}) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleResponse = async (
    transfer: PendingTransfer,
    action: "approve" | "reject"
  ) => {
    setProcessingId(transfer.id);
    try {
      await onRespond(transfer, action);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (pendingTransfers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
        <Inbox className="h-12 w-12 text-muted-foreground" />
        <h3 className="font-semibold">No Pending Transfers</h3>
        <p className="text-sm text-muted-foreground">
          There are no pending transfers to review.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingTransfers.map((transfer) => (
        <Card key={transfer.id}>
          <CardContent className="p-4 grid gap-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-lg">{transfer.amount} BLIT</p>
                <p className="text-sm text-muted-foreground">
                  From{" "}
                  <span className="font-medium text-foreground">
                    {transfer.senderName}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {transfer.receiverName}
                  </span>
                </p>
                 <p className="text-xs text-muted-foreground mt-2">
                    Sender: <span className="font-mono">{transfer.senderProfileCode || '...'}</span> | Receiver: <span className="font-mono">{transfer.receiverProfileCode || '...'}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                    Sender Coins: <span className="font-mono">{(transfer.senderAvailableCoins ?? 0).toFixed(4)}</span>
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Smartphone className="h-3 w-3" />
                    <p>
                        Sender Device: <span className="font-mono">{transfer.senderDeviceId || 'N/A'}</span>
                    </p>
                </div>
                 <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Smartphone className="h-3 w-3" />
                    <p>
                        Receiver Device: <span className="font-mono">{transfer.receiverDeviceId || 'N/A'}</span>
                    </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(transfer.createdAt.toDate(), {
                  addSuffix: true,
                })}
              </p>
            </div>
            {transfer.senderDeviceId && transfer.receiverDeviceId && transfer.senderDeviceId === transfer.receiverDeviceId && (
                <Badge variant="destructive" className="w-fit">Same Device</Badge>
            )}
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleResponse(transfer, "reject")}
                disabled={!!processingId}
              >
                <X className="mr-2 h-4 w-4" /> Reject
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleResponse(transfer, "approve")}
                disabled={!!processingId}
              >
                {processingId === transfer.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-2 h-4 w-4" />
                )}
                Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TransactionList({ status }: { status: 'completed' | 'rejected' }) {
    const firestore = useFirestore();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        const q = query(collection(firestore, "transactions"), where("status", "==", status));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedTransactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
            fetchedTransactions.sort((a, b) => (b.completedAt?.toMillis() ?? 0) - (a.completedAt?.toMillis() ?? 0));
            setTransactions(fetchedTransactions);
            setIsLoading(false);
        }, (error) => {
            console.error(`Error fetching ${status} transactions:`, error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore, status]);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (transactions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                <Inbox className="h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold">No {status.charAt(0).toUpperCase() + status.slice(1)} Transfers</h3>
                <p className="text-sm text-muted-foreground">There are no {status} transfers yet.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {transactions.map((tx) => (
                <Card key={tx.id}>
                    <CardContent className="p-4 grid gap-2">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-bold text-lg">{tx.amount} BLIT</p>
                                <p className="text-sm text-muted-foreground">
                                    From <span className="font-medium text-foreground">{tx.senderName}</span> to <span className="font-medium text-foreground">{tx.receiverName}</span>
                                </p>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {tx.completedAt ? formatDistanceToNow(tx.completedAt.toDate(), { addSuffix: true }) : 'Processing...'}
                            </p>
                        </div>
                         {tx.adminComment && (
                            <div className="p-2 text-xs bg-muted rounded-md">
                                <strong>Admin Comment:</strong> {tx.adminComment}
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function FollowRequestsManager() {
    const { approveFollowRequest, disapproveFollowRequest } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const firestore = useFirestore();

    useEffect(() => {
        if (!firestore) return;

        const handleSnapshot = (snapshot: any) => {
            const users = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as UserProfile));
            setPendingUsers(prev => {
                const userMap = new Map(prev.map((p: UserProfile) => [p.id, p]));
                users.forEach((u: UserProfile) => userMap.set(u.id, u));
                return Array.from(userMap.values()).filter(user => user.followStatusFacebook === 'pending' || user.followStatusX === 'pending');
            });
            setIsLoading(false);
        };
        
        const qFB = query(collection(firestore, 'users'), where('followStatusFacebook', '==', 'pending'));
        const qX = query(collection(firestore, 'users'), where('followStatusX', '==', 'pending'));

        const unsubFB = onSnapshot(qFB, handleSnapshot);
        const unsubX = onSnapshot(qX, handleSnapshot);

        return () => {
            unsubFB();
            unsubX();
        };
    }, [firestore]);

    const handleApprove = async (userId: string, platform: 'facebook' | 'x') => {
        setProcessingId(`${userId}-${platform}-approve`);
        await approveFollowRequest(userId, platform);
        setPendingUsers(prev => prev.filter(u => u.id !== userId || (platform === 'facebook' ? u.followStatusX === 'pending' : u.followStatusFacebook === 'pending')));
        setProcessingId(null);
    };
    
    const handleDisapprove = async (userId: string, platform: 'facebook' | 'x') => {
        setProcessingId(`${userId}-${platform}-disapprove`);
        await disapproveFollowRequest(userId, platform);
        setPendingUsers(prev => prev.filter(u => u.id !== userId || (platform === 'facebook' ? u.followStatusX === 'pending' : u.followStatusFacebook === 'pending')));
        setProcessingId(null);
    };

    const uniquePendingUsers = useMemo(() => {
        const seen = new Set();
        return pendingUsers.filter(user => {
            if (seen.has(user.id)) {
                return false;
            }
            seen.add(user.id);
            return true;
        });
    }, [pendingUsers]);

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (uniquePendingUsers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                <Inbox className="h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold">No Follow Requests</h3>
                <p className="text-sm text-muted-foreground">There are no pending follow requests to review.</p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Follow Requests</CardTitle>
                <CardDescription>Review and approve user follow requests for social media.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                 {uniquePendingUsers.map(user => (
                    <Card key={user.id}>
                        <CardContent className="p-4 grid gap-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg">{user.fullName}</p>
                                    <p className="text-sm text-muted-foreground">Profile Code: <Link href={`/admin/find-user?profileCode=${user.profileCode}`} className="font-medium text-primary hover:underline">{user.profileCode}</Link></p>
                                </div>
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                                    <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="space-y-4">
                                {user.followStatusFacebook === 'pending' && (
                                    <div className="p-2 bg-muted rounded-md space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <FacebookIcon />
                                                <span>Facebook Request</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="destructive" onClick={() => handleDisapprove(user.id, 'facebook')} disabled={!!processingId}>
                                                    {processingId === `${user.id}-facebook-disapprove` ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} Disapprove
                                                </Button>
                                                <Button size="sm" onClick={() => handleApprove(user.id, 'facebook')} disabled={!!processingId}>
                                                    {processingId === `${user.id}-facebook-approve` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Approve
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground pl-1">
                                            Profile Name: <span className="font-semibold text-primary">{user.facebookProfileName}</span>
                                        </div>
                                    </div>
                                )}
                                 {user.followStatusX === 'pending' && (
                                    <div className="p-2 bg-muted rounded-md space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <XIcon />
                                                <span>X Request</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="destructive" onClick={() => handleDisapprove(user.id, 'x')} disabled={!!processingId}>
                                                     {processingId === `${user.id}-x-disapprove` ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />} Disapprove
                                                </Button>
                                                <Button size="sm" onClick={() => handleApprove(user.id, 'x')} disabled={!!processingId}>
                                                    {processingId === `${user.id}-x-approve` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Approve
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground pl-1">
                                            Profile Name: <span className="font-semibold text-primary">{user.xProfileName}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
}

const sendMessageSchema = z.object({
  profileCode: z.string().length(6, "Profile code must be 6 digits."),
  message: z.string().min(1, "Message cannot be empty."),
});

function SendNotificationManager() {
    const { sendNotificationToUser } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof sendMessageSchema>>({
        resolver: zodResolver(sendMessageSchema),
        defaultValues: { profileCode: '', message: '' },
    });

    const onSubmit = async (data: z.infer<typeof sendMessageSchema>) => {
        setIsSubmitting(true);
        try {
            await sendNotificationToUser(data.profileCode, data.message);
            form.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Send Notification</CardTitle>
                <CardDescription>Send a dismissible message to a user's dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="profileCode"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>User Profile Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123456" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="message"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Message</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Enter your message here..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Send Message
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

const miningRateSchema = z.object({
  rate: z.coerce.number().positive({ message: "Rate must be a positive number." }),
});

function SetMiningRateForm() {
    const { setGlobalBaseMiningRate } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const form = useForm<z.infer<typeof miningRateSchema>>({
        resolver: zodResolver(miningRateSchema),
        defaultValues: { rate: 0.25 },
    });

    const onSubmit = async (data: z.infer<typeof miningRateSchema>) => {
        setIsSubmitting(true);
        try {
            await setGlobalBaseMiningRate(data.rate);
            form.reset({ rate: data.rate }); // Keep the new rate in the form
        } catch (error) {
            // Toast is handled in the auth hook
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="rate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Base Rate (tokens/hour)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" placeholder="e.g., 0.25" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                    Update Rate for All Users
                </Button>
            </form>
        </Form>
    );
}

const sessionDurationSchema = z.object({
  duration: z.coerce.number().int().positive({ message: "Duration must be a positive integer." }),
});

function SetSessionDurationForm() {
    const { setGlobalSessionDuration, getGlobalSessionDuration } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const form = useForm<z.infer<typeof sessionDurationSchema>>({
        resolver: zodResolver(sessionDurationSchema),
        defaultValues: { duration: 480 }, // Default to 8 hours (480 minutes)
    });
    
    useEffect(() => {
        getGlobalSessionDuration().then(duration => {
            if(duration) {
                form.reset({ duration });
            }
        });
    }, [getGlobalSessionDuration, form]);

    const onSubmit = async (data: z.infer<typeof sessionDurationSchema>) => {
        setIsSubmitting(true);
        try {
            await setGlobalSessionDuration(data.duration);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>New Session Duration (minutes)</FormLabel>
                            <FormControl>
                                <Input type="number" step="1" placeholder="e.g., 480 for 8 hours" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                    Update Session Duration
                </Button>
            </form>
        </Form>
    );
}

const bonusSpinsSchema = z.object({
  spins: z.coerce.number().int().min(1, { message: "Must be at least 1." }),
});

function GrantBonusSpinsForm() {
    const { grantBonusSpins } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<z.infer<typeof bonusSpinsSchema>>({
        resolver: zodResolver(bonusSpinsSchema),
        defaultValues: { spins: 1 },
    });

    const onSubmit = async (data: z.infer<typeof bonusSpinsSchema>) => {
        setIsSubmitting(true);
        try {
            await grantBonusSpins(data.spins);
            form.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="spins"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Number of Bonus Spins</FormLabel>
                            <FormControl>
                                <Input type="number" step="1" placeholder="e.g., 1" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Award className="mr-2 h-4 w-4" />}
                    Grant Spins to All Users
                </Button>
            </form>
        </Form>
    );
}


function TotalSupplyManager() {
    const firestore = useFirestore();
    const [totalLiveCoins, setTotalLiveCoins] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [userCount, setUserCount] = useState(0);
    const [topUsers, setTopUsers] = useState<(UserProfile & { liveCoins: number })[]>([]);
    const allUsersRef = useRef<UserProfile[]>([]);

    useEffect(() => {
        if (!firestore) return;

        const q = query(collection(firestore, 'users'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
            allUsersRef.current = users;
            setUserCount(snapshot.size);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching total supply:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);
    
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            let totalCoins = 0;

            const allUsersWithLiveCoins = allUsersRef.current.map(user => {
                let userLiveCoins = user.minedCoins || 0;

                if (user.sessionEndTime && now < user.sessionEndTime && user.miningStartTime) {
                    const baseRate = user.baseMiningRate || 0.25;
                    const boostRate = (user.miningRate2H || 0) + (user.miningRate4H || 0) + (user.miningRate8H || 0);
                    const referralBonus = (user.referrals?.length || 0) * 0.1;
                    const totalSessionMiningRate = baseRate + boostRate + referralBonus;
                    const miningRatePerSecond = totalSessionMiningRate / 3600;
    
                    const elapsedTimeSinceLastSaveMs = now - user.miningStartTime;
                    const coinsEarned = (elapsedTimeSinceLastSaveMs / 1000) * miningRatePerSecond;
                    userLiveCoins = (user.minedCoins || 0) + coinsEarned;
                }
                totalCoins += userLiveCoins;
                return { ...user, liveCoins: userLiveCoins };
            });

            allUsersWithLiveCoins.sort((a, b) => b.liveCoins - a.liveCoins);
            setTopUsers(allUsersWithLiveCoins.slice(0, 5));
            setTotalLiveCoins(totalCoins);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Total Circulating Supply</CardTitle>
                    <CardDescription>The total number of Blistree tokens currently mined by all users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center gap-4 py-8">
                        <Coins className="h-16 w-16 text-primary" />
                        <div className="text-4xl font-bold tracking-tighter">
                            {totalLiveCoins.toFixed(4)}
                            <span className="text-lg font-medium text-muted-foreground ml-2">BLIT</span>
                        </div>
                        <p className="text-sm text-muted-foreground">Across {userCount} users</p>
                    </div>
                </CardContent>
                <CardFooter className="pt-12" />
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Top Miners</CardTitle>
                    <CardDescription>The top 5 users with the most Blistree tokens.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {topUsers.map((user, index) => (
                            <div key={user.id} className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted font-bold">
                                    {index + 1}
                                </div>
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={user.profileImageUrl} alt={user.fullName} />
                                    <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <p className="font-semibold">{user.fullName}</p>
                                    <p className="text-sm text-muted-foreground">{user.profileCode}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-lg">{user.liveCoins.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">BLIT</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Set Global Base Mining Rate</CardTitle>
                    <CardDescription>Update the base mining rate for all users in the system. This action is irreversible for a session.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SetMiningRateForm />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Set Global Session Duration</CardTitle>
                    <CardDescription>Update the mining session duration for all users in minutes.</CardDescription>
                </CardHeader>
                <CardContent>
                    <SetSessionDurationForm />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Grant Bonus Spins</CardTitle>
                    <CardDescription>Give a specified number of bonus spins to all users.</CardDescription>
                </CardHeader>
                <CardContent>
                    <GrantBonusSpinsForm />
                </CardContent>
            </Card>
        </div>
    );
}

function FeedbacksManager() {
    const firestore = useFirestore();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!firestore) return;
        setIsLoading(true);

        const fetchReviews = async () => {
            try {
                const reviewsQuery = query(collection(firestore, 'reviews'), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(reviewsQuery);
                const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
                setReviews(fetchedReviews);
            } catch (error) {
                console.error("Error fetching reviews:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReviews();

        const unsubscribe = onSnapshot(query(collection(firestore, 'reviews')), (snapshot) => {
            const fetchedReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
            setReviews(fetchedReviews.sort((a,b) => {
                 if (a.createdAt && b.createdAt) {
                    const timeA = (a.createdAt as Timestamp).toMillis();
                    const timeB = (b.createdAt as Timestamp).toMillis();
                    return timeB - timeA;
                }
                return 0;
            }));
        });
        
        return () => unsubscribe();

    }, [firestore]);
    
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star key={i} className={cn("h-5 w-5", i < rating ? "text-amber-400 fill-amber-400" : "text-gray-600")} />
        ));
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (!reviews || reviews.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                <Inbox className="h-12 w-12 text-muted-foreground" />
                <h3 className="font-semibold">No Feedback Yet</h3>
                <p className="text-sm text-muted-foreground">No users have submitted feedback.</p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Feedbacks</CardTitle>
                <CardDescription>Review all feedback submitted by users.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {reviews.map(review => {
                    const createdAtDate = review.createdAt ? (review.createdAt as Timestamp).toDate() : null;
                    return(
                    <Card key={review.id}>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{review.userName}</CardTitle>
                                    <CardDescription>Profile Code: {review.profileCode}</CardDescription>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {createdAtDate ? formatDistanceToNow(createdAtDate, { addSuffix: true }) : 'Just now'}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-1">
                                {renderStars(review.rating)}
                            </div>
                            {review.feedback && (
                                <div className="p-3 rounded-md bg-muted/50 text-sm">
                                    <p className="font-semibold">Feedback:</p>
                                    <p className="whitespace-pre-wrap">{review.feedback}</p>
                                </div>
                            )}
                            {review.wasPlayStorePrompted && (
                                <div className="p-3 rounded-md bg-green-500/10 text-sm text-green-300 flex items-center gap-2">
                                    <Share2 className="h-4 w-4" />
                                    <span>User was prompted to rate on the Play Store.</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )})}
            </CardContent>
        </Card>
    );
}

function AirdropManager() {
    const { updateAirdropConfig } = useAuth();
    const firestore = useFirestore();
    const [config, setConfig] = useState<Partial<AirdropConfig>>({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const configDocRef = doc(firestore, 'config', 'airdrop');
        const unsubscribe = onSnapshot(configDocRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as AirdropConfig;
                const expiryDate = data.expiryDate ? (data.expiryDate as Timestamp).toDate() : undefined;
                setConfig({
                    ...data,
                    expiryDate: expiryDate,
                    bonusDeadline: data.bonusDeadline ? (data.bonusDeadline as Timestamp).toDate() : undefined,
                });
            } else {
                setConfig({
                    headline: "Referral Airdrop",
                    tagline: "Don't miss this opportunity!",
                    referralLimit: 5,
                    rewardAmount: 30,
                    bonusReferralTarget: 3,
                    bonusReward: 70,
                    completionBonus: 120,
                    isActive: false
                })
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [firestore]);

    const handleUpdate = async (field: keyof AirdropConfig, value: any) => {
        const newConfig = { ...config, [field]: value };
        setConfig(newConfig);
        if (field === 'isActive') {
            await updateAirdropConfig(newConfig);
        }
    };

    const handleSave = async () => {
        await updateAirdropConfig(config);
    };
    
    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>Airdrop Management</CardTitle></CardHeader>
                <CardContent className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Airdrop Management</CardTitle>
                <CardDescription>Control the referral airdrop event.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="headline">Headline</Label>
                    <Input id="headline" value={config.headline || ''} onChange={(e) => handleUpdate('headline', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="tagline">Tagline</Label>
                    <Input id="tagline" value={config.tagline || ''} onChange={(e) => handleUpdate('tagline', e.target.value)} />
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="referralLimit">Airdrop Referral Limit</Label>
                        <Input id="referralLimit" type="number" value={config.referralLimit || ''} onChange={(e) => handleUpdate('referralLimit', Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="rewardAmount">Reward/Referral (BLIT)</Label>
                        <Input id="rewardAmount" type="number" value={config.rewardAmount || ''} onChange={(e) => handleUpdate('rewardAmount', Number(e.target.value))} />
                    </div>
                </div>

                <div className="p-4 border rounded-md">
                    <h4 className="font-semibold mb-2">Sub-task Bonus</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Bonus Deadline</Label>
                            <DatePicker
                                date={config.bonusDeadline as Date}
                                onDateChange={(date) => handleUpdate('bonusDeadline', date)}
                                disabled={(date) => {
                                    const expiry = config.expiryDate instanceof Date ? config.expiryDate : new Date();
                                    return date > expiry;
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="bonusReferralTarget">Referral Target</Label>
                            <Input id="bonusReferralTarget" type="number" value={config.bonusReferralTarget || ''} onChange={(e) => handleUpdate('bonusReferralTarget', Number(e.target.value))} />
                        </div>
                         <div className="space-y-2 col-span-2">
                            <Label htmlFor="bonusReward">Bonus Reward (BLIT)</Label>
                            <Input id="bonusReward" type="number" value={config.bonusReward || ''} onChange={(e) => handleUpdate('bonusReward', Number(e.target.value))} />
                        </div>
                    </div>
                </div>

                <div className="p-4 border rounded-md">
                     <h4 className="font-semibold mb-2">Completion Bonus</h4>
                     <div className="space-y-2">
                        <Label htmlFor="completionBonus">Airdrop Completion Bonus (BLIT)</Label>
                        <Input id="completionBonus" type="number" value={config.completionBonus || ''} onChange={(e) => handleUpdate('completionBonus', Number(e.target.value))} />
                    </div>
                </div>


                <div className="space-y-2">
                    <Label>Airdrop Expiry</Label>
                    <DatePicker 
                        date={config.expiryDate as Date} 
                        onDateChange={(date) => handleUpdate('expiryDate', date)}
                        disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                        }}
                    />
                </div>

                <div className="flex items-center gap-4">
                    <Button onClick={() => handleUpdate('isActive', !config.isActive)}>
                        {config.isActive ? 'Deactivate Airdrop' : 'Launch Airdrop'}
                    </Button>
                    {config.isActive && (
                        <>
                            <Button variant="destructive" onClick={() => handleUpdate('isActive', false)}>Withdraw Airdrop</Button>
                            <Button variant="secondary">Pause Airdrop</Button>
                        </>
                    )}
                </div>
                <Button onClick={handleSave} className="w-full mt-4">
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                </Button>
            </CardContent>
        </Card>
    );
}


function AdminDashboard() {
  const { userProfile, respondToTransferByAdmin, loading, adminRespondToReferralRequest, adminApproveAllReferralRequests } = useAuth();
  const firestore = useFirestore();

  const [pendingTransfers, setPendingTransfers] = useState<EnrichedPendingTransfer[]>([]);
  const [isLoadingTransfers, setIsLoadingTransfers] = useState(true);
  const [isRejectTransferDialogOpen, setIsRejectTransferDialogOpen] = useState(false);
  const [rejectionTransferComment, setRejectionTransferComment] = useState('');
  const [transferToProcess, setTransferToProcess] = useState<PendingTransfer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingWithdrawalCount, setPendingWithdrawalCount] = useState(0);
  const [pendingFollowsCount, setPendingFollowsCount] = useState(0);
  const [activeRequestsTab, setActiveRequestsTab] = useState<RequestsTab>('withdrawal-requests');
  const [pendingReferrals, setPendingReferrals] = useState<ReferralRequest[]>([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(true);
  
  const isAdmin = userProfile?.isAdmin || userProfile?.id === 'ZzOKXow0RlhaK3snDD0BLcbeBL62';

  useEffect(() => {
    if (!firestore || !isAdmin) return;

    const usersQuery = query(collection(firestore, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
        let withdrawalCount = 0;
        let followCount = 0;
        snapshot.forEach(doc => {
            const user = doc.data() as UserProfile;
            if (user.withdrawalRequests?.some(req => !req.classification || req.classification === 'unclassified')) {
                withdrawalCount++;
            }
            if (user.followStatusFacebook === 'pending' || user.followStatusX === 'pending') {
                followCount++;
            }
        });
        setPendingWithdrawalCount(withdrawalCount);
        setPendingFollowsCount(followCount);
    });

    const transfersQuery = query(collection(firestore, "pendingTransfers"));
    const unsubscribeTransfers = onSnapshot(transfersQuery, async (snapshot) => {
        const transfers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data()} as PendingTransfer));
        
        if (transfers.length > 0) {
            const userIds = new Set<string>();
            transfers.forEach(t => {
                userIds.add(t.senderId);
                userIds.add(t.receiverId);
            });

            const usersData = new Map<string, UserProfile>();
            if (userIds.size > 0) {
                const userDocs = await getDocs(query(collection(firestore, 'users'), where(documentId(), 'in', Array.from(userIds))));
                userDocs.forEach(doc => {
                    usersData.set(doc.id, doc.data() as UserProfile);
                });
            }

            const enrichedTransfers = transfers.map(t => {
                const sender = usersData.get(t.senderId);
                const receiver = usersData.get(t.receiverId);
                return {
                    ...t,
                    senderProfileCode: sender?.profileCode,
                    receiverProfileCode: receiver?.profileCode,
                    senderAvailableCoins: sender?.minedCoins,
                    senderDeviceId: sender?.deviceNames?.[sender.deviceNames.length - 1],
                    receiverDeviceId: receiver?.deviceNames?.[receiver.deviceNames.length - 1],
                };
            });
            enrichedTransfers.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
            setPendingTransfers(enrichedTransfers);
        } else {
             setPendingTransfers([]);
        }
        
        setIsLoadingTransfers(false);
    }, (error) => {
        console.error("Error fetching pending transfers:", error);
        setIsLoadingTransfers(false);
    });

    const referralsQuery = query(collection(firestore, "referralRequests"), where("status", "==", "pending"));
    const unsubscribeReferrals = onSnapshot(referralsQuery, async (snapshot) => {
        const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ReferralRequest));
        
        if (reqs.length > 0) {
            const userIds = new Set<string>();
            reqs.forEach(r => {
                userIds.add(r.requesterId);
                userIds.add(r.targetUserId);
            });

            const usersData = new Map<string, UserProfile>();
            const userIdArray = Array.from(userIds);
            const chunks: string[][] = [];
            for (let i = 0; i < userIdArray.length; i += 30) {
              chunks.push(userIdArray.slice(i, i + 30));
            }
            
            for (const chunk of chunks) {
              if (chunk.length > 0) {
                const userDocs = await getDocs(query(collection(firestore, 'users'), where(documentId(), 'in', chunk)));
                userDocs.forEach(doc => {
                    usersData.set(doc.id, doc.data() as UserProfile);
                });
              }
            }

            const enrichedReferrals = reqs.map(r => {
                const requester = usersData.get(r.requesterId);
                const target = usersData.get(r.targetUserId);
                return {
                    ...r,
                    requesterProfileCode: requester?.profileCode,
                    requesterProfileImageUrl: requester?.profileImageUrl,
                    targetUserName: target?.fullName,
                    targetUserProfileCode: target?.profileCode,
                };
            });
            enrichedReferrals.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
            setPendingReferrals(enrichedReferrals);
        } else {
            setPendingReferrals([]);
        }
        setIsLoadingReferrals(false);
    }, (error) => {
        console.error("Error fetching pending referral requests:", error);
        setIsLoadingReferrals(false);
    });

    return () => {
        unsubscribeUsers();
        unsubscribeTransfers();
        unsubscribeReferrals();
    };
  }, [firestore, isAdmin]);

  const handleTransferResponse = useCallback(async (transfer: PendingTransfer, action: 'approve' | 'reject') => {
      if (!respondToTransferByAdmin) return;
      if (action === 'reject') {
          setTransferToProcess(transfer);
          setIsRejectTransferDialogOpen(true);
      } else {
          setIsProcessing(true);
          try {
              await respondToTransferByAdmin(transfer.id, transfer.senderId, transfer.receiverId, transfer.amount, 'approve', undefined, transfer.transactionId);
          } finally {
              setIsProcessing(false);
          }
      }
  }, [respondToTransferByAdmin]);

  const handleConfirmTransferRejection = useCallback(async () => {
      if (!transferToProcess || !respondToTransferByAdmin) return;
      setIsProcessing(true);
      try {
          await respondToTransferByAdmin(
              transferToProcess.id,
              transferToProcess.senderId,
              transferToProcess.receiverId,
              transferToProcess.amount,
              'reject',
              rejectionTransferComment,
              transferToProcess.transactionId
          );
      } finally {
          setIsProcessing(false);
          setIsRejectTransferDialogOpen(false);
          setRejectionTransferComment('');
          setTransferToProcess(null);
      }
  }, [transferToProcess, rejectionTransferComment, respondToTransferByAdmin]);

  const totalPendingAdminTasks = pendingWithdrawalCount + pendingTransfers.length + pendingFollowsCount + pendingReferrals.length;

  type RequestsTab = 'withdrawal-requests' | 'follow-requests' | 'coin-transfers' | 'referral-requests' | 'send-notification';

  const tabLabels: Record<RequestsTab, { full: string, short: string }> = {
    'withdrawal-requests': { full: 'Withdrawals', short: 'W' },
    'follow-requests': { full: 'Follows', short: 'F' },
    'coin-transfers': { full: 'Transfers', short: 'T' },
    'referral-requests': { full: 'Referrals', short: 'R' },
    'send-notification': { full: 'Notify', short: 'N' },
  };
  
    if (loading) {
        return (
            <div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="container mx-auto py-10">
                <Card>
                    <CardHeader>
                        <CardTitle>Unauthorized</CardTitle>
                        <CardDescription>You do not have permission to view this page.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

  return (
    <div className="container mx-auto py-10 pb-24">
      <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
       {totalPendingAdminTasks > 0 && (
         <p className="text-destructive font-semibold mb-6 flex items-center gap-2">
            You have {totalPendingAdminTasks} pending task(s).
         </p>
       )}
      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="total-supply">Total Supply</TabsTrigger>
          <TabsTrigger value="airdrop">Airdrop</TabsTrigger>
          <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-6">
          <Tabs defaultValue={activeRequestsTab} onValueChange={(value) => setActiveRequestsTab(value as RequestsTab)} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="withdrawal-requests">
                  {tabLabels['withdrawal-requests'].short}
                  {pendingWithdrawalCount > 0 && <Badge variant="destructive" className="ml-2">{pendingWithdrawalCount}</Badge>}
                </TabsTrigger>
                 <TabsTrigger value="follow-requests">
                  {tabLabels['follow-requests'].short}
                  {pendingFollowsCount > 0 && <Badge variant="destructive" className="ml-2">{pendingFollowsCount}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="coin-transfers">
                  {tabLabels['coin-transfers'].short}
                  {pendingTransfers.length > 0 && <Badge variant="destructive" className="ml-2">{pendingTransfers.length}</Badge>}
                </TabsTrigger>
                 <TabsTrigger value="referral-requests">
                  {tabLabels['referral-requests'].short}
                  {pendingReferrals.length > 0 && <Badge variant="destructive" className="ml-2">{pendingReferrals.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="send-notification">
                  {tabLabels['send-notification'].short}
                </TabsTrigger>
            </TabsList>
            <TabsContent value="withdrawal-requests" className="mt-6">
              <WithdrawalRequestsManager />
            </TabsContent>
            <TabsContent value="follow-requests" className="mt-6">
              <FollowRequestsManager />
            </TabsContent>
            <TabsContent value="coin-transfers" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Coin Transfers</CardTitle>
                        <CardDescription>Review and manage user-to-user coin transfers.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="pending-transfers">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="pending-transfers">
                                    Pending
                                    {pendingTransfers.length > 0 && (
                                        <Badge variant="destructive" className="ml-2">{pendingTransfers.length}</Badge>
                                    )}
                                </TabsTrigger>
                                <TabsTrigger value="approved-transfers">Approved</TabsTrigger>
                                <TabsTrigger value="rejected-transfers">Rejected</TabsTrigger>
                            </TabsList>
                            <TabsContent value="pending-transfers" className="mt-6">
                               <TransfersManager pendingTransfers={pendingTransfers} isLoading={isLoadingTransfers} onRespond={handleTransferResponse} />
                            </TabsContent>
                            <TabsContent value="approved-transfers" className="mt-6">
                                <TransactionList status="completed" />
                            </TabsContent>
                            <TabsContent value="rejected-transfers" className="mt-6">
                               <TransactionList status="rejected" />
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </TabsContent>
             <TabsContent value="referral-requests" className="mt-6">
                <AdminReferralRequestsManager
                    isLoading={isLoadingReferrals}
                    pendingRequests={pendingReferrals}
                    onRespond={adminRespondToReferralRequest}
                    onApproveAll={adminApproveAllReferralRequests}
                />
            </TabsContent>
            <TabsContent value="send-notification" className="mt-6">
                <SendNotificationManager />
            </TabsContent>
          </Tabs>
        </TabsContent>
         <TabsContent value="total-supply" className="mt-6">
            <TotalSupplyManager />
        </TabsContent>
        <TabsContent value="airdrop" className="mt-6">
            <AirdropManager />
        </TabsContent>
        <TabsContent value="feedbacks" className="mt-6">
            <FeedbacksManager />
        </TabsContent>
      </Tabs>

      <Dialog open={isRejectTransferDialogOpen} onOpenChange={setIsRejectTransferDialogOpen}>
          <DialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
              <DialogHeader>
                  <DialogTitle className="text-amber-300">Confirm Transfer Rejection</DialogTitle>
                  <DialogDescription className="text-amber-200/80">
                      Provide an optional reason for rejecting this coin transfer.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-2">
                  <Label htmlFor="rejection-transfer-comment" className="text-amber-200/90">Comment (Optional)</Label>
                  <Textarea
                      id="rejection-transfer-comment"
                      placeholder="e.g., Suspected fraudulent activity"
                      value={rejectionTransferComment}
                      onChange={(e) => setRejectionTransferComment(e.target.value)}
                      className="bg-slate-900/50 border-amber-400/30 text-white"
                  />
              </div>
              <DialogFooter>
                  <DialogClose asChild>
                      <Button type="button" variant="outline" className="bg-transparent text-amber-300 border-amber-400/50 hover:bg-amber-400/10 hover:text-white">Cancel</Button>
                  </DialogClose>
                  <Button type="button" variant="destructive" onClick={handleConfirmTransferRejection} disabled={isProcessing}>
                      {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
                      Confirm Reject
                  </Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminReferralRequestsManager({
    pendingRequests,
    isLoading,
    onRespond,
    onApproveAll,
}: {
    pendingRequests: ReferralRequest[];
    isLoading: boolean;
    onRespond: (requestId: string, requesterId: string, targetUserId: string, action: 'approve' | 'reject') => void;
    onApproveAll: () => Promise<void>;
}) {
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [isApprovingAll, setIsApprovingAll] = useState(false);

    const handleResponse = async (request: ReferralRequest, action: "approve" | "reject") => {
        setProcessingId(request.id);
        try {
            await onRespond(request.id, request.requesterId, request.targetUserId, action);
        } finally {
            setProcessingId(null);
        }
    };

    const handleApproveAll = async () => {
        setIsApprovingAll(true);
        try {
            await onApproveAll();
        } finally {
            setIsApprovingAll(false);
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardHeader><CardTitle>Referral Requests</CardTitle></CardHeader>
                <CardContent className="flex justify-center items-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (pendingRequests.length === 0) {
        return (
            <Card>
                 <CardHeader><CardTitle>Referral Requests</CardTitle></CardHeader>
                 <CardContent>
                    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center border-2 border-dashed rounded-lg">
                        <Inbox className="h-12 w-12 text-muted-foreground" />
                        <h3 className="font-semibold">No Pending Referral Requests</h3>
                    </div>
                </CardContent>
            </Card>
        );
    }
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Referral Requests</CardTitle>
                        <CardDescription>Manage pending referral requests.</CardDescription>
                    </div>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button size="sm" variant="secondary" disabled={isApprovingAll}>
                                {isApprovingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                Approve All
                            </Button>
                        </AlertDialogTrigger>
                         <AlertDialogContent className="text-white border-amber-400/50" style={{ background: 'linear-gradient(145deg, #1a1a2e, #16213e)' }}>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="text-amber-300">Approve All Requests?</AlertDialogTitle>
                                <AlertDialogDescription className="text-amber-200/80">
                                    Are you sure you want to approve all {pendingRequests.length} pending referral requests? This action cannot be undone.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleApproveAll}>Confirm Approve</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {pendingRequests.map((request) => (
                    <Card key={request.id}>
                        <CardContent className="p-4 grid gap-4">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                     <Avatar className="h-10 w-10">
                                        <AvatarImage src={request.requesterProfileImageUrl} alt={request.requesterName} />
                                        <AvatarFallback>{request.requesterName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm">
                                            <span className="font-bold text-foreground">{request.requesterName}</span> ({request.requesterProfileCode}) wants to be referred by <span className="font-bold text-foreground">{request.targetUserName}</span> ({request.targetUserProfileCode})
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatDistanceToNow(request.createdAt.toDate(), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleResponse(request, "reject")}
                                        disabled={!!processingId}
                                    >
                                        <X className="mr-2 h-4 w-4" /> Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => handleResponse(request, "approve")}
                                        disabled={!!processingId}
                                    >
                                        {processingId === request.id ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Check className="mr-2 h-4 w-4" />
                                        )}
                                        Approve
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </CardContent>
        </Card>
    );
}


export default function AdminDashboardPage() {
    return <AdminDashboard />;
}
