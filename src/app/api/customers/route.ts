import { NextRequest, NextResponse } from 'next/server';
import { getCustomersFromSupabase, saveCustomerToSupabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const customers = await getCustomersFromSupabase();
    return NextResponse.json({ success: true, data: customers });
  } catch (err: any) {
    console.error('Error in /api/customers GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await saveCustomerToSupabase(body);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Error in /api/customers POST:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
