import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Spinner } from "@/components/ui/spinner.tsx";
import { AgentDetailPanel } from "./_components/agent-list.tsx";

export default function AdminAgentDetailPage() {
  const user = useQuery(api.users.getCurrentUser);
  const navigate = useNavigate();
  const { agentId } = useParams<{ agentId: string }>();

  if (!agentId) {
    return <Navigate to="/admin" replace />;
  }

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <AgentDetailPanel
      agentId={agentId as Id<"users">}
      onBack={() => navigate("/admin")}
    />
  );
}
