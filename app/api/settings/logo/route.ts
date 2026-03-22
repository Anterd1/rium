import { randomUUID } from "crypto";

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

const LOGO_BUCKET = "logos";

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { data: userData, error: profileError } = await supabase
    .from("users")
    .select("business_id")
    .eq("id", user.id)
    .single();

  if (profileError || !userData?.business_id) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const businessId = userData.business_id;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "FormData inválido" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { error: "Archivo requerido (campo «file»)" },
      { status: 400 }
    );
  }

  const maxBytes = 2 * 1024 * 1024;
  if (file.size > maxBytes) {
    return NextResponse.json(
      { error: "El archivo no debe superar 2 MB" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext =
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "png";
  const safeExt = ext.length > 5 ? "png" : ext;
  const path = `${businessId}/${randomUUID()}.${safeExt}`;
  const contentType = file.type || "image/png";

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let uploadError: { message: string } | null = null;

  if (serviceKey && url) {
    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await admin.storage
      .from(LOGO_BUCKET)
      .upload(path, buffer, { contentType, upsert: true });
    uploadError = error;
    if (!error) {
      const { data: pub } = admin.storage.from(LOGO_BUCKET).getPublicUrl(path);
      const logoUrl = pub.publicUrl;

      const { error: dbErr } = await supabase
        .from("businesses")
        .update({ logo_url: logoUrl })
        .eq("id", businessId);

      if (dbErr) {
        return NextResponse.json({ error: dbErr.message }, { status: 500 });
      }

      return NextResponse.json({ logo_url: logoUrl });
    }
  }

  const { error: userUploadErr } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });

  if (userUploadErr) {
    return NextResponse.json(
      {
        error:
          uploadError?.message ||
          userUploadErr.message ||
          "No se pudo subir el logo. Crea el bucket «logos» en Supabase Storage y/o configura SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 422 }
    );
  }

  const { data: pub } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const logoUrl = pub.publicUrl;

  const { error: dbErr } = await supabase
    .from("businesses")
    .update({ logo_url: logoUrl })
    .eq("id", businessId);

  if (dbErr) {
    return NextResponse.json({ error: dbErr.message }, { status: 500 });
  }

  return NextResponse.json({ logo_url: logoUrl });
}
