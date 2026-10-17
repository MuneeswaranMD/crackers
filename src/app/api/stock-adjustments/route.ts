import { NextRequest, NextResponse } from 'next/server';
import { getStockMovementsFromSupabase, recordStockAdjustmentInSupabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const movements = await getStockMovementsFromSupabase(100);
    return NextResponse.json({ success: true, data: movements });
  } catch (err: any) {
    console.error('Error in /api/stock-adjustments GET:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, sku, productName, adjustedQty, reason } = body;

    if (adjustedQty === undefined || adjustedQty === null || isNaN(Number(adjustedQty)) || Number(adjustedQty) < 0) {
      return NextResponse.json(
        { success: false, error: 'A valid non-negative adjusted quantity is required' },
        { status: 400 }
      );
    }

    if (!productId && !sku && !productName) {
      return NextResponse.json(
        { success: false, error: 'Product identification (ID, SKU, or Name) is required' },
        { status: 400 }
      );
    }

    const result = await recordStockAdjustmentInSupabase({
      productId,
      sku,
      productName,
      adjustedQty: Number(adjustedQty),
      reason: reason || 'Manual physical stock audit',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in /api/stock-adjustments POST:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
