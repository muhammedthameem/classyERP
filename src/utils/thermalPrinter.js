import { formatDateDDMMYY, getIndianDate } from './constants';

/**
 * Generates the clean, minimal inner HTML for the thermal tag container
 * Contains ONLY: Order ID, Customer Name, Order Date, Delivery Date, Item Details
 */
export const generateOrderThermalTagInnerHtml = (order, clientObj = null, options = {}) => {
  if (!order) return '';

  const format = options.format || '80mm'; // '80mm' or '58mm'
  const is58 = format === '58mm';
  const baseFontSize = is58 ? '10.5px' : '12px';

  const orderId = order.orderId || order.id || 'N/A';
  const clientName = order.clientName || clientObj?.name || 'Walk-in Customer';
  const clientPhone = clientObj?.mobile || clientObj?.phone || order.clientPhone || '';
  const orderDateStr = order.orderDate ? formatDateDDMMYY(order.orderDate) : formatDateDDMMYY(getIndianDate());
  const deliveryDateStr = order.deliveryDate ? formatDateDDMMYY(order.deliveryDate) : 'NOT SPECIFIED';

  // Calculate urgency & days left
  let urgencyText = 'STANDARD TIMELINE';
  if (order.deliveryDate) {
    const today = new Date(getIndianDate());
    today.setHours(0, 0, 0, 0);
    const target = new Date(order.deliveryDate);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target - today) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      urgencyText = `⚠️ OVERDUE BY ${Math.abs(diffDays)} DAYS ⚠️`;
    } else if (diffDays === 0) {
      urgencyText = '⚡ DUE TODAY - CRITICAL ⚡';
    } else if (diffDays === 1) {
      urgencyText = '⚡ DUE TOMORROW - EXPEDITE ⚡';
    } else if (diffDays <= 3) {
      urgencyText = `⚡ DUE IN ${diffDays} DAYS (PRIORITY) ⚡`;
    } else {
      urgencyText = `TARGET: ${diffDays} DAYS REMAINING`;
    }
  }

  return `
    <div class="tag-container" style="width: 100% !important; max-width: 100% !important; margin: 0 !important; padding: 4px 6px 14px 6px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, monospace; font-size: ${baseFontSize}; line-height: 1.3; background: #fff !important; color: #000 !important; box-sizing: border-box !important; text-align: left;">
      <div style="text-align: center; border-bottom: 2px dashed #000; padding-bottom: 4px; margin-bottom: 6px; width: 100%;">
        <div style="font-size: ${is58 ? '16px' : '20px'}; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">CLASSY COUTURE</div>
        <div style="font-size: ${is58 ? '11px' : '13px'}; font-weight: 900; letter-spacing: 1.2px; text-transform: uppercase; margin-top: 2px;">ORDER TAG</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: ${is58 ? '11px' : '13px'}; border-bottom: 1.5px dashed #000; font-weight: 700; width: 100%;">
        <span>Order ID: <b style="font-size: ${is58 ? '14px' : '17px'}; font-weight: 900;">#${orderId}</b></span>
        <span>Order Date: <b style="font-size: ${is58 ? '12px' : '14px'}; font-weight: 900;">${orderDateStr}</b></span>
      </div>

      <div style="border: 2px solid #000; border-radius: 6px; padding: ${is58 ? '6px 4px' : '8px 6px'}; margin: 8px 0; text-align: center; width: 100%; box-sizing: border-box !important; background: #fff !important; color: #000 !important;">
        <div style="font-size: ${is58 ? '9.5px' : '11px'}; font-weight: 800; letter-spacing: 1px; line-height: 1; color: #444 !important; text-transform: uppercase;">CUSTOMER NAME</div>
        <div style="font-size: ${is58 ? '18px' : '24px'}; font-weight: 900; letter-spacing: 0.5px; margin: 3px 0 1px 0; line-height: 1.15; color: #000 !important; text-transform: uppercase;">${clientName}</div>
        ${clientPhone ? `<div style="font-size: ${is58 ? '11px' : '13px'}; font-weight: 800; color: #000 !important; margin-top: 2px;">Ph: ${clientPhone}</div>` : ''}
      </div>

      <div style="border: 2.5px solid #000; border-radius: 6px; padding: ${is58 ? '8px 4px' : '10px 6px'}; margin: 8px 0; text-align: center; width: 100%; box-sizing: border-box !important; background: #fff !important; color: #000 !important;">
        <div style="font-size: ${is58 ? '11px' : '13px'}; font-weight: 900; letter-spacing: 1.2px; line-height: 1; color: #000 !important; text-transform: uppercase;">★★★ DELIVERY DATE ★★★</div>
        <div style="font-size: ${is58 ? '22px' : '28px'}; font-weight: 900; letter-spacing: 0.5px; margin: 4px 0 2px 0; line-height: 1.1; color: #000 !important;">${deliveryDateStr}</div>
        <div style="font-size: ${is58 ? '11px' : '12px'}; font-weight: 900; letter-spacing: 0.5px; color: #000 !important; text-transform: uppercase;">${urgencyText}</div>
      </div>

      <div style="border-top: 1.5px dashed #000; padding: 6px 0 2px 0; margin-top: 6px; width: 100%; box-sizing: border-box !important;">
        <div style="font-size: ${is58 ? '9.5px' : '11px'}; font-weight: 800; color: #444; text-transform: uppercase;">ITEM</div>
        <div style="font-size: ${is58 ? '16px' : '20px'}; font-weight: 900; line-height: 1.2; margin-top: 1px;">${order.product || 'Custom Garment'}</div>
        
        <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: ${is58 ? '11px' : '13px'}; font-weight: 800; width: 100%;">
          <span>Type: ${order.orderType || 'Stitching'}</span>
          <span>Qty: ${order.quantity || order.size || '1'} ${order.unit || ''}</span>
        </div>

        ${order.notes ? `
        <div style="margin-top: 5px; padding: 4px 6px; border-left: 3px solid #000; background: #f4f4f4; font-size: ${is58 ? '9.5px' : '11px'}; font-weight: 700; line-height: 1.25; width: 100%; box-sizing: border-box !important; -webkit-print-color-adjust: exact !important;">
          <span style="text-decoration: underline;">Notes:</span> ${order.notes}
        </div>` : ''}
      </div>

      <div style="border-bottom: 2px dashed #000; margin-top: 8px; width: 100%;"></div>
    </div>
  `;
};

