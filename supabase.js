// ╔══════════════════════════════════════════════════════╗
// ║         Nippur — Supabase Core Module                ║
// ║         Project: apnyphaeydpmjonlavna                ║
// ╚══════════════════════════════════════════════════════╝
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://apnyphaeydpmjonlavna.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwbnlwaGFleWRwbWpvbmxhdm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2MzU0ODksImV4cCI6MjA5MzIxMTQ4OX0.wTuKhLZbA-YejNKgvi85UnU8Au3xDRz0tSe95Vi3LTI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('%c Supabase initialized — project: apnyphaeydpmjonlavna', 'color:#D4AF37;font-weight:700');
