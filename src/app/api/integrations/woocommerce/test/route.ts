import { NextRequest, NextResponse } from 'next/server';
import { WooCommerceClient } from '@/lib/woocommerce';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const storeUrl =
      body.storeUrl ||
      process.env.WOOCOMMERCE_STORE_URL ||
      db.getIntegration().storeUrl;

    const consumerKey =
      body.consumerKey ||
      process.env.WOOCOMMERCE_CONSUMER_KEY ||
      db.getIntegration().consumerKey ||
      '';

    const consumerSecret =
      body.consumerSecret ||
      process.env.WOOCOMMERCE_CONSUMER_SECRET ||
      db.getIntegration().consumerSecret ||
      '';

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return NextResponse.json(
        {
          success: false,
          message: 'Store URL, Consumer Key, and Consumer Secret are required to test connection.',
        },
        { status: 400 }
      );
    }

    const client = new WooCommerceClient({
      storeUrl,
      consumerKey,
      consumerSecret,
    });

    const result = await client.testConnection();

    // Update integration health status in DB
    const integration = db.getIntegration();
    integration.healthStatus = result.success ? 'HEALTHY' : 'ERROR';
    if (!result.success) {
      integration.lastErrorMessage = result.message;
    } else {
      integration.lastErrorMessage = undefined;
    }
    db.updateIntegration(integration);

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        message: err.message || 'Failed to test WooCommerce connection.',
      },
      { status: 500 }
    );
  }
}
