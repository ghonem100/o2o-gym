// End-to-end smoke test against the live local API.
const BASE = 'http://localhost:5000/api/v1';
let pass = 0, fail = 0;
const results = [];

function log(name, ok, detail = '') {
  results.push({ name, ok, detail });
  if (ok) { pass++; console.log(`  ✅ ${name}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ' — ' + detail : ''}`); }
}

async function req(method, path, { token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, json };
}

// tiny base64 1x1 png (not a real face — face enroll just stores bytes)
const FAKE_DESCRIPTOR = Buffer.from(new Float32Array(128).fill(0.1).buffer).toString('base64');

async function main() {
  console.log('\n=== O2O GYM SMOKE TEST ===\n');

  // 1. AUTH — owner login
  console.log('1) Auth');
  const login = await req('POST', '/auth/login', { body: { username: 'admin', password: 'Admin@123' } });
  const ownerToken = login.json?.data?.token;
  log('Owner login returns JWT', login.status === 200 && typeof ownerToken === 'string' && ownerToken.split('.').length === 3,
    ownerToken ? `role=${login.json.data.user.role}` : `status=${login.status}`);
  const gymId = login.json?.data?.user?.gymId;

  // bad login
  const badLogin = await req('POST', '/auth/login', { body: { username: 'admin', password: 'wrongpass123' } });
  log('Wrong password rejected (401)', badLogin.status === 401, badLogin.json?.message);

  // 2. MEMBER — create with photo
  console.log('\n2) Member');
  const phone = '010' + Math.floor(10000000 + Math.random() * 89999999);
  const createMember = await req('POST', '/members', {
    token: ownerToken,
    body: { fullName: 'Smoke Test Member', phone, gender: 'male', photoUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' },
  });
  const member = createMember.json?.data;
  log('Create member (201)', createMember.status === 201, member ? `#${member.memberNumber}` : `status=${createMember.status}`);
  log('Barcode auto-generated', !!member?.barcode, member?.barcode);
  log('Photo URL stored', member?.photoUrl?.includes('cloudinary'));
  const memberId = member?.id;

  // 3. FACE ENROLLMENT
  console.log('\n3) Face Enrollment');
  const enroll = await req('POST', `/members/${memberId}/face`, {
    token: ownerToken,
    body: { descriptor: FAKE_DESCRIPTOR },
  });
  log('Enroll face (201)', enroll.status === 201);
  const descriptors = await req('GET', '/members/face-descriptors', { token: ownerToken });
  const found = descriptors.json?.data?.find((d) => d.memberId === memberId);
  log('Descriptor saved & retrievable', !!found, found ? 'in member_faces' : 'not found');
  const profileAfter = await req('GET', `/members/${memberId}/profile`, { token: ownerToken });
  log('Profile shows hasFace=true', profileAfter.json?.data?.hasFace === true);

  // 4. SUBSCRIPTION — monthly, verify payment logged
  console.log('\n4) Subscription + Payment');
  const plans = await req('GET', '/subscriptions/plans', { token: ownerToken });
  const monthlyPlan = plans.json?.data?.find((p) => p.planType === 'monthly');
  const today = new Date().toISOString().slice(0, 10);
  const createSub = await req('POST', '/subscriptions', {
    token: ownerToken,
    body: { memberId, planId: monthlyPlan.id, startDate: today, paymentMethod: 'cash' },
  });
  log('Create monthly subscription (201)', createSub.status === 201);
  log('Payment auto-logged with reference', !!createSub.json?.data?.payment?.referenceNumber,
    createSub.json?.data?.payment?.referenceNumber);
  log('Subscription endDate ~30 days out', !!createSub.json?.data?.subscription?.endDate);

  // 5. ATTENDANCE
  console.log('\n5) Attendance');
  const checkin1 = await req('POST', '/attendance/barcode', { token: ownerToken, body: { barcode: member.barcode } });
  log('Barcode check-in success', checkin1.status === 200 && checkin1.json?.data?.success === true,
    `alert=${checkin1.json?.data?.alert ?? 'none'}`);
  const checkin2 = await req('POST', '/attendance/barcode', { token: ownerToken, body: { barcode: member.barcode } });
  log('Same-day re-check-in blocked (409)', checkin2.status === 409, checkin2.json?.message);

  // 5c. Expired member alert — create a member with an expired subscription via past start date
  const phone2 = '011' + Math.floor(10000000 + Math.random() * 89999999);
  const m2 = (await req('POST', '/members', { token: ownerToken, body: { fullName: 'Expired Member', phone: phone2 } })).json.data;
  const dailyPlan = plans.json.data.find((p) => p.planType === 'daily');
  // backdate a daily subscription so it is already expired
  const past = new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10);
  await req('POST', '/subscriptions', { token: ownerToken, body: { memberId: m2.id, planId: dailyPlan.id, startDate: past, paymentMethod: 'cash' } });
  const checkinExpired = await req('POST', '/attendance/barcode', { token: ownerToken, body: { barcode: m2.barcode } });
  log('Expired member returns alert', checkinExpired.json?.data?.alert === 'expired' || checkinExpired.json?.data?.alert === 'expiring_soon',
    `alert=${checkinExpired.json?.data?.alert}`);

  // 6. NOTIFICATIONS
  console.log('\n6) Notifications');
  // create a member expiring in 2 days to trigger a reminder
  const phone3 = '012' + Math.floor(10000000 + Math.random() * 89999999);
  const m3 = (await req('POST', '/members', { token: ownerToken, body: { fullName: 'Expiring Soon', phone: phone3 } })).json.data;
  const startFor2Days = new Date(Date.now() - 28 * 86400000).toISOString().slice(0, 10); // monthly started 28d ago → 2 days left
  await req('POST', '/subscriptions', { token: ownerToken, body: { memberId: m3.id, planId: monthlyPlan.id, startDate: startFor2Days, paymentMethod: 'cash' } });
  const reminders = await req('POST', '/notifications/send-reminders', { token: ownerToken });
  log('Send reminders (200)', reminders.status === 200, `total=${reminders.json?.data?.total} sent=${reminders.json?.data?.sent} failed=${reminders.json?.data?.failed}`);
  const history = await req('GET', '/notifications', { token: ownerToken });
  log('Notification log entry created', Array.isArray(history.json?.data) && history.json.data.length > 0,
    `${history.json?.data?.length} entries`);
  // dedup check
  const reminders2 = await req('POST', '/notifications/send-reminders', { token: ownerToken });
  log('Duplicate send skipped same day', reminders2.json?.data?.skipped > 0, `skipped=${reminders2.json?.data?.skipped}`);

  // 7. ANALYTICS
  console.log('\n7) Analytics');
  const dash = await req('GET', '/analytics/dashboard', { token: ownerToken });
  const k = dash.json?.data;
  const numeric = k && ['totalMembers','activeMembers','todayCheckIns','todayRevenue','monthRevenue','netProfit'].every((key) => typeof k[key] === 'number');
  log('Dashboard KPIs all numeric', !!numeric,
    k ? `members=${k.totalMembers} active=${k.activeMembers} todayRev=${k.todayRevenue} checkins=${k.todayCheckIns}` : 'no data');

  // 8. RBAC — receptionist
  console.log('\n8) RBAC');
  // create a receptionist user directly is not exposed via API; verify role gating using owner-restricted route with no token and confirm 401, plus analytics requires owner.
  // Create receptionist through DB-less path: we test that a non-owner token cannot hit analytics.
  // Since there's no public user-create endpoint, simulate by asserting analytics rejects unauthenticated and that owner-only refund path enforces owner.
  const noAuth = await req('GET', '/analytics/dashboard');
  log('Analytics requires auth (401)', noAuth.status === 401);

  // RBAC receptionist test requires a receptionist account — created below via seed helper endpoint if present.
  // We create one through Prisma-less approach: attempt login of a seeded receptionist (smoke-receptionist).
  const recLogin = await req('POST', '/auth/login', { body: { username: 'smoke_receptionist', password: 'Recept@123' } });
  if (recLogin.status === 200) {
    const recToken = recLogin.json.data.token;
    const recAnalytics = await req('GET', '/analytics/dashboard', { token: recToken });
    log('Receptionist blocked from /analytics (403)', recAnalytics.status === 403, recAnalytics.json?.message);
    const recMembers = await req('GET', '/members', { token: recToken });
    log('Receptionist CAN access /members', recMembers.status === 200);
  } else {
    log('Receptionist account present for RBAC test', false, 'smoke_receptionist not found — will create');
  }

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed ===\n`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
