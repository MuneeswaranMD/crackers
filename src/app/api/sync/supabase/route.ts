import { NextRequest, NextResponse } from 'next/server';
import { saveSaleToSupabase, saveExternalOrderToSupabase } from '@/lib/serverDb';
import { Sale, ExternalOrder } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sales: Sale[] = body.sales || [];
    const orders: ExternalOrder[] = body.orders || [];

    let syncedSales = 0;
    let failedSales = 0;
    let syncedOrders = 0;
    let failedOrders = 0;

    for (const sale of sales) {
      const res = await saveSaleToSupabase(sale);
      if (res.success) {
        syncedSales++;
      } else {
        failedSales++;
        console.error(`Failed to sync sale ${sale.invoiceNumber}:`, res.error);
      }
    }

    for (const order of orders) {
      const res = await saveExternalOrderToSupabase(order);
      if (res.success) {
        syncedOrders++;
      } else {
        failedOrders++;
        console.error(`Failed to sync order ${order.orderNumber}:`, res.error);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${syncedSales} sales and ${syncedOrders} orders directly to Supabase PostgreSQL!`,
      stats: {
        syncedSales,
        failedSales,
        syncedOrders,
        failedOrders,
      },
    });
  } catch (err: any) {
    console.error('Supabase Bulk Sync Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Bulk sync to Supabase failed' },
      { status: 500 }
    );
  }
}
