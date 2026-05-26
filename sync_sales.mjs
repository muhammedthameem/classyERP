import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    "https://mwrhlwlimxihhwlafnob.supabase.co",
    "sb_publishable_-_ib7F-bIZPznzpZe3hIrw_TlTelawl"
);

async function syncSales() {
    console.log("Fetching all sales...");
    const { data: sales, error: salesError } = await supabase.from('erp_sales').select('*');
    if (salesError) {
        console.error("Failed to fetch sales:", salesError);
        return;
    }
    
    console.log("Fetching all accounts...");
    const { data: accounts, error: accountsError } = await supabase.from('erp_accounts').select('*');
    if (accountsError) {
        console.error("Failed to fetch accounts:", accountsError);
        return;
    }

    const existingSaleReferences = new Set(
        accounts
            .filter(a => a.type === 'Income' && a.reference && a.reference.startsWith('Sale #'))
            .map(a => a.reference)
    );

    let insertedCount = 0;

    for (const saleRecord of sales) {
        // the 'data' column holds the JSON of the sale
        const sale = saleRecord.data;
        if (!sale) continue;
        
        const saleIdRef = `Sale #${sale.saleId}`;
        
        // Check if this sale is already in accounts
        if (existingSaleReferences.has(saleIdRef)) {
            continue;
        }

        // Only insert if it has a total > 0
        const total = parseFloat(sale.total) || 0;
        if (total > 0) {
            const clientName = sale.client?.name || "Unknown Client";
            const saleDate = sale.timestamp ? sale.timestamp.split('T')[0] : new Date().toISOString().split('T')[0];
            const paymentMode = sale.paymentMode || 'Cash';
            
            console.log(`Inserting missing account record for ${saleIdRef}...`);
            
            const { error: insertError } = await supabase.from('erp_accounts').insert([{
                type: 'Income',
                date: saleDate,
                category: 'Sales',
                amount: total,
                payment_mode: paymentMode,
                reference: saleIdRef,
                notes: `Auto-generated from completed sale for ${clientName}`
            }]);

            if (insertError) {
                console.error(`Failed to insert for ${saleIdRef}:`, insertError);
            } else {
                insertedCount++;
            }
        }
    }

    console.log(`Finished syncing! Inserted ${insertedCount} missing sales into accounts.`);
}

syncSales();
