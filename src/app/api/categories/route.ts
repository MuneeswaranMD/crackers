import { NextResponse } from 'next/server';
import { getCategoriesFromSupabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await getCategoriesFromSupabase();
    return NextResponse.json({ success: true, data: categories });
  } catch (err: any) {
    console.error('Error in /api/categories GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
