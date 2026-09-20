/** 地址栏种子恢复：带 #bi=2 刷新后应处于第 3 种笔意（回锋） */
import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
const page = await browser.newPage({ viewport:{width:1440,height:1000}, deviceScaleFactor:2 });
await page.goto('http://localhost:4173/jianyi#bi=2&jian=8', { waitUntil:'domcontentloaded' });
await page.waitForTimeout(2500);
const switchText = await page.locator('button:has-text("换一种笔意")').textContent();
const cardTitle = await page.locator('.text-cinnabar-700').first().textContent();
const hash = await page.evaluate(()=>location.hash);
const ok = hash.includes('bi=2') && /（3\/3）/.test(switchText) && /回锋/.test(cardTitle);
console.log(JSON.stringify({hash, switchText, cardTitle}));
console.log(ok?'PASS: #bi=2 restores 回锋 · 倒卷 on reload':'FAIL');
await browser.close(); process.exit(ok?0:1);
