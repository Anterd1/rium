"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  MapPin,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  UserCog,
} from "lucide-react";
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
import type { Branch, User } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  initialUsers: User[];
  currentUserId: string;
  branches: Pick<Branch, "id" | "name" | "active">[];
};

export function UsuariosClient({ initialUsers, currentUserId, branches }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(initialUsers);

  // ── Create form state ───────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]       = useState(false);
  const [createName, setCreateName]       = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [showPassword, setShowPassword]   = useState(false);
  const [createRole, setCreateRole]       = useState<"admin" | "operator">("operator");
  const [createBranch, setCreateBranch]   = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  // ── Edit form state ─────────────────────────────────────────────────────────
  const [editOpen, setEditOpen]     = useState(false);
  const [editUser, setEditUser]     = useState<User | null>(null);
  const [editName, setEditName]     = useState("");
  const [editRole, setEditRole]     = useState<"admin" | "operator">("operator");
  const [editBranch, setEditBranch] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  // ── Delete dialog state ─────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleteUser, setDeleteUser]     = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => { setUsers(initialUsers); }, [initialUsers]);

  const activeBranches = branches.filter((b) => b.active);
  const noBranches = activeBranches.length === 0;

  function resetCreateForm() {
    setCreateName("");
    setCreateUsername("");
    setCreatePassword("");
    setShowPassword(false);
    setCreateRole("operator");
    setCreateBranch("");
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      createName.trim(),
          username:  createUsername.trim(),
          password:  createPassword,
          role:      createRole,
          branch_id: createRole === "operator" ? createBranch : null,
        }),
      });
      const data = (await res.json()) as { error?: string; user?: User };

      if (!res.ok) {
        toast.error(data.error ?? "No se pudo crear el usuario");
        return;
      }

      if (data.user) {
        setUsers((prev) => [...prev, data.user!].sort((a, b) => a.name.localeCompare(b.name, "es")));
      }
      toast.success(`Usuario "${createUsername}" creado correctamente`);
      setCreateOpen(false);
      resetCreateForm();
      router.refresh();
    } finally {
      setCreateLoading(false);
    }
  }

  function openEdit(u: User) {
    setEditUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditBranch(u.branch_id ?? "");
    setEditOpen(true);
  }

  async function handleEditSubmit(e: FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditLoading(true);
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:      editName.trim(),
          role:      editRole,
          branch_id: editRole === "operator" ? editBranch || null : null,
        }),
      });
      const data = (await res.json()) as { error?: string; user?: User };
      if (!res.ok) { toast.error(data.error ?? "No se pudo actualizar"); return; }
      if (data.user) setUsers((prev) => prev.map((r) => r.id === data.user!.id ? data.user! : r));
      toast.success("Usuario actualizado");
      setEditOpen(false);
      setEditUser(null);
      router.refresh();
    } finally {
      setEditLoading(false);
    }
  }

  async function handleActiveChange(row: User, next: boolean) {
    if (row.id === currentUserId && !next) {
      toast.error("No puedes desactivar tu propia cuenta");
      return;
    }
    const res = await fetch(`/api/users/${row.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: next }),
    });
    const data = (await res.json()) as { error?: string; user?: User };
    if (!res.ok) { toast.error(data.error ?? "No se pudo actualizar el estado"); return; }
    if (data.user) setUsers((prev) => prev.map((u) => u.id === data.user!.id ? data.user! : u));
    toast.success(next ? "Usuario activado" : "Usuario desactivado");
    router.refresh();
  }

  function openDelete(u: User) { setDeleteUser(u); setDeleteOpen(true); }

  async function handleConfirmDelete() {
    if (!deleteUser) return;
    if (deleteUser.id === currentUserId) { toast.error("No puedes eliminar tu propia cuenta"); return; }
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "No se pudo eliminar"); return; }
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      toast.success("Usuario eliminado");
      setDeleteOpen(false);
      setDeleteUser(null);
      router.refresh();
    } finally {
      setDeleteLoading(false);
    }
  }

  function branchName(branchId: string | null) {
    if (!branchId) return null;
    return branches.find((b) => b.id === branchId)?.name ?? null;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <UserCog className="size-5" strokeWidth={1.75} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Usuarios</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Equipo con acceso al panel de tu negocio.
            </p>
          </div>
        </div>
        <Button
          type="button"
          className="shrink-0 gap-2"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="size-4" strokeWidth={1.75} />
          Nuevo usuario
        </Button>
      </div>

      {/* Mobile: cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {users.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No hay usuarios en este negocio.</p>
        ) : (
          users.map((row) => {
            const isSelf  = row.id === currentUserId;
            const branch  = branchName(row.branch_id);
            return (
              <div key={row.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">
                      {row.name}
                      {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground/60">(tú)</span>}
                    </p>
                    {row.username && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">@{row.username}</p>
                    )}
                  </div>
                  {row.role === "admin" ? (
                    <Badge variant="default" className="shrink-0 gap-1 border-0 bg-primary text-primary-foreground">
                      <Shield className="size-3" />Admin
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0 gap-1">
                      <ShieldCheck className="size-3" />Operador
                    </Badge>
                  )}
                </div>
                {branch && (
                  <p className="mt-2 text-xs text-muted-foreground">Sucursal: {branch}</p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={row.active}
                      disabled={isSelf}
                      onCheckedChange={(checked) => handleActiveChange(row, checked)}
                    />
                    <span className="text-xs text-muted-foreground">{row.active ? "Activo" : "Inactivo"}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => openEdit(row)}>
                      <Pencil className="size-4" strokeWidth={1.75} />
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" disabled={isSelf} onClick={() => openDelete(row)}>
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm sm:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nombre</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Sucursal</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No hay usuarios en este negocio.
                </TableCell>
              </TableRow>
            ) : (
              users.map((row) => {
                const isSelf = row.id === currentUserId;
                const branch = branchName(row.branch_id);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium text-foreground">
                      {row.name}
                      {isSelf && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground/60">(tú)</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {row.username ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {branch ?? <span className="text-muted-foreground/40">—</span>}
                    </TableCell>
                    <TableCell>
                      {row.role === "admin" ? (
                        <Badge variant="default" className="gap-1 border-0 bg-primary text-primary-foreground">
                          <Shield className="size-3" />Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldCheck className="size-3" />Operador
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={row.active}
                          disabled={isSelf}
                          onCheckedChange={(checked) => handleActiveChange(row, checked)}
                        />
                        {row.active ? (
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground" onClick={() => openEdit(row)}>
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </Button>
                        <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" disabled={isSelf} onClick={() => openDelete(row)}>
                          <Trash2 className="size-4" strokeWidth={1.75} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          {noBranches ? (
            <>
              <DialogHeader>
                <DialogTitle>Nuevo usuario</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20">
                  <MapPin className="size-7 text-amber-500" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Primero crea una sucursal</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Los operadores necesitan una sucursal asignada. Crea al menos una antes de agregar usuarios.
                  </p>
                </div>
                <Link
                  href="/dashboard/sucursales"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Ir a Sucursales →
                </Link>
              </div>
            </>
          ) : (
          <form onSubmit={handleCreateSubmit}>
            <DialogHeader>
              <DialogTitle>Nuevo usuario</DialogTitle>
              <DialogDescription>
                El operador usará su nombre de usuario y contraseña para iniciar sesión en la app de escaneo.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              {/* Branch — first because it's a prerequisite */}
              <div className="grid gap-2">
                <Label>Sucursal</Label>
                <Select
                  value={createBranch}
                  onValueChange={setCreateBranch}
                  required={createRole === "operator"}
                >
                  <SelectTrigger className="w-full min-w-0">
                    <span className={cn("flex-1 truncate text-left text-sm", !createBranch && "text-muted-foreground")}>
                      {createBranch
                        ? (activeBranches.find((b) => b.id === createBranch)?.name ?? "Seleccionar sucursal…")
                        : "Seleccionar sucursal…"}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {activeBranches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="c-name">Nombre completo</Label>
                <Input
                  id="c-name"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              {/* Username */}
              <div className="grid gap-2">
                <Label htmlFor="c-username">Usuario</Label>
                <Input
                  id="c-username"
                  required
                  autoComplete="off"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                  placeholder="juanperez"
                />
                <p className="text-[11px] text-muted-foreground">
                  Solo letras, números, puntos y guiones. Sin espacios.
                </p>
              </div>

              {/* Password */}
              <div className="grid gap-2">
                <Label htmlFor="c-password">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="c-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {/* Role */}
              <div className="grid gap-2">
                <Label>Rol</Label>
                <Select value={createRole} onValueChange={(v) => { if (v === "admin" || v === "operator") setCreateRole(v); }}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operador — solo escaneo</SelectItem>
                    <SelectItem value="admin">Administrador — acceso completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createLoading || (createRole === "operator" && !createBranch)}>
                {createLoading ? "Creando…" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ────────────────────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditUser(null); }}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <form onSubmit={handleEditSubmit}>
            <DialogHeader>
              <DialogTitle>Editar usuario</DialogTitle>
              <DialogDescription>
                Actualiza los datos de <span className="font-medium text-foreground">{editUser?.name}</span>.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="e-name">Nombre</Label>
                <Input id="e-name" required value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              {editRole === "operator" && (
                <div className="grid gap-2">
                  <Label>Sucursal</Label>
                  <Select value={editBranch} onValueChange={setEditBranch}>
                    <SelectTrigger className="w-full min-w-0">
                      <span className={cn("flex-1 truncate text-left text-sm", !editBranch && "text-muted-foreground")}>
                        {editBranch
                          ? (activeBranches.find((b) => b.id === editBranch)?.name ?? "Sin sucursal asignada")
                          : "Sin sucursal asignada"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {activeBranches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid gap-2">
                <Label>Rol</Label>
                <Select value={editRole} onValueChange={(v) => { if (v === "admin" || v === "operator") setEditRole(v); }}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => { setEditOpen(false); setEditUser(null); }}>Cancelar</Button>
              <Button type="submit" disabled={editLoading}>{editLoading ? "Guardando…" : "Guardar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete dialog ──────────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) setDeleteUser(null); }}>
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar a{" "}
              <span className="font-medium text-foreground">{deleteUser?.name}</span>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => { setDeleteOpen(false); setDeleteUser(null); }}>Cancelar</Button>
            <Button type="button" variant="destructive" disabled={deleteLoading || deleteUser?.id === currentUserId} onClick={handleConfirmDelete}>
              {deleteLoading ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
