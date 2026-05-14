import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    "https://mwrhlwlimxihhwlafnob.supabase.co",
    "sb_publishable_-_ib7F-bIZPznzpZe3hIrw_TlTelawl"
);

export default supabase;