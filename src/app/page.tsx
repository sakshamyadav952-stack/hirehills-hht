
import { MiningDashboard } from "@/components/mining-dashboard";
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-full min-h-[calc(100vh-8rem)] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <MiningDashboard />
    </Suspense>
  );
}
