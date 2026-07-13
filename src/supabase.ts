import { createClient } from "@supabase/supabase-js";

let supabaseClient: any = null;
let dynamicUrl: string | null = null;
let dynamicAnonKey: string | null = null;

export function setDynamicSupabaseConfig(url: string | null, anonKey: string | null) {
  dynamicUrl = url;
  dynamicAnonKey = anonKey;
  supabaseClient = null; // Force re-creation
}

export function getDynamicSupabaseConfig() {
  return {
    url: dynamicUrl || process.env.SUPABASE_URL || "https://qarmbcckydnbyrrvgwfs.supabase.co",
    anonKey: dynamicAnonKey || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcm1iY2NreWRuYnlycnZnd2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NTY3MzMsImV4cCI6MjA5OTQzMjczM30.H_l4TtN6gIqAPo9CoDq-sa7Z-CI8oe4hsG0saFwvqoo",
  };
}

export function getSupabase() {
  if (supabaseClient) return supabaseClient;

  // Read dynamic config first, fallback to environment variables
  const supabaseUrl = dynamicUrl || process.env.SUPABASE_URL || "https://qarmbcckydnbyrrvgwfs.supabase.co";
  const supabaseAnonKey = dynamicAnonKey || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcm1iY2NreWRuYnlycnZnd2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NTY3MzMsImV4cCI6MjA5OTQzMjczM30.H_l4TtN6gIqAPo9CoDq-sa7Z-CI8oe4hsG0saFwvqoo";

  if (supabaseUrl && supabaseAnonKey) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
      return supabaseClient;
    } catch (err) {
      console.error("Supabase Initialization Error:", err);
      return null;
    }
  }

  return null;
}

export function isSupabaseConfigured(): boolean {
  const supabaseUrl = dynamicUrl || process.env.SUPABASE_URL || "https://qarmbcckydnbyrrvgwfs.supabase.co";
  const supabaseAnonKey = dynamicAnonKey || process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcm1iY2NreWRuYnlycnZnd2ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NTY3MzMsImV4cCI6MjA5OTQzMjczM30.H_l4TtN6gIqAPo9CoDq-sa7Z-CI8oe4hsG0saFwvqoo";
  return !!(supabaseUrl && supabaseAnonKey);
}

