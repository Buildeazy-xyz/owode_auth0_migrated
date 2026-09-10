import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Spinner } from "@/components/ui/spinner.tsx";
import { Button } from "@/components/ui/button.tsx";
import { ChevronRight, ArrowLeft, MessageSquare, User, Users, Send, Megaphone } from "lucide-react";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { useAdminAuth } from "@/context/AdminAuthContext.tsx";

const NAVY = "#1e3a6d";

function when(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export default function MessagesPanel() {
  const { token } = useAdminAuth();
  const agents = useQuery(
    api.collections.adminConversationsByAgent,
    token ? { sessionToken: token } : "skip",
  );

  const [agentId, setAgentId] = useState<string | null>(null);
  const [contributorId, setContributorId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const [sending, setSending] = useState(false);
  const broadcast = useMutation(api.collections.broadcastFromAdmin);

  const sendAnnouncement = async () => {
    if (!announce.trim()) return;
    try {
      setSending(true);
      const r = await broadcast({ sessionToken: token!, body: announce });
      toast.success(
        `Sent to ${r.sent} saver${r.sent === 1 ? "" : "s"}, ${r.notified} notified`,
      );
      setAnnounce("");
    } catch (e: any) {
      toast.error(e?.data?.message ?? "Could not send");
    } finally {
      setSending(false);
    }
  };

  if (agents === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6">No conversations yet.</p>
    );
  }

  if (contributorId) {
    return (
      <Conversation
        contributorId={contributorId}
        onBack={() => setContributorId(null)}
      />
    );
  }

  if (agentId) {
    const agent = agents.find((a: any) => a.agentId === agentId);
    if (!agent) {
      setAgentId(null);
      return null;
    }
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={() => setAgentId(null)}>
          <ArrowLeft className="w-4 h-4" />
          All agents
        </Button>

        <div className="rounded-lg border bg-white p-4">
          <p className="font-semibold" style={{ color: NAVY }}>{agent.agentName}</p>
          <p className="text-xs text-muted-foreground">
            {agent.agentPhone} {"\u2022"} {agent.contributors.length} conversations
          </p>
        </div>

        {agent.contributors.map((c: any) => (
          <button
            key={c.contributorId}
            onClick={() => setContributorId(c.contributorId)}
            className="w-full text-left rounded-lg border bg-white p-4 flex items-center gap-3 hover:bg-muted/40 transition"
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#eef2fb", color: NAVY }}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium truncate">{c.contributorName}</p>
                <span className="text-xs text-muted-foreground shrink-0">
                  {when(c.lastAt)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.last}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Megaphone className="w-4 h-4" style={{ color: NAVY }} />
          <p className="font-semibold text-sm" style={{ color: NAVY }}>
            Message all savers
          </p>
        </div>
        <Textarea
          value={announce}
          onChange={(e) => setAnnounce(e.target.value)}
          placeholder="Write an announcement for every active saver"
          rows={3}
        />
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={sendAnnouncement} disabled={sending}>
            <Send className="w-3.5 h-3.5" />
            {sending ? "Sending..." : "Send to all"}
          </Button>
        </div>
      </div>

      {agents.map((a: any) => (
        <button
          key={a.agentId}
          onClick={() => setAgentId(a.agentId)}
          className="w-full text-left rounded-lg border bg-white p-4 flex items-center gap-3 hover:bg-muted/40 transition"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: "#eef2fb", color: NAVY }}
          >
            <Users className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{a.agentName}</p>
            <p className="text-xs text-muted-foreground truncate">
              {a.contributors.length} savers {"\u2022"} {a.totalMessages} messages
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
}

function Conversation({
  contributorId,
  onBack,
}: {
  contributorId: string;
  onBack: () => void;
}) {
  const { token } = useAdminAuth();
  const data = useQuery(
    api.collections.listMessagesForApp,
    token ? { sessionToken: token, contributorId: contributorId as any } : "skip",
  );
  const broadcast = useMutation(api.collections.broadcastFromAdmin);
  const [replyBody, setReplyBody] = useState("");
  const [replying, setReplying] = useState(false);

  const sendReply = async () => {
    if (!replyBody.trim()) return;
    try {
      setReplying(true);
      await broadcast({
        sessionToken: token!,
        body: replyBody,
        contributorId: contributorId as any,
      });
      setReplyBody("");
      toast.success("Message sent");
    } catch (e: any) {
      toast.error(e?.data?.message ?? "Could not send");
    } finally {
      setReplying(false);
    }
  };

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground py-6">Conversation not found.</p>;
  }

  return (
    <div className="space-y-3">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2" onClick={onBack}>
        <ArrowLeft className="w-4 h-4" />
        Back
      </Button>

      <div className="rounded-lg border bg-white p-4 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" style={{ color: NAVY }} />
        <p className="font-semibold" style={{ color: NAVY }}>
          {data.contributorName}
        </p>
      </div>

      <div className="rounded-lg border bg-[#f4f7fb] p-4 space-y-3 max-h-[520px] overflow-y-auto">
        {data.messages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No messages in this conversation.
          </p>
        ) : (
          data.messages.map((m: any) => {
            const fromAgent = m.senderRole === "agent";
            return (
              <div
                key={m.id}
                className={`flex ${fromAgent ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 ${
                    fromAgent ? "text-white" : "bg-white border"
                  }`}
                  style={fromAgent ? { backgroundColor: NAVY } : undefined}
                >
                  <p
                    className={`text-[10px] mb-1 ${
                      fromAgent ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    {m.senderName} {"\u2022"} {m.senderRole}
                  </p>
                  {m.audioUrl ? (
                    <>
                      <p className="text-sm leading-relaxed">Voice note</p>
                      <audio controls src={m.audioUrl} className="mt-2 h-8 w-56" />
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed">{m.body}</p>
                  )}
                  <p
                    className={`text-[10px] mt-1 text-right ${
                      fromAgent ? "text-white/60" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(m.sentAt).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-lg border bg-white p-4 space-y-3">
        <Textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Write a message to this saver"
          rows={2}
        />
        <div className="flex justify-end">
          <Button size="sm" className="gap-2" onClick={sendReply} disabled={replying}>
            <Send className="w-3.5 h-3.5" />
            {replying ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
