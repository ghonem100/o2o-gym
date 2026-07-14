// End-to-end smoke test for the SaaS layer.
import fs from 'fs';
const BASE = 'http://localhost:5000/api/v1';
// Read the super admin password from .env (rotated — never hardcode it here)
const SA_PASSWORD = (() => {
  try {
    return fs.readFileSync(new URL('./.env', import.meta.url), 'utf8')
      .match(/SUPER_ADMIN_PASSWORD=(.+)/)?.[1]?.trim() || 'SuperAdmin@2026';
  } catch {
    return 'SuperAdmin@2026';
  }
})();
let pass = 0, fail = 0;
function log(n, ok, d = '') { ok ? (pass++, console.log(`  ✅ ${n}${d ? ' — ' + d : ''}`)) : (fail++, console.log(`  ❌ ${n}${d ? ' — ' + d : ''}`)); }
async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

console.log('\n=== SAAS SMOKE TEST ===\n');

// 1. Super admin login (no slug)
const saLogin = await req('POST', '/auth/login', { body: { username: 'superadmin', password: SA_PASSWORD } });
const sa = saLogin.json?.data?.token;
log('Super admin login (no gymSlug)', saLogin.status === 200 && saLogin.json?.data?.user?.role === 'super_admin');

// 2. Legacy gym owner login still works (no slug fallback)
const legacyLogin = await req('POST', '/auth/login', { body: { username: 'admin', password: 'Admin@123' } });
log('Legacy no-slug gym login still works', legacyLogin.status === 200, `gymSlug=${legacyLogin.json?.data?.user?.gymSlug}`);

// 3. Slug-scoped login
const slugLogin = await req('POST', '/auth/login', { body: { username: 'admin', password: 'Admin@123', gymSlug: 'o2o-gym' } });
const gym1Token = slugLogin.json?.data?.token;
log('Slug-scoped gym login', slugLogin.status === 200 && slugLogin.json?.data?.user?.gymSlug === 'o2o-gym');

// 4. Gym owner blocked from super-admin API
const forbidden = await req('GET', '/super-admin/gyms', { token: gym1Token });
log('Gym owner blocked from /super-admin (403)', forbidden.status === 403);

// 5. Platform stats
const stats = await req('GET', '/super-admin/stats', { token: sa });
log('Platform stats', stats.status === 200 && typeof stats.json?.data?.totalGyms === 'number',
  `gyms=${stats.json?.data?.totalGyms} active=${stats.json?.data?.activeGyms}`);

// 6. Create a second gym + owner
const slug2 = 'smoke-gym-' + Math.floor(Math.random() * 100000);
const createGym = await req('POST', '/super-admin/gyms', {
  token: sa,
  body: {
    gymName: 'Smoke Gym', gymNameAr: 'جيم الاختبار', slug: slug2,
    ownerUsername: 'smokeowner', ownerPassword: 'SmokeOwner@123',
    ownerFullName: 'Smoke Owner', city: 'Cairo', monthlyFee: 200,
  },
});
const gym2Id = createGym.json?.data?.gym?.id;
log('Super admin creates gym + owner (201)', createGym.status === 201 && !!gym2Id,
  `slug=${slug2} trial ends=${(createGym.json?.data?.gym?.subscriptionEndsAt ?? '').slice(0, 10)}`);

// 6b. Duplicate slug rejected
const dupSlug = await req('POST', '/super-admin/gyms', {
  token: sa,
  body: { gymName: 'Dup Gym', slug: slug2, ownerUsername: 'dupowner1', ownerPassword: 'DupOwner@123', ownerFullName: 'Dup Owner' },
});
log('Duplicate slug rejected (409)', dupSlug.status === 409);

// 7. Public slug resolver
const resolved = await req('GET', `/gyms/slug/${slug2}`);
log('Public slug resolver', resolved.status === 200 && resolved.json?.data?.gymId === gym2Id,
  `status=${resolved.json?.data?.subscriptionStatus}`);
const noLeak = resolved.json?.data && !('monthlyFee' in resolved.json.data) && !('membersCount' in resolved.json.data);
log('Resolver leaks no sensitive fields', !!noLeak);

// 8. New gym owner login via slug
const owner2Login = await req('POST', '/auth/login', { body: { username: 'smokeowner', password: 'SmokeOwner@123', gymSlug: slug2 } });
const gym2Token = owner2Login.json?.data?.token;
log('New gym owner login via slug', owner2Login.status === 200 && !!gym2Token);

// 8b. Same username wrong slug fails
const wrongSlug = await req('POST', '/auth/login', { body: { username: 'smokeowner', password: 'SmokeOwner@123', gymSlug: 'o2o-gym' } });
log('Owner cannot login under another gym slug (401)', wrongSlug.status === 401);

// 9. Tenant isolation: gym2 owner sees zero members, gym1 sees its own
const gym2Members = await req('GET', '/members', { token: gym2Token });
const gym1Members = await req('GET', '/members', { token: gym1Token });
const g1Count = gym1Members.json?.pagination?.total ?? gym1Members.json?.data?.length ?? -1;
log('Gym2 sees 0 members (isolation)', gym2Members.status === 200 && (gym2Members.json?.data?.length ?? -1) === 0);
log('Gym1 still sees own members', gym1Members.status === 200 && g1Count > 0, `count=${g1Count}`);

// 10. Suspend gym2 → owner gets 402
const suspend = await req('PATCH', `/super-admin/gyms/${gym2Id}/suspend`, { token: sa });
log('Suspend gym (200)', suspend.status === 200);
const blocked = await req('GET', '/members', { token: gym2Token });
log('Suspended gym requests blocked (402)', blocked.status === 402, blocked.json?.message?.slice(0, 40));

// 11. Record payment → reactivated + extended
const pay = await req('POST', `/super-admin/gyms/${gym2Id}/payment`, {
  token: sa, body: { amount: 200, month: '2026-07', notes: 'smoke' },
});
log('Record payment (201)', pay.status === 201,
  `newEndsAt=${(pay.json?.data?.gym?.subscriptionEndsAt ?? '').slice(0, 10)} status=${pay.json?.data?.gym?.subscriptionStatus}`);
const unblocked = await req('GET', '/members', { token: gym2Token });
log('Gym reactivated after payment', unblocked.status === 200);

// 12. Gym detail for super admin
const detail = await req('GET', `/super-admin/gyms/${gym2Id}`, { token: sa });
log('Gym detail with payments', detail.status === 200 && detail.json?.data?.tenantPayments?.length === 1);

// 13. Unauthenticated slug resolver for unknown slug
const unknown = await req('GET', '/gyms/slug/definitely-not-a-gym');
log('Unknown slug → 404', unknown.status === 404);

console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
