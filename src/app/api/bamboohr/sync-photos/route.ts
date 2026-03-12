import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_PHOTO_SIZE = 4758;

async function fetchPhoto(bambooId: string): Promise<string | null> {
  const BAMBOO_API_KEY = process.env.BAMBOO_API_KEY!;
  const BAMBOO_SUBDOMAIN = process.env.BAMBOO_SUBDOMAIN!;
  const url = `https://api.bamboohr.com/api/gateway.php/${BAMBOO_SUBDOMAIN}/v1/employees/${bambooId}/photo/small`;
  const creds = Buffer.from(`${BAMBOO_API_KEY}:x`).toString("base64");
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${creds}` },
    });
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const size = buffer.byteLength;
    if (size === 0 || size === DEFAULT_PHOTO_SIZE) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    const b64 = Buffer.from(buffer).toString("base64");
    return `data:${contentType};base64,${b64}`;
  } catch {
    return null;
  }
}

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: employees, error } = await supabase
    .from("employees")
    .select("id, full_name, bamboo_id")
    .not("bamboo_id", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const results = { updated: 0, skipped: 0, errors: 0 };

  for (const emp of employees ?? []) {
    const photoDataUrl = await fetchPhoto(emp.bamboo_id);
    if (photoDataUrl) {
      const { error: upErr } = await supabase
        .from("employees")
        .update({ photo_url: photoDataUrl })
        .eq("id", emp.id);
      if (upErr) {
        results.errors++;
      } else {
        results.updated++;
      }
    } else {
      results.skipped++;
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  return NextResponse.json(results);
}
