import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
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
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty.tsx";
import {
  FileSpreadsheet,
  Phone,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

type Frequency = "daily" | "weekly" | "monthly";

const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const WEEKDAYS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export default function ContributorIntake() {
  const pendingImportsQuery = useQuery(api.admin.listPendingContributorImports);
  const agentsQuery = useQuery(api.admin.listAgents);
  const pendingImports = pendingImportsQuery ?? [];
  const agents = agentsQuery ?? [];
  const bulkImportContributors = useMutation(api.admin.bulkImportContributors);
  const assignImportedContributor = useMutation(
    api.admin.assignImportedContributor,
  );

  const [rawImportText, setRawImportText] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedContributorId, setSelectedContributorId] =
    useState<Id<"contributors"> | null>(null);
  const [phone, setPhone] = useState("+234");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [agentId, setAgentId] = useState("");
  const [weeklyDay, setWeeklyDay] = useState("1");
  const [monthlyDay, setMonthlyDay] = useState("1");

  const parsedRows = useMemo(
    () => parsePastedContributorRows(rawImportText),
    [rawImportText],
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredImports = normalizedSearch
    ? pendingImports.filter((contributor) =>
        contributor.name.toLowerCase().includes(normalizedSearch),
      )
    : pendingImports;

  const selectedContributor =
    pendingImports.find((contributor) => contributor._id === selectedContributorId) ??
    null;

  const handleImport = async () => {
    if (parsedRows.length === 0) {
      toast.error("Paste the Excel rows first.");
      return;
    }

    setImporting(true);
    try {
      const result = await bulkImportContributors({ rows: parsedRows });
      toast.success(
        `${result.importedCount} contributor(s) imported. ${result.skippedCount} duplicate/existing name(s) skipped.`,
      );
      setRawImportText("");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message?: string };
        toast.error(data.message ?? "Import failed");
      } else {
        toast.error("Import failed");
      }
    } finally {
      setImporting(false);
    }
  };

  const openAssignDialog = (contributorId: Id<"contributors">) => {
    setSelectedContributorId(contributorId);
    setPhone("+234");
    setFrequency("daily");
    setAgentId(agents[0]?._id ?? "");
    setWeeklyDay("1");
    setMonthlyDay("1");
  };

  const handleAssign = async () => {
    if (!selectedContributor) {
      return;
    }

    if (!phone.trim() || !agentId) {
      toast.error("Add the phone number and choose the agent.");
      return;
    }

    setSaving(true);
    try {
      await assignImportedContributor({
        contributorId: selectedContributor._id,
        phone: phone.trim(),
        frequency,
        agentId: agentId as Id<"users">,
        weeklyDay: frequency === "weekly" ? Number(weeklyDay) : undefined,
        monthlyDay: frequency === "monthly" ? Number(monthlyDay) : undefined,
      });

      const agentName =
        agents.find((agent) => agent._id === agentId)?.name ?? "the selected agent";
      toast.success(`${selectedContributor.name} has been assigned to ${agentName}.`);
      setSelectedContributorId(null);
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message?: string };
        toast.error(data.message ?? "Failed to assign contributor");
      } else {
        toast.error("Failed to assign contributor");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-serif">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Excel Contributor Intake
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Paste rows copied from Excel. Only the name and amount are imported now;
            any contributor already on the system is skipped automatically.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-import">Paste Excel rows</Label>
            <Textarea
              id="excel-import"
              value={rawImportText}
              onChange={(event) => setRawImportText(event.target.value)}
              placeholder={"ADEYEMI PEACE VICTORIA\t500\nALIYU TEMITOPE VICTORIA\t500\nADEWOLE KAYODE\t500"}
              className="min-h-40"
            />
            <p className="text-xs text-muted-foreground">
              Copy directly from Excel and paste here. Tabs and extra spaces are supported.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-dashed p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Preview</p>
              <p className="text-muted-foreground">
                {parsedRows.length} valid row(s) ready to import
              </p>
            </div>
            <Button onClick={handleImport} disabled={importing || parsedRows.length === 0}>
              {importing ? "Importing..." : `Import ${parsedRows.length} Contributor(s)`}
            </Button>
          </div>

          {parsedRows.length > 0 && (
            <div className="rounded-lg bg-muted/40 p-3 text-sm">
              <p className="mb-2 font-medium">Detected rows</p>
              <div className="space-y-1 text-muted-foreground">
                {parsedRows.slice(0, 6).map((row, index) => (
                  <div key={`${row.name}-${index}`} className="flex items-center justify-between gap-3">
                    <span className="truncate">{row.name}</span>
                    <span className="font-medium text-foreground">₦{row.amount.toLocaleString()}</span>
                  </div>
                ))}
                {parsedRows.length > 6 && (
                  <p className="pt-1 text-xs">+ {parsedRows.length - 6} more row(s)</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg font-serif">
            <UserCheck className="h-5 w-5 text-primary" />
            Pending Contributor Setup
            <Badge variant="secondary">{pendingImports.length}</Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            These imported contributors stay on the admin dashboard until you add a phone number,
            contribution type, and assign the owning agent.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search imported contributors by name"
              className="pl-9"
            />
          </div>

          {filteredImports.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Users />
                </EmptyMedia>
                <EmptyTitle>No pending imports</EmptyTitle>
                <EmptyDescription>
                  Import contributors from Excel and they will show up here for admin setup.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {filteredImports.map((contributor) => (
                <div
                  key={contributor._id}
                  className="flex flex-col gap-3 rounded-lg bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{contributor.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>Amount: ₦{contributor.dailyAmount.toLocaleString()}</span>
                      <Badge
                        variant="secondary"
                        className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      >
                        awaiting setup
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => openAssignDialog(contributor._id)}>
                    Complete details
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={selectedContributor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedContributorId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              Complete contributor setup
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">{selectedContributor?.name ?? "Contributor"}</p>
              <p className="text-muted-foreground">
                Imported amount: ₦{selectedContributor?.dailyAmount?.toLocaleString() ?? 0}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pending-phone" className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Phone Number
              </Label>
              <Input
                id="pending-phone"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+2348012345678"
              />
            </div>

            <div className="space-y-2">
              <Label>Contribution Type</Label>
              <Select value={frequency} onValueChange={(value) => setFrequency(value as Frequency)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose contribution type" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label>Weekly collection day</Label>
                <Select value={weeklyDay} onValueChange={setWeeklyDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {WEEKDAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {frequency === "monthly" && (
              <div className="space-y-2">
                <Label>Monthly collection day</Label>
                <Select value={monthlyDay} onValueChange={setMonthlyDay}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, index) => {
                      const day = String(index + 1);
                      return (
                        <SelectItem key={day} value={day}>
                          {day}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Owning Agent</Label>
              <Select value={agentId} onValueChange={setAgentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent._id} value={agent._id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button className="w-full" onClick={handleAssign} disabled={saving}>
              {saving ? "Saving..." : "Save and move to agent"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function parsePastedContributorRows(rawText: string) {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line
        .split(/\t+|\s{2,}/)
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length < 2) {
        return null;
      }

      const amountText = parts.at(-1)?.replace(/[₦,]/g, "") ?? "";
      const amount = Number(amountText);
      const name = parts.slice(0, -1).join(" ");

      if (!name || !Number.isFinite(amount) || amount <= 0) {
        return null;
      }

      return {
        name,
        amount,
      };
    })
    .filter((row): row is { name: string; amount: number } => row !== null);
}
