import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { ShieldCheck, Users, ClipboardList, UserCheck } from "lucide-react";
import PlatformStats from "./_components/platform-stats.tsx";
import AgentList from "./_components/agent-list.tsx";
import CollectionsTable from "./_components/collections-table.tsx";
import VerificationQueue from "./_components/verification-queue.tsx";

export default function AdminDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();

  // Redirect if user doesn't have admin role
  useEffect(() => {
    if (user && user.role !== "admin") {
      navigate("/onboarding", { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-serif">Admin Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Platform oversight & reconciliation
          </p>
        </div>
      </div>

      {/* Platform overview */}
      <PlatformStats />

      {/* Tabs for verifications, collections, agents */}
      <Tabs defaultValue="verifications" className="w-full">
        <TabsList>
          <TabsTrigger value="verifications" className="gap-1.5">
            <UserCheck className="w-4 h-4" />
            Verifications
          </TabsTrigger>
          <TabsTrigger value="collections" className="gap-1.5">
            <ClipboardList className="w-4 h-4" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="agents" className="gap-1.5">
            <Users className="w-4 h-4" />
            Agents
          </TabsTrigger>
        </TabsList>
        <TabsContent value="verifications" className="mt-4">
          <VerificationQueue />
        </TabsContent>
        <TabsContent value="collections" className="mt-4">
          <CollectionsTable />
        </TabsContent>
        <TabsContent value="agents" className="mt-4">
          <AgentList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
