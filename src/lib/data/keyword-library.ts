import { createClient } from "@/lib/supabase/client";
import {
  EMPTY_KEYWORD_LIBRARY,
  removeKeywordEntry,
  toggleFavoriteEntry,
  upsertKeywordEntry,
  type KeywordKind,
  type KeywordLibrary,
} from "@/lib/keywords/library";
import {
  getKeywordLibraryLocal,
  saveKeywordLibraryLocal,
} from "@/lib/storage/keyword-library";
import { isSupabaseEnabled } from "@/lib/supabase/config";

const LIBRARY_KEY = "__keyword_library__";

export async function getKeywordLibrary(userId: string): Promise<KeywordLibrary> {
  if (!isSupabaseEnabled()) return getKeywordLibraryLocal();

  const supabase = createClient();
  const { data, error } = await supabase
    .from("review_settings")
    .select("settings")
    .eq("user_id", userId)
    .eq("subject_id", LIBRARY_KEY)
    .maybeSingle();

  if (error) {
    console.error("[getKeywordLibrary]", error);
    return getKeywordLibraryLocal();
  }

  const settings = data?.settings as Partial<KeywordLibrary> | null;
  if (!settings) return getKeywordLibraryLocal();
  const library: KeywordLibrary = {
    problem: Array.isArray(settings.problem) ? settings.problem : [],
    wrong: Array.isArray(settings.wrong) ? settings.wrong : [],
  };
  saveKeywordLibraryLocal(library);
  return library;
}

export async function saveKeywordLibrary(
  userId: string,
  library: KeywordLibrary,
): Promise<boolean> {
  saveKeywordLibraryLocal(library);
  if (!isSupabaseEnabled()) return true;

  const supabase = createClient();
  const { error } = await supabase.from("review_settings").upsert(
    {
      user_id: userId,
      subject_id: LIBRARY_KEY,
      settings: library,
    },
    { onConflict: "user_id,subject_id" },
  );
  return !error;
}

export async function recordKeywordUsage(
  userId: string,
  kind: KeywordKind,
  labels: string[],
): Promise<KeywordLibrary> {
  const library = await getKeywordLibrary(userId);
  let entries = library[kind];
  for (const label of labels) {
    entries = upsertKeywordEntry(entries, label, { bumpUse: true });
  }
  const next = { ...library, [kind]: entries };
  await saveKeywordLibrary(userId, next);
  return next;
}

export async function addKeywordToLibrary(
  userId: string,
  kind: KeywordKind,
  label: string,
  favorite = false,
): Promise<KeywordLibrary> {
  const library = await getKeywordLibrary(userId);
  const next = {
    ...library,
    [kind]: upsertKeywordEntry(library[kind], label, { favorite }),
  };
  await saveKeywordLibrary(userId, next);
  return next;
}

export async function toggleKeywordFavorite(
  userId: string,
  kind: KeywordKind,
  label: string,
): Promise<KeywordLibrary> {
  const library = await getKeywordLibrary(userId);
  const next = {
    ...library,
    [kind]: toggleFavoriteEntry(library[kind], label),
  };
  await saveKeywordLibrary(userId, next);
  return next;
}

export async function deleteKeywordFromLibrary(
  userId: string,
  kind: KeywordKind,
  label: string,
): Promise<KeywordLibrary> {
  const library = await getKeywordLibrary(userId);
  const next = {
    ...library,
    [kind]: removeKeywordEntry(library[kind], label),
  };
  await saveKeywordLibrary(userId, next);
  return next;
}

export function emptyLibrary(): KeywordLibrary {
  return { ...EMPTY_KEYWORD_LIBRARY, problem: [], wrong: [] };
}
