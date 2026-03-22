"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Key,
  Monitor,
  Moon,
  Palette,
  RefreshCw,
  Settings,
  Sun,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { CardPreview } from "@/components/dashboard/tarjetas/card-preview";
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
import { Separator } from "@/components/ui/separator";
import { useDashboardTheme } from "@/components/dashboard/dashboard-theme-context";
import type { Business } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = {
  initialBusiness: Business;
};

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return "#ffffff";
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 140 ? "#0f172a" : "#ffffff";
}

function maskApiKey(key: string | undefined): string {
  if (!key) return "Sin clave — genera una nueva";
  if (key.length <= 10) return "•".repeat(Math.min(key.length, 8));
  return `${key.slice(0, 4)}••••••••${key.slice(-4)}`;
}

function appBaseUrl(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
}

export function ConfiguracionClient({ initialBusiness }: Props) {
  const router = useRouter();
  const { theme, setTheme } = useDashboardTheme();
  const [business, setBusiness] = useState<Business>(initialBusiness);
  const [name, setName] = useState(initialBusiness.name);
  const [logoUrl, setLogoUrl] = useState<string | null>(
    initialBusiness.logo_url
  );
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const branding = business.branding;
  const [primaryColor, setPrimaryColor] = useState(
    branding?.primary_color ?? "#0f172a"
  );
  const [secondaryColor, setSecondaryColor] = useState(
    branding?.secondary_color ?? "#6366f1"
  );
  const [apiKey, setApiKey] = useState(branding?.api_key ?? "");

  const [perfilSaving, setPerfilSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [regenerateLoading, setRegenerateLoading] = useState(false);

  const tabNav = [
    { value: "perfil", label: "Perfil", icon: Settings },
    { value: "branding", label: "Branding", icon: Palette },
    { value: "api", label: "API", icon: Key },
    { value: "apariencia", label: "Apariencia", icon: Sun },
  ] as const;
  type TabValue = (typeof tabNav)[number]["value"];
  const [activeTab, setActiveTab] = useState<TabValue>("perfil");

  useEffect(() => {
    setBusiness(initialBusiness);
    setName(initialBusiness.name);
    setLogoUrl(initialBusiness.logo_url);
    setPrimaryColor(initialBusiness.branding?.primary_color ?? "#0f172a");
    setSecondaryColor(initialBusiness.branding?.secondary_color ?? "#6366f1");
    setApiKey(initialBusiness.branding?.api_key ?? "");
  }, [initialBusiness]);

  const revokePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => revokePreview();
  }, [revokePreview]);

  const slugPreviewUrl = useMemo(() => {
    const base = appBaseUrl();
    const path = `/c/${business.slug}`;
    return base ? `${base}${path}` : path;
  }, [business.slug]);

  const webhookDisplayUrl = useMemo(() => {
    const custom = business.branding?.webhook_url?.trim();
    if (custom) return custom;
    const base = appBaseUrl();
    if (!base) return `/api/webhooks/${business.id}`;
    return `${base}/api/webhooks/${business.id}`;
  }, [business.branding?.webhook_url, business.id]);

  const previewCard = useMemo(
    () => ({
      name: business.name,
      reward_description: "Tu recompensa al completar las compras",
      target_purchases: 10,
      type: "loyalty" as const,
      design: {
        bg_color: primaryColor,
        text_color: contrastText(primaryColor),
        logo_url: logoUrl,
        hero_url: null,
        program_name: business.name || "Tu programa",
      },
    }),
    [business.name, primaryColor, logoUrl]
  );

  function onLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    revokePreview();
    setLogoFile(null);
    setLogoPreview(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elige un archivo de imagen.");
      return;
    }
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setLogoFile(file);
    setLogoPreview(url);
  }

  async function handleUploadLogo() {
    if (!logoFile) {
      toast.error("Selecciona una imagen primero.");
      return;
    }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", logoFile);
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as {
        logo_url?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo subir el logo");
        return;
      }
      if (data.logo_url) {
        setLogoUrl(data.logo_url);
        setBusiness((prev) => ({
          ...prev,
          logo_url: data.logo_url!,
        }));
      }
      revokePreview();
      setLogoFile(null);
      setLogoPreview(null);
      toast.success("Logo actualizado");
      router.refresh();
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleSavePerfil(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("El nombre es obligatorio");
      return;
    }
    setPerfilSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        business?: Business;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }
      if (data.business) {
        setBusiness(data.business);
        setName(data.business.name);
      }
      toast.success("Perfil guardado");
      router.refresh();
    } finally {
      setPerfilSaving(false);
    }
  }

  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault();
    setBrandingSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branding: {
            primary_color: primaryColor,
            secondary_color: secondaryColor,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        business?: Business;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "Error al guardar");
        return;
      }
      if (data.business) {
        setBusiness(data.business);
        setPrimaryColor(
          data.business.branding?.primary_color ?? primaryColor
        );
        setSecondaryColor(
          data.business.branding?.secondary_color ?? secondaryColor
        );
        setApiKey(data.business.branding?.api_key ?? apiKey);
      }
      toast.success("Branding guardado");
      router.refresh();
    } finally {
      setBrandingSaving(false);
    }
  }

  async function copyApiKey() {
    if (!apiKey) {
      toast.error("No hay clave para copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(apiKey);
      toast.success("Clave copiada al portapapeles");
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  async function confirmRegenerateApiKey() {
    setRegenerateLoading(true);
    try {
      const res = await fetch("/api/settings/api-key", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        api_key?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(data.error ?? "No se pudo regenerar la clave");
        return;
      }
      if (data.api_key) {
        setApiKey(data.api_key);
        setBusiness((prev) => ({
          ...prev,
          branding: {
            primary_color: prev.branding?.primary_color ?? "#0f172a",
            secondary_color: prev.branding?.secondary_color ?? "#6366f1",
            ...(typeof prev.branding?.webhook_url === "string" &&
            prev.branding.webhook_url
              ? { webhook_url: prev.branding.webhook_url }
              : {}),
            api_key: data.api_key,
          },
        }));
        toast.success("Nueva clave generada. Cópiala y guárdala en un lugar seguro.");
      }
      setRegenerateOpen(false);
      router.refresh();
    } finally {
      setRegenerateLoading(false);
    }
  }

  const displayLogoSrc = logoPreview ?? logoUrl ?? undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Configuración
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Perfil del negocio, colores de marca e integraciones API.
        </p>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-0" aria-label="Secciones de configuración">
          {tabNav.map(({ value, label, icon: Icon }) => {
            const active = activeTab === value;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveTab(value)}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {label}
                {active && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="pt-2">
        {activeTab === "perfil" && (
          <Card>
            <CardHeader>
              <CardTitle>Perfil del negocio</CardTitle>
              <CardDescription>Nombre público, URL amigable y logotipo.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePerfil} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="business-name">Nombre del negocio</Label>
                  <Input
                    id="business-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Mi cafetería"
                    autoComplete="organization"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="business-slug">Slug (solo lectura)</Label>
                  <Input
                    id="business-slug"
                    value={business.slug}
                    readOnly
                    className="bg-muted font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Vista previa de URL:{" "}
                    <span className="font-mono text-foreground/70">{slugPreviewUrl}</span>
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Logo</Label>
                  <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border bg-muted/40 p-6 sm:flex-row sm:items-center">
                    <div
                      className={cn(
                        "flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background",
                        !displayLogoSrc && "text-muted-foreground"
                      )}
                    >
                      {displayLogoSrc ? (
                        <img
                          src={displayLogoSrc}
                          alt="Vista previa del logo"
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <Upload className="size-8" strokeWidth={1.5} aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-3">
                      <Input
                        type="file"
                        accept="image/*"
                        className="cursor-pointer text-sm file:mr-3"
                        onChange={onLogoFileChange}
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!logoFile || logoUploading}
                        onClick={handleUploadLogo}
                        className="gap-2"
                      >
                        <Upload className="size-4" strokeWidth={1.75} aria-hidden />
                        {logoUploading ? "Subiendo…" : "Subir logo"}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button type="submit" disabled={perfilSaving}>
                  {perfilSaving ? "Guardando…" : "Guardar cambios"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {activeTab === "branding" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <Card>
              <CardHeader>
                <CardTitle>Colores de marca</CardTitle>
                <CardDescription>
                  Se aplican como base visual en las tarjetas de lealtad.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveBranding} className="space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Color primario</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="primary-color"
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer p-1"
                        />
                        <Input
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="font-mono text-sm"
                          spellCheck={false}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondary-color">Color secundario</Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="secondary-color"
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="h-10 w-14 cursor-pointer p-1"
                        />
                        <Input
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="font-mono text-sm"
                          spellCheck={false}
                        />
                      </div>
                    </div>
                  </div>
                  <Button type="submit" disabled={brandingSaving}>
                    {brandingSaving ? "Guardando…" : "Guardar branding"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Live preview */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Vista previa</p>
              <div
                className="rounded-2xl p-[3px] shadow-md"
                style={{ background: `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})` }}
              >
                <div className="overflow-hidden rounded-[13px] bg-white">
                  <CardPreview
                    card={previewCard}
                    businessLogoUrl={logoUrl}
                    className="shadow-none ring-0"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                El color primario es el fondo; el secundario enmarca el diseño.
              </p>
            </div>
          </div>
        )}

        {activeTab === "api" && (
          <Card>
            <CardHeader>
              <CardTitle>API y webhooks</CardTitle>
              <CardDescription>
                Clave para integraciones server-to-server y URL de webhook.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Input
                    readOnly
                    value={maskApiKey(apiKey)}
                    className="bg-muted font-mono text-sm"
                  />
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={copyApiKey}
                      disabled={!apiKey}
                    >
                      <Copy className="size-4" strokeWidth={1.75} aria-hidden />
                      Copiar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="gap-2"
                      onClick={() => setRegenerateOpen(true)}
                    >
                      <RefreshCw className="size-4" strokeWidth={1.75} aria-hidden />
                      Regenerar
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input
                  readOnly
                  value={webhookDisplayUrl}
                  className="bg-muted font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Configura esta URL en tus integraciones para recibir eventos.
                </p>
              </div>

              <Separator />

              <div>
                <Label className="mb-2 block">Documentación</Label>
                <a
                  href="#"
                  className="text-sm text-primary underline underline-offset-4 hover:no-underline"
                  onClick={(e) => e.preventDefault()}
                >
                  Documentación de la API (próximamente)
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "apariencia" && (
          <Card>
            <CardHeader>
              <CardTitle>Apariencia</CardTitle>
              <CardDescription>
                Elige cómo se ve el dashboard. Tu preferencia se guarda en este dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    { value: "light", label: "Claro", icon: Sun },
                    { value: "dark", label: "Oscuro", icon: Moon },
                    { value: "system", label: "Sistema", icon: Monitor },
                  ] as const
                ).map(({ value, label, icon: Icon }) => {
                  const active = theme === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setTheme(value)}
                      className={cn(
                        "relative flex flex-col items-center gap-3 rounded-xl border-2 p-5 text-sm font-medium transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        active
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      )}
                    >
                      <Icon className="size-6" strokeWidth={1.75} aria-hidden />
                      {label}
                      {active && (
                        <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="size-3" strokeWidth={2.5} aria-hidden />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={regenerateOpen} onOpenChange={setRegenerateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Regenerar API Key?</DialogTitle>
            <DialogDescription>
              La clave actual dejará de funcionar de inmediato. Deberás actualizar
              todos los servicios que la usen.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRegenerateOpen(false)}
              disabled={regenerateLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={regenerateLoading}
              onClick={confirmRegenerateApiKey}
            >
              {regenerateLoading ? "Regenerando…" : "Regenerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
