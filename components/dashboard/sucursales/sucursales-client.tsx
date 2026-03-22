"use client";

import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, ToggleLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Branch, Business } from "@/lib/types";
import { PLAN_LIMITS } from "@/lib/types";

type SucursalesClientProps = {
  initialBranches: Branch[];
  plan: Business["plan"];
  businessId: string | null;
};

export function SucursalesClient({
  initialBranches,
  plan,
  businessId,
}: SucursalesClientProps) {
  const [branches, setBranches] = useState<Branch[]>(initialBranches);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingLoading, setDeletingLoading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    setBranches(initialBranches);
  }, [initialBranches]);

  const planKey = plan;
  const maxBranches = PLAN_LIMITS[planKey]?.max_branches ?? 1;
  const atLimit = branches.length >= maxBranches;
  const canCreate = Boolean(businessId) && !atLimit;

  function openCreate() {
    if (!businessId) {
      toast.error("No hay un negocio asociado a tu cuenta.");
      return;
    }
    if (atLimit) {
      toast.error(
        `Tu plan ${planKey} permite hasta ${maxBranches} sucursal(es). Actualiza tu plan para agregar más.`
      );
      return;
    }
    setEditing(null);
    setName("");
    setAddress("");
    setFormOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setName(branch.name);
    setAddress(branch.address);
    setFormOpen(true);
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!businessId) {
      toast.error("No hay un negocio asociado.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName || !trimmedAddress) {
      toast.error("Completa nombre y dirección.");
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const res = await fetch(`/api/branches/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, address: trimmedAddress }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(
            typeof data.error === "string" ? data.error : "No se pudo guardar."
          );
          return;
        }
        setBranches((prev) =>
          prev.map((b) => (b.id === editing.id ? { ...b, ...data.branch } : b))
        );
        toast.success("Sucursal actualizada.");
        setFormOpen(false);
      } else {
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, address: trimmedAddress }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data.code === "PLAN_LIMIT") {
          toast.error(
            typeof data.error === "string"
              ? data.error
              : "Límite de sucursales alcanzado."
          );
          return;
        }
        if (!res.ok) {
          toast.error(
            typeof data.error === "string" ? data.error : "No se pudo crear."
          );
          return;
        }
        if (data.branch) {
          setBranches((prev) => [...prev, data.branch].sort((a, b) => a.name.localeCompare(b.name)));
        }
        toast.success("Sucursal creada.");
        setFormOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(branch: Branch) {
    if (!businessId) return;
    setTogglingId(branch.id);
    try {
      const next = !branch.active;
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "No se pudo actualizar el estado."
        );
        return;
      }
      setBranches((prev) =>
        prev.map((b) => (b.id === branch.id ? { ...b, active: next } : b))
      );
      toast.success(next ? "Sucursal activada." : "Sucursal desactivada.");
    } finally {
      setTogglingId(null);
    }
  }

  function confirmDelete(branch: Branch) {
    setDeleting(branch);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletingLoading(true);
    try {
      const res = await fetch(`/api/branches/${deleting.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof data.error === "string" ? data.error : "No se pudo eliminar."
        );
        return;
      }
      setBranches((prev) => prev.filter((b) => b.id !== deleting.id));
      toast.success("Sucursal eliminada.");
      setDeleteOpen(false);
      setDeleting(null);
    } finally {
      setDeletingLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Sucursales
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administra las ubicaciones de tu negocio. Plan {planKey}: hasta{" "}
            {maxBranches} sucursal(es).
          </p>
        </div>
        <Button
          type="button"
          onClick={openCreate}
          disabled={!businessId || atLimit}
          title={
            atLimit
              ? `Tu plan permite hasta ${maxBranches} sucursal(es).`
              : undefined
          }
          className="shrink-0 gap-1.5"
        >
          <Plus className="size-4" strokeWidth={1.75} aria-hidden />
          Nueva Sucursal
        </Button>
      </div>

      {branches.length === 0 ? (
        <Card className="border shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MapPin className="size-6" strokeWidth={1.5} aria-hidden />
            </div>
            <CardTitle className="text-lg">Aún no hay sucursales</CardTitle>
            <CardDescription>
              {businessId
                ? "Crea tu primera sucursal para asociar compras y canjes a una ubicación."
                : "Asocia un negocio a tu cuenta para gestionar sucursales."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button
              type="button"
              onClick={openCreate}
              disabled={!canCreate}
              className="gap-1.5"
            >
              <Plus className="size-4" strokeWidth={1.75} aria-hidden />
              Nueva Sucursal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {branches.map((branch) => (
              <div key={branch.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-foreground">{branch.name}</p>
                  <Badge
                    variant={branch.active ? "outline" : "destructive"}
                    className={cn(
                      "shrink-0",
                      branch.active &&
                        "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                    )}
                  >
                    {branch.active ? "Activa" : "Inactiva"}
                  </Badge>
                </div>
                {branch.address && (
                  <p className="mt-1 text-sm text-muted-foreground">{branch.address}</p>
                )}
                <div className="mt-3 flex justify-end gap-1 border-t border-border pt-3">
                  <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(branch)}>
                    <Pencil className="size-4" strokeWidth={1.75} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" title={branch.active ? "Desactivar" : "Activar"} disabled={togglingId === branch.id} onClick={() => handleToggleActive(branch)}>
                    <ToggleLeft className="size-4" strokeWidth={1.75} />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" title="Eliminar" onClick={() => confirmDelete(branch)}>
                    <Trash2 className="size-4" strokeWidth={1.75} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[140px] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch.id}>
                    <TableCell className="font-medium text-foreground">{branch.name}</TableCell>
                    <TableCell className="max-w-[280px] truncate text-muted-foreground">{branch.address}</TableCell>
                    <TableCell>
                      <Badge
                        variant={branch.active ? "outline" : "destructive"}
                        className={cn(branch.active && "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200")}
                      >
                        {branch.active ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon-sm" title="Editar" onClick={() => openEdit(branch)}>
                          <Pencil className="size-4" strokeWidth={1.75} aria-hidden />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" title={branch.active ? "Desactivar" : "Activar"} disabled={togglingId === branch.id} onClick={() => handleToggleActive(branch)}>
                          <ToggleLeft className="size-4" strokeWidth={1.75} aria-hidden />
                          <span className="sr-only">{branch.active ? "Desactivar" : "Activar"}</span>
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" title="Eliminar" onClick={() => confirmDelete(branch)}>
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitForm}>
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar sucursal" : "Nueva sucursal"}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? "Actualiza los datos de la sucursal."
                  : "Agrega una ubicación para tu programa de lealtad."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="branch-name">Nombre</Label>
                <Input
                  id="branch-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Centro"
                  autoComplete="organization"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="branch-address">Dirección</Label>
                <Input
                  id="branch-address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, número, ciudad"
                  autoComplete="street-address"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFormOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Guardando…" : editing ? "Guardar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
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
            <DialogTitle>Eliminar sucursal</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar{" "}
              <span className="font-medium text-foreground">
                {deleting?.name}
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
