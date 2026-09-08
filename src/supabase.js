import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mwrhlwlimxihhwlafnob.supabase.co";
const supabaseKey = "sb_publishable_-_ib7F-bIZPznzpZe3hIrw_TlTelawl";

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