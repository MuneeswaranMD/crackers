import { NextResponse } from 'next/server';
import { getShopFromSupabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shop = await getShopFromSupabase();
    return NextResponse.json({ success: true, data: shop });
  } catch (err: any) {
    console.error('Error in /api/shop GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
