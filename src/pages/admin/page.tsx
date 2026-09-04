import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api.js';
import { Spinner } from '@/components/ui/spinner.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { toast } from 'sonner';
import { useAdminAuth } from '@/context/AdminAuthContext.tsx';

const NAVY = '#1e3a6d';
const naira = (n: number) => '₦' + (n ?? 0).toLocaleString('en-NG');

export default function AdminDashboard() {
  const { token, user, loading, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const home = useQuery(
    api.collections.adminHomeForApp,
    token ? { sessionToken: token } : 'skip',
  );
  const approveAgent = useMutation(api.collections.approveAgentForApp);
  const rejectAgent = useMutation(api.collections.rejectAgentForApp);
  const rejectContributor = useMutation(api.collections.rejectContributorForApp);
  const assign = useMutation(api.collections.assignContributorForApp);
  const reviewWithdrawal = useMutation(api.collections.reviewWithdrawalForApp);

  const [picking, setPicking] = useState<any>(null);

  useEffect(() => {
    if (!loading && !token) navigate('/admin-login', { replace: true });
  }, [loading, token, navigate]);

  if (loading || home === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (home === null) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-muted-foreground">This account is not an administrator.</p>
        <Button variant="outline" onClick={() => { signOut(); navigate('/admin-login'); }}>
          Sign out
        </Button>
      </div>
    );
  }

  const doReviewWithdrawal = async (id: any, action: 'paid' | 'rejected') => {
    try {
      const r = await reviewWithdrawal({ sessionToken: token!, requestId: id, action });
      if (r.awaitingSecond) {
        toast.success('First approval recorded. A second admin must confirm.');
      } else {
        toast.success(action === 'paid' ? 'Marked as paid' : 'Declined');
      }
    } catch (e: any) {
      toast.error(e?.data?.message ?? 'Could not update');
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f4f7fb' }}>
      <div style={{ backgroundColor: NAVY }} className="px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white text-xl font-bold">OWODE Admin</h1>
            <p className="text-white/70 text-sm">{home.adminName}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => { signOut(); navigate('/admin-login'); }}
          >
            Sign out
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Total collected" value={naira(home.totalCollected)} big />
          <Stat label="Savers" value={home.totalContributors} />
          <Stat label="Agents" value={home.totalAgents} />
          <Stat label="Payouts waiting" value={home.pendingWithdrawals.length} />
        </div>

        <Tabs defaultValue="agents">
          <TabsList>
            <TabsTrigger value="agents">
              Agents {home.pendingAgents.length ? `(${home.pendingAgents.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="savers">
              Savers {home.unassigned.length ? `(${home.unassigned.length})` : ''}
            </TabsTrigger>
            <TabsTrigger value="payouts">
              Payouts {home.pendingWithdrawals.length ? `(${home.pendingWithdrawals.length})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-6 pt-4">
            <Section title="Awaiting approval">
              {home.pendingAgents.length === 0 ? (
                <Empty />
              ) : (
                home.pendingAgents.map((a: any) => (
                  <Row key={a.id} title={a.name} subtitle={a.phone}>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await rejectAgent({ sessionToken: token!, agentId: a.id });
                          toast.success('Declined');
                        } catch (e: any) {
                          toast.error(e?.data?.message ?? 'Could not decline');
                        }
                      }}
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={async () => {
                        try {
                          await approveAgent({ sessionToken: token!, agentId: a.id });
                          toast.success('Approved');
                        } catch (e: any) {
                          toast.error(e?.data?.message ?? 'Could not approve');
                        }
                      }}
                    >
                      Approve
                    </Button>
                  </Row>
                ))
              )}
            </Section>

            <Section title="Approved">
              {home.approvedAgents.length === 0 ? (
                <Empty />
              ) : (
                home.approvedAgents.map((a: any) => (
                  <Row key={a.id} title={a.name} subtitle={a.phone} />
                ))
              )}
            </Section>

            <Section title="Declined">
              {home.rejectedAgents.length === 0 ? (
                <Empty />
              ) : (
                home.rejectedAgents.map((a: any) => (
                  <Row key={a.id} title={a.name} subtitle={a.phone} />
                ))
              )}
            </Section>
          </TabsContent>

          <TabsContent value="savers" className="space-y-6 pt-4">
            <Section title="Waiting for an agent">
              {home.unassigned.length === 0 ? (
                <Empty />
              ) : (
                home.unassigned.map((c: any) => (
                  <Row
                    key={c.id}
                    title={c.name}
                    subtitle={`${c.phone} - ${naira(c.amount)} ${c.frequency}${c.address ? ' - ' + c.address : ''}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await rejectContributor({ sessionToken: token!, contributorId: c.id });
                          toast.success('Declined');
                        } catch (e: any) {
                          toast.error(e?.data?.message ?? 'Could not decline');
                        }
                      }}
                    >
                      Decline
                    </Button>
                    <Button size="sm" onClick={() => setPicking(c)}>
                      Assign agent
                    </Button>
                  </Row>
                ))
              )}
            </Section>

            <Section title="Assigned">
              {home.assignedContributors.length === 0 ? (
                <Empty />
              ) : (
                home.assignedContributors.map((c: any) => (
                  <Row
                    key={c.id}
                    title={c.name}
                    subtitle={`${naira(c.amount)} ${c.frequency} - ${c.agentName}`}
                  />
                ))
              )}
            </Section>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6 pt-4">
            <Section title="To review">
              {home.pendingWithdrawals.length === 0 ? (
                <Empty />
              ) : (
                home.pendingWithdrawals.map((w: any) => (
                  <Row
                    key={w.id}
                    title={`${w.name} - ${naira(w.payout)}`}
                    subtitle={`${w.bankName} ${w.accountNumber}${w.awaitingSecond ? ' - needs a second admin' : ''}`}
                  >
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => doReviewWithdrawal(w.id, 'rejected')}
                    >
                      Decline
                    </Button>
                    <Button size="sm" onClick={() => doReviewWithdrawal(w.id, 'paid')}>
                      {w.awaitingSecond ? 'Confirm payout' : 'Approve'}
                    </Button>
                  </Row>
                ))
              )}
            </Section>
          </TabsContent>
        </Tabs>
      </div>

      {picking ? (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <div>
              <h3 className="font-bold text-lg">Choose an agent</h3>
              <p className="text-sm text-muted-foreground">
                for {picking.name} - {naira(picking.amount)} {picking.frequency}
              </p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y">
              {home.approvedAgents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">No approved agents yet.</p>
              ) : (
                home.approvedAgents.map((a: any) => (
                  <button
                    key={a.id}
                    className="w-full text-left py-3 hover:bg-muted/50 px-2 rounded"
                    onClick={async () => {
                      try {
                        await assign({
                          sessionToken: token!,
                          contributorId: picking.id,
                          agentId: a.id,
                          amount: picking.amount || 0,
                          frequency: picking.frequency || 'daily',
                        });
                        setPicking(null);
                        toast.success('Assigned');
                      } catch (e: any) {
                        toast.error(e?.data?.message ?? 'Could not assign');
                      }
                    }}
                  >
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.phone}</p>
                  </button>
                ))
              )}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setPicking(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, big }: any) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={big ? 'text-2xl font-bold mt-1' : 'text-xl font-bold mt-1'}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ title, subtitle, children }: any) {
  return (
    <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>
      <div className="flex gap-2 shrink-0">{children}</div>
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground py-2">None.</p>;
}
