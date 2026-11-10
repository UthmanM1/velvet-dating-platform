// End-to-end journey checks with Playwright against a running server.
// Usage: BASE_URL=http://localhost:3000 DEMO_ADMIN_PASSWORD=... node scripts/journeys.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

const base = process.env.BASE_URL || 'http://localhost:3000';
const results = [];
async function step(name, fn) {
  try { await fn(); results.push([name, true]); console.log('PASS', name); }
  catch (e) { results.push([name, false]); console.log('FAIL', name, '-', String(e.message).split('\n')[0]); }
}

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();

for (const p of ['/', '/about', '/discover', '/plans', '/safety', '/faq', '/contact', '/login', '/register', '/terms', '/privacy', '/guidelines']) {
  await step(`public page ${p} loads`, async () => {
    const r = await page.goto(base + p);
    if (!r || r.status() >= 400) throw new Error('status ' + r?.status());
    if (!(await page.locator('body').innerText()).includes('VELVET')) throw new Error('no brand text');
  });
}
await step('protected route redirects anonymous users', async () => {
  await page.goto(base + '/dashboard');
  if (!page.url().includes('/login')) throw new Error('landed on ' + page.url());
});
await step('admin route refuses anonymous users', async () => {
  await page.goto(base + '/admin');
  if (page.url().endsWith('/admin')) throw new Error('admin reachable');
});
await step('demo member can sign in and reach dashboard', async () => {
  await page.goto(base + '/login');
  await page.fill('input[name=email]', 'demo@velvet.example');
  await page.fill('input[name=password]', process.env.DEMO_MEMBER_PASSWORD || 'VelvetDemo!2026');
  await page.click('button[type=submit]');
  await page.waitForURL('**/dashboard**', { timeout: 15000 });
});
await step('member cannot open admin area', async () => {
  await page.goto(base + '/admin');
  if (page.url().includes('/admin') && !(await page.locator('body').innerText()).match(/not found|forbidden|sign in/i) && page.url().endsWith('/admin')) throw new Error('member reached admin');
});
await step('discover shows member cards', async () => {
  await page.goto(base + '/discover');
  const n = await page.locator('a[href^="/discover/"]').count();
  if (n < 3) throw new Error('only ' + n + ' cards');
});
await step('messages inbox loads', async () => {
  const r = await page.goto(base + '/dashboard/messages');
  if (!r || r.status() >= 400) throw new Error('status');
});
await step('subscription page loads', async () => {
  await page.goto(base + '/dashboard/subscription');
  if (!(await page.locator('body').innerText()).match(/gold/i)) throw new Error('no plan info');
});
await step('sign out works', async () => {
  const btn = page.getByRole('button', { name: /sign out|log out/i }).first();
  await btn.click();
  await page.waitForTimeout(800);
  await page.goto(base + '/dashboard');
  if (!page.url().includes('/login')) throw new Error('still signed in');
});

if (process.env.DEMO_ADMIN_PASSWORD) {
  await step('admin can sign in and view admin dashboard', async () => {
    await page.goto(base + '/login');
    await page.fill('input[name=email]', 'admin@velvet.example');
    await page.fill('input[name=password]', process.env.DEMO_ADMIN_PASSWORD);
    await page.click('button[type=submit]');
    await page.waitForTimeout(1500);
    await page.goto(base + '/admin');
    if (!page.url().endsWith('/admin')) throw new Error('landed on ' + page.url());
    for (const p of ['/admin/members', '/admin/reports', '/admin/photos', '/admin/subscriptions', '/admin/audit']) {
      const r = await page.goto(base + p);
      if (!r || r.status() >= 400) throw new Error(p + ' ' + r?.status());
    }
  });
}
await browser.close();
const failed = results.filter(([, ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} journey steps passed`);
process.exit(failed ? 1 : 0);
