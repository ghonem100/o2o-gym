const BASE = 'http://localhost:5000/api/v1';
let pass = 0, fail = 0;
function log(n, ok, d = '') { ok ? (pass++, console.log(`  ✅ ${n}${d ? ' — ' + d : ''}`)) : (fail++, console.log(`  ❌ ${n}${d ? ' — ' + d : ''}`)); }
async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

const owner = (await req('POST', '/auth/login', { body: { username: 'admin', password: 'Admin@123' } })).json.data.token;
const rec = (await req('POST', '/auth/login', { body: { username: 'smoke_receptionist', password: 'Recept@123' } })).json.data.token;

console.log('\n=== PRODUCTS SMOKE TEST ===\n');

// 1. Owner creates product
const create = await req('POST', '/products', { token: owner, body: { name: 'Water Bottle', nameAr: 'زجاجة مياه', price: 10, stockQuantity: 50 } });
log('Owner creates product (201)', create.status === 201, create.json?.data?.id ? 'id ok' : JSON.stringify(create.json));
const productId = create.json?.data?.id;

// 2. Receptionist cannot create (403)
const recCreate = await req('POST', '/products', { token: rec, body: { name: 'X', price: 5, stockQuantity: 1 } });
log('Receptionist blocked from create (403)', recCreate.status === 403);

// 3. List products (both)
const list = await req('GET', '/products', { token: rec });
log('Receptionist can list products', list.status === 200 && Array.isArray(list.json.data));

// 4. Receptionist sells 3 units
const sell = await req('POST', '/products/sell', { token: rec, body: { items: [{ productId, quantity: 3 }], paymentMethod: 'cash' } });
log('Receptionist sells product (201)', sell.status === 201, `total=${sell.json?.data?.grandTotal}`);
log('Sale total correct (3×10=30)', sell.json?.data?.grandTotal === 30);

// 5. Stock decremented
const afterList = await req('GET', '/products', { token: owner });
const prod = afterList.json.data.find((p) => p.id === productId);
log('Stock decremented 50→47', prod?.stockQuantity === 47, `stock=${prod?.stockQuantity}`);

// 6. Oversell blocked (409)
const oversell = await req('POST', '/products/sell', { token: rec, body: { items: [{ productId, quantity: 9999 }], paymentMethod: 'cash' } });
log('Oversell blocked (409)', oversell.status === 409, oversell.json?.message);

// 7. Sales history
const sales = await req('GET', '/products/sales', { token: owner });
log('Sales history returns records', sales.status === 200 && sales.json.data.sales.length > 0, `${sales.json?.data?.sales?.length} sales, rev=${sales.json?.data?.summary?.totalRevenue}`);

// 8. Product revenue in dashboard + daily summary
const dash = await req('GET', '/analytics/dashboard', { token: owner });
log('Dashboard has todayProductRevenue', typeof dash.json?.data?.todayProductRevenue === 'number', `=${dash.json?.data?.todayProductRevenue}`);
const daily = await req('GET', '/payments/daily-summary', { token: owner });
log('Daily summary splits product revenue', daily.json?.data?.productRevenue >= 30, `product=${daily.json?.data?.productRevenue} sub=${daily.json?.data?.subscriptionRevenue}`);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
