import { NextRequest, NextResponse } from 'next/server';
import { getExternalOrdersFromSupabase, saveExternalOrderToSupabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const orders = await getExternalOrdersFromSupabase();
    return NextResponse.json({ success: true, data: orders });
  } catch (err: any) {
    console.error('Error in /api/orders GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await saveExternalOrderToSupabase(body);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Error in /api/orders POST:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { clearAllExternalOrdersFromSupabase } = await import('@/lib/serverDb');
    const result = await clearAllExternalOrdersFromSupabase();
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
    return NextResponse.json({ success: true, message: 'All external orders cleared from Supabase' });
  } catch (err: any) {
    console.error('Error in /api/orders DELETE:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
