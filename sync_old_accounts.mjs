import { createClient } from '@supabase/supabase-js';

const oldSupabase = createClient(
  'https://mwrhlwlimxihhwlafnob.supabase.co',
  'sb_publishable_-_ib7F-bIZPznzpZe3hIrw_TlTelawl'
);

const newSupabase = createClient(
  'https://voflbggkzldfwmedxcxk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvZmxiZ2dremxkZndtZWR4Y3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTM5NTYsImV4cCI6MjEwNDU4OTk1Nn0.kqsENN7CiASKl6CBtibc0TQiWApmgx5sVu-B17baLlw'
);

async function migrateAccounts() {
  console.log('Fetching accounts from old database...');
  const { data: oldRows, error: fetchErr } = await oldSupabase.from('erp_accounts').select('*');
  if (fetchErr) {
    console.error('Error fetching old accounts:', fetchErr);
    return;
  }

  console.log(`Found ${oldRows?.length || 0} account records from old database.`);
  if (!oldRows || oldRows.length === 0) return;

  console.log('Inserting into new database...');
  let successCount = 0;
  for (const item of oldRows) {
    const payload = {
      type: item.type,
      date: item.date,
      category: item.category,
      amount: item.amount,
      payment_mode: item.payment_mode,
      reference: item.reference,
      notes: item.notes,
      created_at: item.created_at
    };

    const { error: insertErr } = await newSupabase.from('erp_accounts').insert([payload]);
    if (insertErr) {
      console.error(`Failed to insert record for ${item.reference || item.id}:`, insertErr.message);
      if (insertErr.code === 'PGRST204') {
        console.error('\nNOTE: Table columns are not added yet. Please run supabase/fix_accounts.sql in Supabase SQL editor first.');
        break;
      }
    } else {
      successCount++;
    }
  }

  console.log(`Successfully migrated ${successCount} records into new erp_accounts table.`);
}

migrateAccounts();
