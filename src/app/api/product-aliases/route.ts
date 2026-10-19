import { NextRequest, NextResponse } from 'next/server';
import {
  getProductAliasesFromSupabase,
  saveProductAliasToSupabase,
  deleteProductAliasFromSupabase,
} from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const aliases = await getProductAliasesFromSupabase();
    return NextResponse.json({ success: true, data: aliases });
  } catch (err: any) {
    console.error('Error in /api/product-aliases GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.productId || !body.alias) {
      return NextResponse.json(
        { success: false, error: 'Product ID and Alias are required' },
        { status: 400 }
      );
    }
    const res = await saveProductAliasToSupabase(body);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Error in /api/product-aliases POST:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Alias ID is required' }, { status: 400 });
    }
    const res = await deleteProductAliasFromSupabase(id);
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('Error in /api/product-aliases DELETE:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
