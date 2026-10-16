import { test, expect } from '@playwright/test';

test.describe('Crackers Shop Invoice Billing POS - Master E2E Flow', () => {
  test('Complete POS Retail Billing & Inventory Lifecycle', async ({ page }) => {
    // 1. Visit POS Command Dashboard
    await page.goto('http://localhost:3000/');
    await expect(page.locator('text=Sree Kalieswari Traders').first()).toBeVisible();

    // 2. Open POS Billing Counter
    await page.click('text=Open POS Counter');
    await expect(page).toHaveURL(/.*pos/);

    // 3. Search and Add 10cm Electric Sparklers
    const searchInput = page.locator('input[placeholder*="Search Crackers"]');
    await searchInput.fill('Sparklers');
    await page.waitForTimeout(300);

    // Click first item to add to cart
    const firstItem = page.locator('text=10cm Electric Sparklers').first();
    await expect(firstItem).toBeVisible();
    await firstItem.click();

    // 4. Verify Cart Item and Calculations
    await expect(page.locator('text=Rate: ₹')).toBeVisible();
    await expect(page.locator('text=TOTAL AMOUNT:')).toBeVisible();

    // 5. Select Payment Mode: Cash
    await page.click('button:has-text("Cash")');

    // 6. Complete and Finalize Sale
    const completeButton = page.locator('button:has-text("Pay & Print 80mm")');
    await expect(completeButton).toBeEnabled();
    await completeButton.click();

    // 7. Verify Success Confirmation & Invoice Number Generated
    await expect(page.locator('text=Sale Successfully Finalized!')).toBeVisible();
    await expect(page.locator('text=Invoice Number:')).toBeVisible();

    // 8. Start Next Sale to dismiss modal
    await page.click('text=Start Next Sale');

    // 9. Navigate to Sales Invoices Register and verify invoice is recorded
    await page.click('text=Sales Invoices');
    await expect(page).toHaveURL(/.*sales/);
    await expect(page.locator('text=SKT/2026-27/').first()).toBeVisible();

    // 10. Navigate to Stock Movements and verify automatic sale stock deduction
    await page.click('text=Inventory');
    await expect(page).toHaveURL(/.*inventory/);
    await page.click('text=Stock Movement Ledger');
    await expect(page.locator('text=SALE_DEDUCTION')).toBeVisible();
  });
});
