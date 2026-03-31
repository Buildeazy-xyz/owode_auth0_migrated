import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import DashboardStats from "./_components/dashboard-stats.tsx";
import ContributorList from "./_components/contributor-list.tsx";
import CollectionHistory from "./_components/collection-history.tsx";
import RecordCollectionDialog from "./_components/record-collection-dialog.tsx";

export default function AgentDashboard() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();

  // Redirect if user doesn't have agent role
  useEffect(() => {
    if (user && user.role !== "agent") {
      navigate("/onboarding", { replace: true });
    }
  }, [user, navigate]);

  if (!user || user.role !== "agent") {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user.name || "Agent"}
          </p>
        </div>
        <RecordCollectionDialog />
      </div>

      {/* Summary cards */}
      <DashboardStats />

      {/* Two-column layout for lists */}
      <div className="grid lg:grid-cols-2 gap-6">
        <CollectionHistory />
        <ContributorList />
      </div>
    </div>
  );
}
