'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DeleteDataPage() {
    const router = useRouter();
  return (
    <div className="flex flex-col min-h-screen app-background">
      <header className="sticky top-0 z-30 flex items-center p-4 bg-slate-900/50 backdrop-blur-md border-b border-destructive/20">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold mx-auto pr-8">Delete Your Data</h1>
      </header>
       <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
            <Card className="w-full max-w-lg text-white p-6 rounded-2xl border border-destructive/20 bg-black/30 backdrop-blur-xl shadow-[0_0_40px_rgba(220,53,69,0.3)]">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold tracking-tight text-destructive">Data Deletion for Blistree App</CardTitle>
                    <CardDescription className="text-red-200/70 pt-2">
                        This page provides instructions for requesting data deletion for the "Blistree - BLIT Token Miner" application. To request the deletion of your data, please send us an email from your registered email address.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-sm text-red-200/80 p-4 border border-destructive/30 rounded-lg bg-black/20">
                        <p className="font-semibold mb-2">In your email, please include:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>Your registered email address.</li>
                            <li>A clear statement that you are requesting data deletion for the Blistree - BLIT Token Miner app.</li>
                            <li>A clear statement about which data you wish to delete (e.g., "delete my entire account data" or "delete my activity logs").</li>
                        </ul>
                    </div>
                     <Button asChild size="lg" className="w-full h-14 bg-destructive text-white font-bold hover:bg-destructive/80 transition-all duration-300 transform hover:scale-105">
                        <a href="mailto:support@blistree.com?subject=Data Deletion Request for Blistree App">
                            <Mail className="mr-3 h-5 w-5" />
                            Send Email to Support
                        </a>
                    </Button>
                     <p className="text-xs text-center text-muted-foreground pt-2">
                        Our support team will process your request and respond within a reasonable timeframe. The app is developed by Srishti Yadav.
                    </p>
                </CardContent>
            </Card>
      </main>
    </div>
  );
}
