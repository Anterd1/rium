"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  Bell,
  MessageSquare,
  Pencil,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Branch, Notification } from "@/lib/types";

const ALL_BRANCHES = "__all__";

function truncateBody(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function buildTargeting(
  branchScope: string,
  minPurchasesStr: string,
  giftOnly: boolean
): Notification["targeting"] {
  const t: NonNullable<Notification["targeting"]> = {};
  if (branchScope && branchScope !== ALL_BRANCHES) {
    t.branch_ids = [branchScope];
  }
  const trimmed = minPurchasesStr.trim();
  if (trimmed !== "") {
    const n = Number(trimmed);
    if (Number.isFinite(n) && n >= 0) {
      t.min_purchases = Math.floor(n);
    }
  }
  if (giftOnly) {
    t.gift_available = true;
  }
  return Object.keys(t).length ? t : null;
}

function typeBadgeClass(type: Notification["type"]) {
  switch (type) {
    case "push":
      return "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200";
    case "email":
      return "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-200";
    case "sms":
      return "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200";
    default:
      return "";
  }
}

function typeLabel(type: Notification["type"]) {
  switch (type) {
    case "push":
      return "Push";
    case "email":
      return "Email";
    case "sms":
      return "SMS";
    default:
      return type;
  }
}

type NotificacionesClientProps = {
  initialNotifications: Notification[];
  branches: Branch[];
  businessId: string | null;
};

export function NotificacionesClient({
  initialNotifications,
  branches,
  businessId,
}: NotificacionesClientProps) {
  const [notifications, setNotifications] =
    useState<Notification[]>(initialNotifications);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState<Notification | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<Notification["type"]>("push");
  const [branchScope, setBranchScope] = useState(ALL_BRANCHES);
  const [minPurchases, setMinPurchases] = useState("");
  const [giftOnly, setGiftOnly] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  function resetForm() {
    setTitle("");
    setBody("");
    setType("push");
    setBranchScope(ALL_BRANCHES);
    setMinPurchases("");
    setGiftOnly(false);
  }

  function openCreate() {
    if (!businessId) {
      toast.error("No hay un negocio asociado a tu cuenta.");
      return;
    }
    setEditing(null);
    resetForm();
    setFormOpen(true);
  }

  function openEdit(n: Notification) {
    setEditing(n);
    setTitle(n.title);
    setBody(n.body);
    setType(n.type);
    const ids = n.targeting?.branch_ids;
    if (ids?.length === 1) {
      setBranchScope(ids[0]);
    } else {
      setBranchScope(ALL_BRANCHES);
    }
    setMinPurchases(
      n.targeting?.min_purchases !== undefined
        ? String(n.targeting.min_purchases)
        : ""
    );
    setGiftOnly(n.targeting?.gift_available === true);
    setFormOpen(true);
  }

  async function persistNotification(sendNow: boolean) {
    if (!businessId) {
      toast.error("No hay un negocio asociado.");
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      toast.error("Completa el título y el mensaje.");
      return;
    }

    const targeting = buildTargeting(branchScope, minPurchases, giftOnly);

    const nowIso = new Date().toISOString();
    let sent_at: string | null;
    if (editing?.sent_at) {
      sent_at = editing.sent_at;
    } else {
      sent_at = sendNow ? nowIso : null;
    }

    const payload = {
      title: trimmedTitle,
      body: trimmedBody,
      type,
      targeting,
      sent_at,
    };

    setSaving(true);
    try {
      const url = editing
        ? `/api/notifications/${editing.id}`
        : "/api/notifications";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        notification?: Notification;
      };

      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "No se pudo guardar."
        );
        return;
      }

      if (data.notification) {
        setNotifications((prev) => {
          if (editing) {
            return prev.map((x) =>
              x.id === editing.id ? data.notification! : x
            );
          }
          return [data.notification!, ...prev];
        });
      }

      if (sendNow && !editing?.sent_at) {
        toast.success("Notificación enviada.");
      } else {
        toast.success(editing ? "Notificación actualizada." : "Borrador guardado.");
      }
      setFormOpen(false);
      setEditing(null);
      resetForm();
    } finally {
      setSaving(false);
    }
  }

  async function sendFromRow(n: Notification) {
    if (!businessId || n.sent_at) return;
    setSendingId(n.id);
    try {
      const res = await fetch(`/api/notifications/${n.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sent_at: new Date().toISOString() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        notification?: Notification;
      };
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "No se pudo enviar."
        );
        return;
      }
      if (data.notification) {
        setNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? data.notification! : x))
        );
      }
      toast.success("Notificación enviada.");
    } finally {
      setSendingId(null);
    }
  }

  function confirmDelete(n: Notification) {
    setDeleting(n);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`/api/notifications/${deleting.id}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "No se pudo eliminar."
        );
        return;
      }
      setNotifications((prev) => prev.filter((x) => x.id !== deleting.id));
      toast.success("Notificación eliminada.");
      setDeleteOpen(false);
      setDeleting(null);
    } finally {
      setDeletingLoading(false);
    }
  }

  const isEditingSent = Boolean(editing?.sent_at);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Notificaciones
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crea borradores y envía mensajes push, email o SMS a tus clientes.
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          disabled={!businessId}
          className="shrink-0 gap-1.5"
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          Nueva Notificación
        </Button>
      </div>

      {notifications.length === 0 ? (
        <Card className="border shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MessageSquare className="size-6" strokeWidth={1.5} aria-hidden />
            </div>
            <CardTitle className="text-lg">Sin notificaciones</CardTitle>
            <CardDescription>
              {businessId
                ? "Crea tu primera notificación para comunicarte con tus clientes."
                : "Asocia un negocio a tu cuenta para gestionar notificaciones."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button
              type="button"
              onClick={openCreate}
              disabled={!businessId}
              className="gap-1.5"
            >
              <Plus className="size-4" strokeWidth={1.75} aria-hidden />
              Nueva Notificación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {notifications.map((n) => (
              <div key={n.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{n.title}</p>
                  <Badge variant="outline" className={cn("shrink-0 font-normal", typeBadgeClass(n.type))}>
                    {typeLabel(n.type)}
                  </Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {n.sent_at
                      ? format(parseISO(n.sent_at), "d MMM yyyy, HH:mm", { locale: es })
                      : "Borrador"}
                  </span>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(n)}>
                      <Pencil className="size-4" strokeWidth={1.75} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" title="Enviar" disabled={Boolean(n.sent_at) || sendingId === n.id} onClick={() => sendFromRow(n)}>
                      <Send className="size-4" strokeWidth={1.75} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="Eliminar" onClick={() => confirmDelete(n)}>
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Título</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead className="w-[100px]">Tipo</TableHead>
                  <TableHead className="w-[180px]">Estado</TableHead>
                  <TableHead className="w-[140px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notifications.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium text-foreground">{n.title}</TableCell>
                    <TableCell className="max-w-[240px] text-muted-foreground">{truncateBody(n.body, 50)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("font-normal", typeBadgeClass(n.type))}>
                        {typeLabel(n.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {n.sent_at
                        ? format(parseISO(n.sent_at), "d MMM yyyy, HH:mm", { locale: es })
                        : <span className="text-muted-foreground">Borrador</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(n)}>
                          <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" title="Enviar" disabled={Boolean(n.sent_at) || sendingId === n.id} onClick={() => sendFromRow(n)}>
                          <Send className="size-4" strokeWidth={1.75} aria-hidden />
                          <span className="sr-only">Enviar</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" title="Eliminar" onClick={() => confirmDelete(n)}>
                          <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                          <span className="sr-only">Eliminar</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditing(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="size-5 text-muted-foreground" strokeWidth={1.75} />
              {editing ? "Editar notificación" : "Nueva notificación"}
            </DialogTitle>
            <DialogDescription>
              Redacta el mensaje y define a quién va dirigido. Puedes guardar como
              borrador o enviar al instante.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="notif-title">Título</Label>
              <Input
                id="notif-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Doble puntos este fin de semana"
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notif-body">Mensaje</Label>
              <Textarea
                id="notif-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe el contenido de la notificación…"
                rows={4}
                disabled={saving}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  if (v === "push" || v === "email" || v === "sms") setType(v);
                }}
                disabled={saving}
              >
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="push">Push</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
              <p className="text-sm font-medium text-foreground">Segmentación</p>
              <div className="grid gap-2">
                <Label>Sucursal</Label>
                <Select
                  value={branchScope}
                  onValueChange={(v) => setBranchScope(v ?? ALL_BRANCHES)}
                  disabled={saving}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_BRANCHES}>Todas</SelectItem>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notif-min-purchases">
                  Compras mínimas (opcional)
                </Label>
                <Input
                  id="notif-min-purchases"
                  type="number"
                  min={0}
                  step={1}
                  value={minPurchases}
                  onChange={(e) => setMinPurchases(e.target.value)}
                  placeholder="Ej. 3"
                  disabled={saving}
                />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="notif-gift">Solo con regalo disponible</Label>
                  <p className="text-xs text-muted-foreground">
                    Limita el envío a clientes que puedan canjear un regalo.
                  </p>
                </div>
                <Switch
                  id="notif-gift"
                  checked={giftOnly}
                  onCheckedChange={setGiftOnly}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormOpen(false);
                setEditing(null);
                resetForm();
              }}
              disabled={saving}
            >
              Cancelar
            </Button>
            {isEditingSent ? (
              <Button
                type="button"
                disabled={saving}
                onClick={() => persistNotification(false)}
              >
                {saving ? "Guardando…" : "Guardar cambios"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => persistNotification(false)}
                >
                  {saving ? "Guardando…" : "Guardar borrador"}
                </Button>
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => persistNotification(true)}
                >
                  {saving ? "Enviando…" : "Enviar ahora"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar notificación</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar{" "}
              <span className="font-medium text-foreground">
                {deleting?.title}
              </span>
              ? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setDeleting(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingLoading}
              onClick={handleDelete}
            >
              {deletingLoading ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
