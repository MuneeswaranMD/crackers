import { NextRequest, NextResponse } from 'next/server';
import { getProductsFromSupabase, saveProductToSupabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const products = await getProductsFromSupabase();
    return NextResponse.json({ success: true, data: products });
  } catch (err: any) {
    console.error('Error in /api/products GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await saveProductToSupabase(body);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Error in /api/products POST:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
