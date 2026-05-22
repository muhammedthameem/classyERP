import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    "https://mwrhlwlimxihhwlafnob.supabase.co",
    "sb_publishable_-_ib7F-bIZPznzpZe3hIrw_TlTelawl"
)

async function testInsert() {
  const { data, error } = await supabase
    .from('erp_accounts')
    .insert([{
      type: 'Income',
      date: '2026-05-23',
      category: 'Sales',
      amount: 1500,
      payment_mode: 'Cash',
      reference: 'Test Sale',
      notes: 'Test Notes'
    }])
  
  if (error) {
    console.error("Supabase Error:", error)
  } else {
    console.log("Success:", data)
  }
}

testInsert()
