import { Sale, Shop } from '@/types';
import { formatINR, numberToIndianWords } from './calculations';
import { db } from './db';

export function generateThermalReceiptHtml(sale: Sale, shop: Shop, isDuplicate = false): string {
  const itemsHtml = sale.items
    .map(
      (item, idx) => `
      <tr>
        <td style="padding: 3px 0; vertical-align: top;">
          ${idx + 1}. ${item.product.name}
          ${item.product.tamilName ? `<div style="font-size: 10px; color: #555;">${item.product.tamilName}</div>` : ''}
          <div style="font-size: 10px; color: #666;">
            ${item.quantity} x ₹${item.unitPrice.toFixed(2)} ${item.discountPercentage > 0 ? `(-${item.discountPercentage}%)` : ''}
          </div>
        </td>
        <td style="text-align: right; padding: 3px 0; vertical-align: bottom; font-weight: 600;">
          ₹${item.totalAmount.toFixed(2)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Receipt - ${sale.invoiceNumber}</title>
      <style>
        @page {
          margin: 0;
          size: 80mm auto;
        }
        body {
          font-family: 'Courier New', Courier, monospace, sans-serif;
          font-size: 12px;
          line-height: 1.25;
          margin: 0;
          padding: 8px;
          color: #000;
          background: #fff;
          width: 76mm;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .divider {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }
        .double-divider {
          border-top: 2px dashed #000;
          margin: 6px 0;
        }
        table { width: 100%; border-collapse: collapse; }
        .badge {
          display: inline-block;
          border: 1px solid #000;
          padding: 1px 4px;
          font-size: 10px;
          margin-top: 2px;
        }
      </style>
    </head>
    <body>
      <div class="text-center">
        ${isDuplicate ? '<div class="badge font-bold">*** DUPLICATE RECEIPT ***</div><br/>' : ''}
        <div style="font-size: 15px; font-weight: 800; text-transform: uppercase;">${shop.name}</div>
        <div style="font-size: 11px;">${shop.addressLine1}, ${shop.city}</div>
        <div style="font-size: 11px;">Phone: ${shop.phone}</div>
        ${shop.gstin ? `<div style="font-size: 11px; font-weight: bold;">GSTIN: ${shop.gstin}</div>` : ''}
        <div style="font-size: 10px;">PESO Lic: ${shop.licenseNumber}</div>
        <div class="badge">GREEN CRACKERS CERTIFIED (CSIR-NEERI)</div>
      </div>

      <div class="divider"></div>

      <table style="font-size: 11px;">
        <tr>
          <td><strong>Bill No:</strong> ${sale.invoiceNumber}</td>
          <td class="text-right"><strong>Date:</strong> ${new Date(sale.createdAt).toLocaleDateString('en-IN')}</td>
        </tr>
        <tr>
          <td><strong>Cashier:</strong> ${sale.cashierName || 'POS Counter 1'}</td>
          <td class="text-right"><strong>Time:</strong> ${new Date(sale.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
        </tr>
        ${
          sale.customerName
            ? `
        <tr>
          <td colspan="2"><strong>Customer:</strong> ${sale.customerName} (${sale.customerPhone || ''})</td>
        </tr>`
            : ''
        }
      </table>

      <div class="divider"></div>

      <table>
        <thead>
          <tr style="border-bottom: 1px dashed #000; font-size: 11px;">
            <th style="text-align: left; padding-bottom: 3px;">Item</th>
            <th style="text-align: right; padding-bottom: 3px;">Amt (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="divider"></div>

      <table style="font-size: 12px;">
        <tr>
          <td>Sub Total:</td>
          <td class="text-right">₹${sale.subtotal.toFixed(2)}</td>
        </tr>
        ${
          sale.discountAmount > 0
            ? `
        <tr>
          <td>Festival Discount:</td>
          <td class="text-right">-₹${sale.discountAmount.toFixed(2)}</td>
        </tr>`
            : ''
        }
        ${
          sale.billingMode === 'GST'
            ? `
        <tr>
          <td>Taxable Value:</td>
          <td class="text-right">₹${sale.taxableValue.toFixed(2)}</td>
        </tr>
        <tr>
          <td>CGST (9%):</td>
          <td class="text-right">₹${sale.cgstAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td>SGST (9%):</td>
          <td class="text-right">₹${sale.sgstAmount.toFixed(2)}</td>
        </tr>`
            : ''
        }
        ${
          sale.roundOff !== 0
            ? `
        <tr>
          <td>Round Off:</td>
          <td class="text-right">₹${sale.roundOff.toFixed(2)}</td>
        </tr>`
            : ''
        }
      </table>

      <div class="double-divider"></div>

      <table style="font-size: 14px; font-weight: bold;">
        <tr>
          <td>NET AMOUNT:</td>
          <td class="text-right">₹${sale.grandTotal.toFixed(2)}</td>
        </tr>
      </table>

      <div class="divider"></div>

      <table style="font-size: 11px;">
        <tr>
          <td>Paid (${sale.paymentMethod}):</td>
          <td class="text-right">₹${sale.paidAmount.toFixed(2)}</td>
        </tr>
        ${
          sale.balanceAmount > 0
            ? `
        <tr>
          <td style="color: red; font-weight: bold;">Balance Due:</td>
          <td class="text-right" style="color: red; font-weight: bold;">₹${sale.balanceAmount.toFixed(2)}</td>
        </tr>`
            : `
        <tr>
          <td>Change Returned:</td>
          <td class="text-right">₹${Math.max(0, sale.paidAmount - sale.grandTotal).toFixed(2)}</td>
        </tr>`
        }
      </table>

      <div class="divider"></div>

      <div class="text-center" style="font-size: 10px; margin-top: 5px;">
        <div>Total Items: ${sale.items.length} | Qty: ${sale.items.reduce((s, i) => s + i.quantity, 0)}</div>
        <div style="margin-top: 4px; font-weight: bold;">🎉 HAPPY & SAFE DIWALI! 🎉</div>
        <div style="margin-top: 4px;">Burst crackers safely in open areas. Keep water bucket handy.</div>
        <div style="margin-top: 6px; font-size: 9px; color: #555;">Software by Sivakasi Crackers POS</div>
      </div>
    </body>
    </html>
  `;
}

export function generateA4InvoiceHtml(sale: Sale, shop: Shop): string {
  const dateObj = new Date(sale.createdAt || Date.now());
  const formattedDate = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`;

  // Calculate gross MRP net total & discount
  let grossTotal = 0;
  sale.items.forEach((item) => {
    const rate = item.mrp > 0 ? item.mrp : item.unitPrice;
    grossTotal += rate * item.quantity;
  });

  if (grossTotal === 0) {
    grossTotal = sale.subtotal;
  }

  // Calculate discount percentage
  let discountPct = 80;
  if (grossTotal > 0 && sale.discountAmount > 0) {
    discountPct = Math.round((sale.discountAmount / grossTotal) * 100);
  } else if (sale.items.length > 0 && sale.items[0].discountPercentage > 0) {
    discountPct = Math.round(sale.items[0].discountPercentage);
  }

  const discountedTotal = Math.max(0, grossTotal - sale.discountAmount);

  // Dynamically resolve customer information from database or sale attributes
  const cust = sale.customerId ? db.getCustomerById(sale.customerId) : null;
  const customerName = cust?.name || sale.customerName || 'Walk-in Retail Customer';
  const customerPhone = cust?.phone || sale.customerPhone || '';
  const customerEmail = cust?.email || sale.customerEmail || '';
  const customerAddress = cust?.addressLine || sale.customerAddress || '';
  const city = cust?.city || sale.customerCity || '';
  const state = cust?.state || sale.customerState || '';
  const customerCityState = [city, state].filter(Boolean).join(', ');
  const customerGstin = cust?.gstin || sale.customerGstin || '';

  const rowsHtml = sale.items
    .map((item, idx) => {
      const rate = item.mrp > 0 ? item.mrp : item.unitPrice;
      const amount = rate * item.quantity;
      const content = item.product.packSize || `${item.product.uom || 'BOX'}`;

      return `
      <tr style="height: 24px;">
        <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 11px;">${idx + 1}</td>
        <td style="text-align: left; border: 1px solid #000; padding: 4px 8px; font-size: 11px; font-weight: 500;">
          ${item.product.name}
          ${item.product.tamilName ? `<span style="font-size: 10px; color: #444; margin-left: 4px;">(${item.product.tamilName})</span>` : ''}
        </td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 11px;">${content}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 11px;">${item.quantity}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 11px;">${rate.toFixed(0)}</td>
        <td style="text-align: center; border: 1px solid #000; padding: 4px 6px; font-size: 11px;">${amount.toFixed(0)}</td>
      </tr>
    `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Estimation - ${sale.invoiceNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
          margin: 0;
          padding: 0;
          background: #fff;
          font-size: 11px;
        }
        .invoice-box {
          border: 1.5px solid #000;
          width: 100%;
          max-width: 190mm;
          margin: 0 auto;
          background: #fff;
          position: relative;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .header-bar {
          background-color: #00b4a7 !important;
          color: #ffffff !important;
          padding: 8px 12px;
          border-bottom: 1.5px solid #000;
        }
        .watermark {
          position: absolute;
          top: 38%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.08;
          pointer-events: none;
          z-index: 0;
          width: 320px;
          height: 320px;
        }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <!-- Circular Watermark Emblem -->
        <svg class="watermark" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="90" stroke="#00b4a7" stroke-width="8"/>
          <circle cx="100" cy="100" r="75" stroke="#f59e0b" stroke-width="4"/>
          <text x="100" y="95" text-anchor="middle" font-size="34" font-weight="900" fill="#00b4a7" font-family="Arial">SKT</text>
          <text x="100" y="125" text-anchor="middle" font-size="14" font-weight="bold" fill="#f59e0b" font-family="Arial">SIVAKASI</text>
        </svg>

        <!-- Top Header Banner -->
        <div class="header-bar">
          <table style="width: 100%;">
            <tr>
              <td style="width: 30%; text-align: left; font-size: 12px; font-weight: 500; color: #fff;">
                Enquiry No. : ${sale.invoiceNumber}
              </td>
              <td style="width: 40%; text-align: center; font-size: 20px; font-weight: bold; letter-spacing: 0.5px; color: #fff;">
                Estimation
              </td>
              <td style="width: 30%; text-align: right; font-size: 12px; font-weight: 500; color: #fff;">
                Date : ${formattedDate}
              </td>
            </tr>
          </table>
        </div>

        <!-- Company & Customer Details -->
        <table style="border-bottom: 1.5px solid #000;">
          <tr>
            <!-- Left: Company Details -->
            <td style="width: 50%; vertical-align: top; padding: 10px 14px; border-right: 1.5px solid #000;">
              <div style="font-size: 18px; font-weight: bold; color: #000; line-height: 1.2;">
                ${shop.name}
              </div>
              <div style="font-size: 13px; color: #000; margin-top: 2px;">
                ${shop.city}
              </div>
              <div style="font-size: 12px; color: #000; margin-top: 4px;">
                Phone : ${shop.phone}
              </div>
              ${
                shop.gstin
                  ? `<div style="font-size: 11px; color: #222; margin-top: 2px;">GSTIN : ${shop.gstin}</div>`
                  : ''
              }
              ${
                shop.licenseNumber
                  ? `<div style="font-size: 10px; color: #444; margin-top: 2px;">PESO Lic No : ${shop.licenseNumber}</div>`
                  : ''
              }
            </td>

            <!-- Right: Customer Details -->
            <td style="width: 50%; vertical-align: top; padding: 10px 14px;">
              <div style="font-size: 13px; font-weight: bold; color: #000;">
                ${customerName}
              </div>
              ${
                customerAddress
                  ? `<div style="font-size: 12px; color: #000; margin-top: 2px; line-height: 1.35;">${customerAddress}</div>`
                  : ''
              }
              ${
                customerCityState
                  ? `<div style="font-size: 12px; color: #000;">${customerCityState}</div>`
                  : ''
              }
              ${
                customerEmail
                  ? `<div style="font-size: 12px; color: #000; margin-top: 2px;">Email : ${customerEmail}</div>`
                  : ''
              }
              ${
                customerPhone
                  ? `<div style="font-size: 12px; color: #000; margin-top: 2px;">Phone : ${customerPhone}</div>`
                  : ''
              }
              ${
                customerGstin
                  ? `<div style="font-size: 11px; color: #000; margin-top: 2px;">GSTIN : ${customerGstin}</div>`
                  : ''
              }
            </td>
          </tr>
        </table>

        <!-- Products Table -->
        <table style="border-bottom: 1.5px solid #000; position: relative; z-index: 1;">
          <thead>
            <tr style="background-color: #00b4a7 !important; color: #ffffff !important; font-size: 12px; font-weight: bold;">
              <th style="padding: 6px 4px; text-align: center; width: 8%; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #fff;">
                S No
              </th>
              <th style="padding: 6px 8px; text-align: center; width: 44%; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #fff;">
                Product Name
              </th>
              <th style="padding: 6px 4px; text-align: center; width: 14%; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #fff;">
                Content
              </th>
              <th style="padding: 6px 4px; text-align: center; width: 10%; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #fff;">
                Qty
              </th>
              <th style="padding: 6px 4px; text-align: center; width: 12%; border-right: 1px solid #000; border-bottom: 1px solid #000; color: #fff;">
                Rate
              </th>
              <th style="padding: 6px 4px; text-align: center; width: 12%; border-bottom: 1px solid #000; color: #fff;">
                Amount
              </th>
            </tr>
            <!-- Discount Banner Sub-header -->
            <tr style="background: #ffffff; border-bottom: 1px solid #000;">
              <td colspan="6" style="text-align: center; font-size: 11px; font-weight: bold; padding: 3px 0; border: 1px solid #000;">
                Discount(${discountPct}%)
              </td>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Bottom Section: Payments Details (Left) & Totals (Right) -->
        <table style="width: 100%;">
          <tr>
            <!-- Left: Payments Details -->
            <td style="width: 50%; vertical-align: top; padding: 10px 14px; border-right: 1.5px solid #000;">
              <div style="font-size: 15px; font-weight: bold; color: #000; margin-bottom: 4px;">
                Payments Details
              </div>
              <div style="font-size: 12px; line-height: 1.6; color: #000;">
                <div>Bank name : ${shop.bankName || 'State Bank of India'}</div>
                <div>Acc Holder Name : ${shop.name}</div>
                <div>Account No : ${shop.bankAccountNo || '30492817492'}</div>
                <div>IFSC Code: ${shop.bankIfsc || 'SBIN0000921'}</div>
                <div>UPI ID : ${shop.upiId || '9843749750'}</div>
              </div>
            </td>

            <!-- Right: Totals Breakdown Table -->
            <td style="width: 50%; vertical-align: top; padding: 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                <tr>
                  <td style="padding: 5px 10px; border-bottom: 1px solid #000; border-left: none; text-align: right; width: 60%; color: #000;">
                    Net Total:
                  </td>
                  <td style="padding: 5px 10px; border-bottom: 1px solid #000; text-align: right; width: 40%; font-weight: 500; color: #000;">
                    ${grossTotal.toFixed(0)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 5px 10px; border-bottom: 1px solid #000; text-align: right; color: #000;">
                    Discount With Total:
                  </td>
                  <td style="padding: 5px 10px; border-bottom: 1px solid #000; text-align: right; font-weight: 500; color: #000;">
                    ${discountedTotal > 0 ? discountedTotal.toFixed(2) : sale.grandTotal.toFixed(2)}
                  </td>
                </tr>
                ${
                  sale.billingMode === 'GST' && sale.totalTax > 0
                    ? `
                <tr>
                  <td style="padding: 4px 10px; border-bottom: 1px solid #000; text-align: right; font-size: 11px; color: #333;">
                    GST (18% Included):
                  </td>
                  <td style="padding: 4px 10px; border-bottom: 1px solid #000; text-align: right; font-size: 11px; color: #333;">
                    ${sale.totalTax.toFixed(2)}
                  </td>
                </tr>`
                    : ''
                }
                <tr>
                  <td style="padding: 5px 10px; border-bottom: 1px solid #000; text-align: right; color: #000;">
                    Package Charge:
                  </td>
                  <td style="padding: 5px 10px; border-bottom: 1px solid #000; text-align: right; font-weight: 500; color: #000;">
                    
                  </td>
                </tr>
                <tr>
                  <td style="padding: 6px 10px; text-align: right; font-weight: bold; font-size: 13px; color: #000;">
                    Total:
                  </td>
                  <td style="padding: 6px 10px; text-align: right; font-weight: bold; font-size: 13px; color: #000;">
                    ${sale.grandTotal.toFixed(2)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </div>

      <!-- Footer Page Number -->
      <div style="text-align: center; font-size: 11px; color: #333; margin-top: 8px;">
        Page 1 of 1
      </div>
    </body>
    </html>
  `;
}

export function printHtmlViaIframe(htmlContent: string): void {
  if (typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(htmlContent);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 300);
}
