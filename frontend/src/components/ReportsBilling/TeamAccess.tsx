import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { teamMembers, type TeamMember } from "@/data/reports-billing";

const ROLES = ["Admin", "Editor", "Viewer"];
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function TeamAccess() {
  const [members, setMembers] = useState<TeamMember[]>(teamMembers);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Viewer");
  const [error, setError] = useState<string | null>(null);

  function openInvite() {
    setEmail("");
    setRole("Viewer");
    setError(null);
    setInviteOpen(true);
  }

  function invite(e: FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError("Enter a valid email address.");
      return;
    }
    if (members.some((m) => m.email.toLowerCase() === value)) {
      setError("That person is already on the team.");
      return;
    }
    const name = value.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    setMembers((prev) => [
      ...prev,
      { id: `invite-${Date.now()}`, name, email: value, avatar: "", role, lastActive: "Never", status: "Invited" },
    ]);
    setInviteOpen(false);
    toast.success(`Demo mode: invite for ${value} saved locally.`, {
      description: "Emails send once the API is connected.",
    });
  }

  function changeRole(member: TeamMember, next: string) {
    setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: next } : m)));
    toast(`${member.name} is now ${next === "Admin" ? "an" : "a"} ${next.toLowerCase()}`, {
      description: "Demo mode: saved for this session only.",
    });
  }

  function remove(member: TeamMember) {
    const snapshot = members;
    setMembers((prev) => prev.filter((m) => m.id !== member.id));
    toast(`${member.name} removed`, {
      description: "Demo mode: saved for this session only.",
      action: { label: "Undo", onClick: () => setMembers(snapshot) },
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Team Access</h2>
        <Button size="sm" className="gap-2" onClick={openInvite}>
          <Plus className="h-4 w-4" />
          Invite team member
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatar} />
                      <AvatarFallback>{member.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{member.name}</span>
                      <span className="text-xs text-muted-foreground">{member.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Select value={member.role} onValueChange={(v) => changeRole(member, v)}>
                    <SelectTrigger className="w-[110px] h-8 text-xs" aria-label={`Role for ${member.name}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm">{member.lastActive}</TableCell>
                <TableCell>
                  <Badge variant={member.status === "Active" ? "secondary" : "outline"} className="text-[10px]">
                    {member.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(member)}
                    aria-label={`Remove ${member.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <form onSubmit={invite}>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
              <DialogDescription>They get access to this workspace with the role you pick.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit">Save invite</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}