/**
 * Generates standalone full HTML document (for popup window printing, centered on page)
 */
export const generateOrderThermalTagHtml = (order, clientObj = null, options = {}) => {
  if (!order) return '';

  const format = options.format || '80mm';
  const is58 = format === '58mm';
  const innerHtml = generateOrderThermalTagInnerHtml(order, clientObj, options);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Order Tag #${order.orderId || order.id}</title>
  <style>
    @page {
      size: ${is58 ? '58mm' : '80mm'} auto;
      margin: 0mm;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      color: #000 !important;
      width: 100% !important;
      min-width: 100% !important;
      max-width: 100% !important;
      height: auto;
      text-align: left;
    }
    .tag-container {
      width: 100% !important;
      max-width: 100% !important;
      margin: 0 !important;
      padding: 4px 6px 14px 6px !important;
      box-sizing: border-box !important;
      background: #fff !important;
      text-align: left !important;
    }
    @media print {
      @page {
        size: ${is58 ? '58mm' : '80mm'} auto;
        margin: 0mm;
      }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        background: #fff !important;
        display: block !important;
        text-align: left !important;
      }
      .tag-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 4px 6px 14px 6px !important;
        box-sizing: border-box !important;
        background: #fff !important;
        text-align: left !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; width: 100%;">
  ${innerHtml}
</body>
</html>
  `;
};

/**
 * Executes reliable direct thermal printing (Centered on page and paper)
 * Automatically configures in-page print DOM and triggers window.print()
 * (Directly compatible with ATPOS 80, POS-80, and all thermal receipt printers)
 */
export const printOrderThermalTag = (order, clientObj = null, options = {}) => {
  if (!order) return;

  const format = options.format || '80mm';
  const is58 = format === '58mm';

  // If user requested popup window explicitly
  if (options.usePopup) {
    const fullHtml = generateOrderThermalTagHtml(order, clientObj, options);
    const win = window.open('', '_blank', 'width=420,height=680,menubar=no,toolbar=no,status=no');
    if (win) {
      win.document.open();
      win.document.write(fullHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 250);
      return;
    }
  }

  // Primary Method: In-Page Direct Print Container (Centered)
  let printArea = document.getElementById('classy-thermal-print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'classy-thermal-print-area';
    document.body.appendChild(printArea);
  }

  // Inject print styles with exact horizontal centering
  let styleEl = document.getElementById('classy-thermal-print-style');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'classy-thermal-print-style';
    document.head.appendChild(styleEl);
  }

  styleEl.innerHTML = `
    @page {
      size: ${is58 ? '58mm' : '80mm'} auto;
      margin: 0mm;
    }
    @media screen {
      #classy-thermal-print-area {
        display: none !important;
        visibility: hidden !important;
      }
    }
    @media print {
      @page {
        size: ${is58 ? '58mm' : '80mm'} auto;
        margin: 0mm;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      html, body {
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #fff !important;
        color: #000 !important;
        display: block !important;
        text-align: left !important;
      }
      /* Hide the regular app interface */
      body > *:not(#classy-thermal-print-area) {
        display: none !important;
      }
      /* Show ONLY the thermal print area and make it fill full roll width */
      #classy-thermal-print-area {
        display: block !important;
        visibility: visible !important;
        position: relative !important;
        margin: 0 !important;
        padding: 0 !important;
        width: 100% !important;
        min-width: 100% !important;
        max-width: 100% !important;
        background: #fff !important;
        color: #000 !important;
        text-align: left !important;
        box-sizing: border-box !important;
        z-index: 9999999 !important;
      }
      #classy-thermal-print-area * {
        visibility: visible !important;
      }
      .tag-container {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 4px 6px 14px 6px !important;
        box-sizing: border-box !important;
        text-align: left !important;
      }
    }
  `;

  // Populate container with HTML
  const tagHtml = generateOrderThermalTagInnerHtml(order, clientObj, options);
  printArea.innerHTML = tagHtml;

  // Trigger window.print() directly
  try {
    window.print();
  } catch (err) {
    console.error('Direct print failed, using popup fallback:', err);
    // Fallback: Open popup window
    const fullHtml = generateOrderThermalTagHtml(order, clientObj, options);
    const win = window.open('', '_blank', 'width=420,height=680');
    if (win) {
      win.document.open();
      win.document.write(fullHtml);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 250);
    }
  }
};
