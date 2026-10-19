import { NextRequest, NextResponse } from 'next/server';
import { saveSaleToSupabase, getSalesFromSupabase } from '@/lib/serverDb';
import { Sale } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const sale: Sale = await req.json();

    if (!sale || !sale.invoiceNumber) {
      return NextResponse.json({ success: false, error: 'Invalid sale payload' }, { status: 400 });
    }

    const result = await saveSaleToSupabase(sale);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Sale ${sale.invoiceNumber} saved to Supabase PostgreSQL`,
      dbSaleId: result.dbSaleId,
    });
  } catch (err: any) {
    console.error('API /api/sales POST Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sales = await getSalesFromSupabase();
    return NextResponse.json({ success: true, count: sales.length, data: sales });
  } catch (err: any) {
    console.error('API /api/sales GET Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { clearAllSalesFromSupabase } = await import('@/lib/serverDb');
    const result = await clearAllSalesFromSupabase();
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'All sales data cleared from Supabase' });
  } catch (err: any) {
    console.error('API /api/sales DELETE Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
