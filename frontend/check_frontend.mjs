import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const SS = (name, buf) => writeFileSync(`D:/callingagent/frontend/test-screenshots/${name}.png`, buf);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(e.message));

// 1. Load root — should redirect to /login
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
SS('01_login', await page.screenshot());
console.log('1. URL:', page.url());

// 2. Login page structure
const emailInput = await page.locator('input[type="email"]').count();
const passInput  = await page.locator('input[type="password"]').count();
const btn        = await page.locator('button[type="submit"]').count();
console.log('2. Login form — email:', emailInput, '| pass:', passInput, '| button:', btn);

// 3. Login
await page.fill('input[type="email"]', 'admin@test.com');
await page.fill('input[type="password"]', 'testpass123');
SS('02_login_filled', await page.screenshot());
await page.click('button[type="submit"]');
await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
SS('03_after_login', await page.screenshot());
console.log('3. URL after login:', page.url());

// 4. Sidebar
const navLinks = await page.locator('aside nav a').allTextContents();
console.log('4. Sidebar nav:', navLinks);

// 5. Dashboard loads
const dashHeading = await page.locator('h1').first().textContent().catch(() => '');
console.log('5. Dashboard heading:', dashHeading.trim());

// 6. Leads page
await page.click('a[href="/leads"]');
await page.waitForLoadState('networkidle');
SS('04_leads', await page.screenshot());
const leadsH = await page.locator('h1').first().textContent().catch(() => '');
console.log('6. Leads heading:', leadsH.trim());

// 7. Check leads table shows the 3 uploaded leads
const rows = await page.locator('tbody tr').count();
console.log('7. Lead rows in table:', rows);

// 8. Campaigns page
await page.click('a[href="/campaigns"]');
await page.waitForLoadState('networkidle');
SS('05_campaigns', await page.screenshot());
const campH = await page.locator('h1').first().textContent().catch(() => '');
console.log('8. Campaigns heading:', campH.trim());
const campCard = await page.locator('text=June Outreach').count();
console.log('9. "June Outreach" campaign visible:', campCard > 0);

// 9. Live call board
await page.click('a[href="/live"]');
await page.waitForLoadState('networkidle');
SS('06_live', await page.screenshot());
const liveH = await page.locator('h1').first().textContent().catch(() => '');
console.log('10. Live board heading:', liveH.trim());

// 10. Call history
await page.click('a[href="/history"]');
await page.waitForLoadState('networkidle');
SS('07_history', await page.screenshot());
const histH = await page.locator('h1').first().textContent().catch(() => '');
console.log('11. History heading:', histH.trim());

// 11. Analytics
await page.click('a[href="/analytics"]');
await page.waitForLoadState('networkidle');
SS('08_analytics', await page.screenshot());
const analytH = await page.locator('h1').first().textContent().catch(() => '');
console.log('12. Analytics heading:', analytH.trim());

// 12. Console errors
console.log('13. JS errors:', errors.length ? errors.join(' | ') : 'none');

await browser.close();
process.exit(0);
