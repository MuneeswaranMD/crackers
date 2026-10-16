import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWooCommerceWebhookSignature,
  normalizeWooCommerceOrder,
} from '@/lib/woocommerce';
import { db } from '@/lib/db';
import { WebhookEvent, ExternalOrder } from '@/types';
import { saveExternalOrderToSupabase } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';

/**
 * WooCommerce Webhook Inbound Handler
 * Handles:
 *  - order.created
 *  - order.updated
 *  - order.deleted
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const signature = req.headers.get('x-wc-webhook-signature');
    const topic = req.headers.get('x-wc-webhook-topic') || 'unknown';
    const deliveryId =
      req.headers.get('x-wc-webhook-delivery-id') ||
      req.headers.get('x-wc-webhook-id') ||
      `deliv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const source = req.headers.get('x-wc-webhook-source') || '';

    // 1. Read raw body as text for precise cryptographic verification
    const rawBody = await req.text();

    if (!rawBody) {
      return NextResponse.json({ error: 'Empty webhook payload' }, { status: 400 });
    }

    // 2. Fetch integration configuration
    const integration = db.getIntegration();
    const webhookSecret =
      process.env.WOOCOMMERCE_WEBHOOK_SECRET ||
      integration.webhookSecret ||
      '';

    // 3. Verify HMAC signature if secret is configured
    if (webhookSecret) {
      const isValid = verifyWooCommerceWebhookSignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn(`[WooCommerce Webhook] Invalid signature rejected for delivery ${deliveryId}`);
        return NextResponse.json(
          { error: 'Invalid HMAC signature in X-WC-Webhook-Signature' },
          { status: 401 }
        );
      }
    }

    // 4. Parse JSON payload
    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Malformed JSON payload' }, { status: 400 });
    }

    // 5. Deduplication check
    const existingEvents = db.getWebhookEvents();
    const isDuplicate = existingEvents.some((e) => e.deliveryId === deliveryId);
    if (isDuplicate) {
      console.log(`[WooCommerce Webhook] Duplicate delivery ${deliveryId} ignored`);
      return NextResponse.json({ message: 'Delivery already processed (deduplicated)' }, { status: 200 });
    }

    // 6. Record event in webhook audit log
    const eventRecord: WebhookEvent = {
      id: `wh-${deliveryId}`,
      integrationId: integration.id,
      deliveryId,
      topic,
      payload,
      signature: signature || undefined,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    // 7. Process Order Events
    if (topic === 'order.created' || topic === 'order.updated') {
      const localProducts = db.getProducts();
      const mappings = db.getProductMappings();
      const shop = db.getShop();

      const { order, items } = normalizeWooCommerceOrder(
        payload,
        integration.id,
        shop.id,
        localProducts,
        mappings
      );

      // Check if existing order exists to preserve local invoice linkage
      const existing = db.getExternalOrderById(order.externalOrderId);
      if (existing) {
        order.localInvoiceId = existing.localInvoiceId;
        if (existing.syncStatus === 'INVOICED') {
          order.syncStatus = 'INVOICED';
        }
      }

      // If status became cancelled or refunded, update status without deleting invoice
      if (['cancelled', 'refunded', 'failed'].includes(order.status)) {
        order.status = payload.status;
      }

      db.saveExternalOrder(order);

      // Update event status
      eventRecord.status = 'PROCESSED';
      eventRecord.processedAt = new Date().toISOString();
      db.saveWebhookEvent(eventRecord);

      // Also persist to Supabase PostgreSQL database
      try {
        await saveExternalOrderToSupabase(order);
      } catch (dbErr) {
        console.warn('[WooCommerce Webhook] Supabase sync warning:', dbErr);
      }

      return NextResponse.json({
        success: true,
        orderId: order.externalOrderId,
        orderNumber: order.orderNumber,
        status: order.status,
        syncStatus: order.syncStatus,
        durationMs: Date.now() - startTime,
      });
    }

    if (topic === 'order.deleted') {
      const extOrderId = String(payload.id);
      db.updateExternalOrderStatus(extOrderId, 'cancelled');
      eventRecord.status = 'PROCESSED';
      eventRecord.processedAt = new Date().toISOString();
      db.saveWebhookEvent(eventRecord);

      return NextResponse.json({
        success: true,
        message: `Order #${extOrderId} marked as cancelled in audit records`,
      });
    }

    // Default acknowledgement for other topics
    eventRecord.status = 'IGNORED';
    db.saveWebhookEvent(eventRecord);
    return NextResponse.json({ message: `Webhook topic ${topic} received and acknowledged` });
  } catch (err: any) {
    console.error('[WooCommerce Webhook] Error:', err);
    return NextResponse.json(
      { error: 'Internal error processing WooCommerce webhook', details: err.message },
      { status: 500 }
    );
  }
}
