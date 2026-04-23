// 概要書用スクショ取得スクリプト
// 使い方: node scripts/take-screenshots.js
// 出力: docs/screenshots/*.png

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = process.env.SCREENSHOT_BASE_URL || 'https://logistics-daily-report.vercel.app';
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');

const MOBILE_VP = { width: 390, height: 844 };       // iPhone 14 Pro 相当
const DESKTOP_VP = { width: 1440, height: 900 };

async function main() {
  console.log(`[base] ${BASE_URL}`);
  const browser = await chromium.launch();

  // ==================== モバイル ====================
  const mobileCtx = await browser.newContext({
    viewport: MOBILE_VP,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  // ドライバー画面 - 出庫前
  {
    const page = await mobileCtx.newPage();
    await page.goto(`${BASE_URL}/driver`, { waitUntil: 'networkidle' });
    // localStorage がseedされるのを待つ
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(OUT_DIR, 'driver-pre-trip.png') });
    console.log('✓ driver-pre-trip.png');

    // フェーズ2(運行中)に切り替えてスクショ
    const midButton = await page.locator('button:has-text("運行中")').first();
    if (await midButton.isVisible()) {
      await midButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT_DIR, 'driver-mid-trip.png') });
      console.log('✓ driver-mid-trip.png');
    }

    // フェーズ3(帰庫後)に切り替え
    const postButton = await page.locator('button:has-text("帰庫後")').first();
    if (await postButton.isVisible()) {
      await postButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(OUT_DIR, 'driver-post-trip.png') });
      console.log('✓ driver-post-trip.png');
    }

    await page.close();
  }

  await mobileCtx.close();

  // ==================== デスクトップ ====================
  const desktopCtx = await browser.newContext({
    viewport: DESKTOP_VP,
    deviceScaleFactor: 2,
  });

  // ホーム
  {
    const page = await desktopCtx.newPage();
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, 'home.png'), fullPage: false });
    console.log('✓ home.png');
    await page.close();
  }

  // 管理ダッシュボード - 概要
  {
    const page = await desktopCtx.newPage();
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // チャート描画待ち
    await page.screenshot({ path: path.join(OUT_DIR, 'admin-overview.png'), fullPage: true });
    console.log('✓ admin-overview.png');

    // ドライバータブ
    await page.locator('button:has-text("ドライバー")').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, 'admin-drivers.png'), fullPage: true });
    console.log('✓ admin-drivers.png');

    // 異常タブ
    await page.locator('button:has-text("異常報告")').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, 'admin-anomalies.png'), fullPage: true });
    console.log('✓ admin-anomalies.png');

    // 車両タブ
    await page.locator('button:has-text("車両")').first().click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, 'admin-vehicles.png'), fullPage: true });
    console.log('✓ admin-vehicles.png');

    await page.close();
  }

  await desktopCtx.close();
  await browser.close();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
