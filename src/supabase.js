import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://voflbggkzldfwmedxcxk.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZmxiZ2dremxkZndtZWR4Y3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTM5NTYsImV4cCI6MjEwNDU4OTk1Nn0.kqsENN7CiASKl6CBtibc0TQiWApmgx5sVu-B17baLlw";

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const isSupabase503 = (a) => {
    if (a instanceof Error) {
        const s = a.message || String(a);
        return s.includes('503') || s.includes('Service Unavailable') || s.includes('PGRST');
    }
    const s = String(a);
    return s.includes('503 (Service Unavailable)') || s.includes('GET https://') && s.includes('503');
};
console.error = function (...args) {
    if (args.some(a => isSupabase503(a))) return;
    originalConsoleError.apply(console, args);
};
console.warn = function (...args) {
    if (args.some(a => isSupabase503(a))) return;
    originalConsoleWarn.apply(console, args);
};

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        experimental: {
            passkey: true
        }
    },
    db: {
        schema: "public"
    }
});

export default supabase;