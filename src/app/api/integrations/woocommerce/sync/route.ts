import { NextRequest, NextResponse } from 'next/server';
import { WooCommerceClient, normalizeWooCommerceOrder } from '@/lib/woocommerce';
import { db } from '@/lib/db';
import { IntegrationSyncLog } from '@/types';
import { saveExternalOrderToSupabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const integration = db.getIntegration();

  const storeUrl =
    process.env.WOOCOMMERCE_STORE_URL ||
    integration.storeUrl;

  const consumerKey =
    process.env.WOOCOMMERCE_CONSUMER_KEY ||
    integration.consumerKey;

  const consumerSecret =
    process.env.WOOCOMMERCE_CONSUMER_SECRET ||
    integration.consumerSecret;

  if (!storeUrl || !consumerKey || !consumerSecret) {
    const log: IntegrationSyncLog = {
      id: `sync-${Date.now()}`,
      integrationId: integration.id,
      syncType: 'MANUAL',
      status: 'FAILED',
      itemsFetched: 0,
      itemsSynced: 0,
      itemsFailed: 0,
      errorDetails: { message: 'Missing WooCommerce API credentials (Consumer Key / Secret).' },
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
    db.saveSyncLog(log);

    return NextResponse.json(
      {
        success: false,
        message: 'WooCommerce API credentials are not configured. Please supply Consumer Key and Secret in Settings.',
        credentialsRequired: true,
      },
      { status: 400 }
    );
  }

  // Update status to SYNCING
  integration.syncStatus = 'SYNCING';
  db.updateIntegration(integration);

  try {
    const client = new WooCommerceClient({
      storeUrl,
      consumerKey,
      consumerSecret,
    });

    // Calculate incremental cursor with safe 10-minute overlap window
    let modifiedAfter: string | undefined = undefined;
    if (integration.lastSyncCursor) {
      const cursorDate = new Date(new Date(integration.lastSyncCursor).getTime() - 10 * 60 * 1000);
      modifiedAfter = cursorDate.toISOString();
    }

    let page = 1;
    let hasMore = true;
    let totalFetched = 0;
    let totalSynced = 0;
    let totalFailed = 0;

    const localProducts = db.getProducts();
    const mappings = db.getProductMappings();
    const shop = db.getShop();

    while (hasMore && page <= 5) {
      const { data: wcOrders, total, totalPages } = await client.getOrders({
        page,
        perPage: 25,
        modifiedAfter,
        order: 'desc',
        orderBy: 'modified',
      });

      if (!wcOrders || wcOrders.length === 0) {
        break;
      }

      totalFetched += wcOrders.length;

      for (const rawOrder of wcOrders) {
        try {
          const { order } = normalizeWooCommerceOrder(
            rawOrder,
            integration.id,
            shop.id,
            localProducts,
            mappings
          );

          // Preserve local invoice if order was previously invoiced
          const existing = db.getExternalOrderById(order.externalOrderId);
          if (existing && existing.localInvoiceId) {
            order.localInvoiceId = existing.localInvoiceId;
            order.syncStatus = 'INVOICED';
          }

          db.saveExternalOrder(order);
          await saveExternalOrderToSupabase(order);
          totalSynced++;
        } catch (itemErr) {
          console.error(`Failed to normalize order ${rawOrder.id}:`, itemErr);
          totalFailed++;
        }
      }

      page++;
      hasMore = page <= totalPages;
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startTime;

    // Advance cursor safely
    integration.syncStatus = 'SUCCESS';
    integration.lastSyncAt = completedAt;
    integration.lastSyncCursor = completedAt;
    integration.healthStatus = 'HEALTHY';
    integration.lastErrorMessage = undefined;
    db.updateIntegration(integration);

    const syncLog: IntegrationSyncLog = {
      id: `sync-${Date.now()}`,
      integrationId: integration.id,
      syncType: 'MANUAL',
      status: totalFailed > 0 ? 'PARTIAL' : 'SUCCESS',
      itemsFetched: totalFetched,
      itemsSynced: totalSynced,
      itemsFailed: totalFailed,
      startedAt: new Date(startTime).toISOString(),
      completedAt,
      durationMs,
    };
    db.saveSyncLog(syncLog);

    return NextResponse.json({
      success: true,
      message: `Synchronized ${totalSynced} orders from WooCommerce successfully!`,
      fetched: totalFetched,
      synced: totalSynced,
      failed: totalFailed,
      durationMs,
    });
  } catch (err: any) {
    console.error('[WooCommerce Sync] Error:', err);

    integration.syncStatus = 'FAILED';
    integration.healthStatus = 'ERROR';
    integration.lastErrorMessage = err.message;
    db.updateIntegration(integration);

    const syncLog: IntegrationSyncLog = {
      id: `sync-${Date.now()}`,
      integrationId: integration.id,
      syncType: 'MANUAL',
      status: 'FAILED',
      itemsFetched: 0,
      itemsSynced: 0,
      itemsFailed: 0,
      errorDetails: { message: err.message },
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
    db.saveSyncLog(syncLog);

    return NextResponse.json(
      {
        success: false,
        message: `Synchronization failed: ${err.message}`,
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
