import { NextResponse } from "next/server";

import { manageApiError, requireInternalOperator } from "@/lib/manage/auth";
import {
  AVATAR_EXTENSIONS,
  matchesImageSignature,
  MAX_AVATAR_BYTES,
} from "@/lib/manage/avatar";

export async function POST(request: Request) {
  try {
    const { db, userId } = await requireInternalOperator();
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File))
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    const extension = AVATAR_EXTENSIONS.get(file.type);
    if (!extension)
      return NextResponse.json(
        { error: "Use a JPG, PNG, or WebP image." },
        { status: 400 },
      );
    if (!file.size || file.size > MAX_AVATAR_BYTES)
      return NextResponse.json(
        { error: "Profile photos must be smaller than 5 MB." },
        { status: 400 },
      );

    const buffer = await file.arrayBuffer();
    if (!matchesImageSignature(new Uint8Array(buffer.slice(0, 12)), file.type))
      return NextResponse.json(
        { error: "That file does not contain a valid image." },
        { status: 400 },
      );

    const path = `${userId}/profile.${extension}`;
    const { data: currentProfile, error: profileReadError } = await db
      .from("profiles")
      .select("avatar_path")
      .eq("id", userId)
      .single();
    if (profileReadError) throw profileReadError;

    const { error: uploadError } = await db.storage
      .from("costivra-avatars")
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { error: updateError } = await db
      .from("profiles")
      .update({ avatar_path: path, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (updateError) throw updateError;

    const previousPath =
      typeof currentProfile.avatar_path === "string" ? currentProfile.avatar_path : null;
    if (previousPath && previousPath !== path)
      await db.storage.from("costivra-avatars").remove([previousPath]);

    await db.from("internal_audit_events").insert({
      actor_id: userId,
      action: "profile.avatar_updated",
      resource_type: "profile",
      resource_id: userId,
      safe_metadata: { content_type: file.type, size_bytes: file.size },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const result = manageApiError(error);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
}
