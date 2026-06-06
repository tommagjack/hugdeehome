import { createClient } from '@supabase/supabase-js';

let supabase = null;
let currentUrl = null;
let currentKey = null;

export const getSupabaseClient = () => {
  const url = localStorage.getItem('hdh_supabase_url') || import.meta.env.VITE_SUPABASE_URL;
  const key = localStorage.getItem('hdh_supabase_key') || import.meta.env.VITE_SUPABASE_ANON_KEY;

  // If credentials changed, recreate client
  if (url !== currentUrl || key !== currentKey) {
    supabase = null;
    currentUrl = url;
    currentKey = key;
  }

  if (supabase) return supabase;
  
  if (url && key) {
    try {
      supabase = createClient(url, key);
      return supabase;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      return null;
    }
  }
  return null;
};

export const resetSupabaseClient = () => {
  supabase = null;
  currentUrl = null;
  currentKey = null;
};

