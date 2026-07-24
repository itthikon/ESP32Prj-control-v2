import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;
let dynamicUrl: string | null = null;
let dynamicAnonKey: string | null = null;

const DEFAULT_SUPABASE_URL = "https://qarmbcckydnbyrrvgwfs.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_v0QHEFqtEkFNboyGw9mD4w_ptkI8BFd";

export function setDynamicSupabaseConfig(url: string | null, anonKey: string | null) {
  dynamicUrl = url;
  dynamicAnonKey = anonKey;
  supabaseClient = null; // Force re-creation
}

export function getDynamicSupabaseConfig() {
  return {
    url: dynamicUrl || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey: dynamicAnonKey || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY,
  };
}

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  // Read dynamic config first, fallback to environment variables
  const supabaseUrl = dynamicUrl || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = dynamicAnonKey || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey);
      return supabaseClient;
    } catch (err) {
      console.error("Supabase Initialization Error:", err);
      return null;
    }
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = dynamicUrl || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = dynamicAnonKey || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  return !!(supabaseUrl && supabaseKey);
}


