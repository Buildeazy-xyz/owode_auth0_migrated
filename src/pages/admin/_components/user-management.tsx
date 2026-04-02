import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Users,
  MoreVertical,
  ShieldCheck,
  ShieldOff,
  Crown,
  UserX,
  Mail,
} from "lucide-react";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

type UserRow = {
  _id: Id<"users">;
  name: string;
  email: string;
  role?: string;
  isSuperAdmin: boolean;
};

export default function UserManagement() {
  const users = useQuery(api.users.listAllUsers);
  const promoteToAdmin = useMutation(api.users.promoteToAdmin);
  const demoteAdmin = useMutation(api.users.demoteAdmin);
  const removeUserRole = useMutation(api.users.removeUserRole);
  const [loading, setLoading] = useState<string | null>(null);

  const handlePromote = async (userId: Id<"users">, name: string) => {
    setLoading(userId);
    try {
      await promoteToAdmin({ userId });
      toast.success(`${name} is now an admin`);
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to promote user");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleDemote = async (userId: Id<"users">, name: string) => {
    setLoading(userId);
    try {
      await demoteAdmin({ userId });
      toast.success(`${name} is no longer an admin`);
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to demote user");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleRemoveRole = async (userId: Id<"users">, name: string) => {
    setLoading(userId);
    try {
      await removeUserRole({ userId });
      toast.success(`${name}'s role has been removed`);
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("Failed to remove role");
      }
    } finally {
      setLoading(null);
    }
  };

  if (users === undefined) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif">User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Users /></EmptyMedia>
          <EmptyTitle>No users found</EmptyTitle>
          <EmptyDescription>Users will appear here once they sign up.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Sort: super admin first, then admins, then agents, then the rest
  const rolePriority: Record<string, number> = {
    admin: 1,
    agent: 2,
    contributor: 3,
  };
  const sorted = [...users].sort((a, b) => {
    if (a.isSuperAdmin) return -1;
    if (b.isSuperAdmin) return 1;
    const aPri = rolePriority[a.role ?? ""] ?? 99;
    const bPri = rolePriority[b.role ?? ""] ?? 99;
    return aPri - bPri;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-serif">
          User Management
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({users.length} user{users.length !== 1 ? "s" : ""})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.map((user) => (
            <UserRowItem
              key={user._id}
              user={user}
              loading={loading === user._id}
              onPromote={() => handlePromote(user._id, user.name)}
              onDemote={() => handleDemote(user._id, user.name)}
              onRemoveRole={() => handleRemoveRole(user._id, user.name)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UserRowItem({
  user,
  loading,
  onPromote,
  onDemote,
  onRemoveRole,
}: {
  user: UserRow;
  loading: boolean;
  onPromote: () => void;
  onDemote: () => void;
  onRemoveRole: () => void;
}) {
  const roleBadge = () => {
    if (user.isSuperAdmin) {
      return (
        <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 gap-1">
          <Crown className="w-3 h-3" />
          Super Admin
        </Badge>
      );
    }
    if (user.role === "admin") {
      return <Badge className="text-[10px]">Admin</Badge>;
    }
    if (user.role === "agent") {
      return <Badge variant="secondary" className="text-[10px]">Agent</Badge>;
    }
    if (user.role === "contributor") {
      return <Badge variant="secondary" className="text-[10px]">Contributor</Badge>;
    }
    return (
      <Badge variant="secondary" className="text-[10px] opacity-50">
        No role
      </Badge>
    );
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
      <div className="min-w-0">
        <p className="font-medium text-sm truncate">{user.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground truncate">
          <Mail className="w-3 h-3 flex-shrink-0" />
          {user.email || "No email"}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {roleBadge()}
        {/* Don't show actions for super admin */}
        {!user.isSuperAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                disabled={loading}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {user.role !== "admin" && (
                <DropdownMenuItem onClick={onPromote}>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Make Admin
                </DropdownMenuItem>
              )}
              {user.role === "admin" && (
                <DropdownMenuItem onClick={onDemote}>
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Remove Admin
                </DropdownMenuItem>
              )}
              {user.role && (
                <DropdownMenuItem
                  onClick={onRemoveRole}
                  className="text-destructive"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Remove All Roles
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
