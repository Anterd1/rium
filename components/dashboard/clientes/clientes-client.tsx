"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Plus, Search, UserPlus, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

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
import type { Customer } from "@/lib/types";

type ClientesClientProps = {
  customers: Customer[];
};

export function ClientesClient({ customers }: ClientesClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const hay = [c.name, c.email, c.phone ?? ""].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [customers, query]);

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("Nombre y correo son obligatorios");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "No se pudo crear el cliente");
        return;
      }
      toast.success("Cliente creado");
      setDialogOpen(false);
      resetForm();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Clientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona los clientes de tu programa de lealtad.
          </p>
        </div>
        <Button
          type="button"
          size="default"
          className="gap-2 self-start sm:self-auto"
          onClick={() => setDialogOpen(true)}
        >
          <UserPlus className="size-4" strokeWidth={1.75} aria-hidden />
          Nuevo Cliente
        </Button>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          strokeWidth={1.75}
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Buscar por nombre, correo o teléfono…"
          className="h-10 pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Buscar clientes"
        />
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/40 py-16 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Users className="size-6" strokeWidth={1.5} aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">Aún no hay clientes</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Crea tu primer cliente para empezar a registrar compras y canjes.
          </p>
          <Button type="button" className="mt-6 gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" strokeWidth={1.75} aria-hidden />
            Añadir cliente
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay resultados para &ldquo;{query.trim()}&rdquo;.
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <div className="hidden overflow-hidden rounded-xl border bg-card shadow-sm sm:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Alta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/dashboard/clientes/${row.id}`)}
                  >
                    <TableCell className="font-medium text-foreground">{row.name}</TableCell>
                    <TableCell className="text-muted-foreground">{row.email}</TableCell>
                    <TableCell className="text-muted-foreground">{row.phone ?? "—"}</TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {format(new Date(row.created_at), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: cards */}
          <div className="flex flex-col gap-3 sm:hidden">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => router.push(`/dashboard/clientes/${row.id}`)}
                className="w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-shadow hover:shadow-md active:scale-[0.99]"
              >
                <p className="font-semibold text-foreground">{row.name}</p>
                <p className="mt-1 truncate text-sm text-muted-foreground">{row.email}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{row.phone ?? "Sin teléfono"}</span>
                  <span>{format(new Date(row.created_at), "dd/MM/yyyy", { locale: es })}</span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAdd}>
            <DialogHeader>
              <DialogTitle>Nuevo cliente</DialogTitle>
              <DialogDescription>
                Los datos se guardan en tu negocio y podrás asignarles tarjetas después.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="client-name">Nombre</Label>
                <Input
                  id="client-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-email">Correo</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="client-phone">Teléfono</Label>
                <Input
                  id="client-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>
            <DialogFooter className="border-0 bg-transparent p-0 pt-2 sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
