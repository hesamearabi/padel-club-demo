/* =====================================================
   باشگاه پدل قائم‌شهر — دموی رزرو آنلاین (Vanilla JS)
   داده‌ها در LocalStorage ذخیره می‌شوند.
   ===================================================== */
'use strict';

/* ---------- ابزارهای کمکی ---------- */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (v) => String(v).replace(/\d/g, (d) => FA_DIGITS[d]);
const toEn = (v) => String(v).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
const money = (n) => toFa(Number(n).toLocaleString('en-US')) + ' تومان';
const pad2 = (n) => String(n).padStart(2, '0');
const uid = () => (window.crypto && crypto.randomUUID ? uid()
  : 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10));
const faTime = (h, m = 0) => toFa(pad2(h) + ':' + pad2(m));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------- تبدیل تاریخ میلادی به شمسی (الگوریتم jalaali) ---------- */
function div_(a, b) { return ~~(a / b); }
function mod_(a, b) { return a - ~~(a / b) * b; }
const JALALI_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy) {
  let bl = JALALI_BREAKS.length, gy = jy + 621, leapJ = -14, jp = JALALI_BREAKS[0], jm, jump = 0, leap, n, i;
  if (jy < jp || jy >= JALALI_BREAKS[bl - 1]) throw new Error('Jalali year out of range');
  for (i = 1; i < bl; i++) {
    jm = JALALI_BREAKS[i];
    if (jy < jm) break;
    jump = jm - jp; leapJ += div_(jump, 33) * 8 + div_(mod_(jump, 33), 4); jp = jm;
  }
  n = jy - jp;
  leapJ += div_(n, 33) * 8 + div_(mod_(n, 33) + 3, 4);
  if (mod_(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div_(gy, 4) - div_((div_(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div_(jump + 4, 33) * 33;
  leap = mod_(mod_(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  let d = div_((gy + div_(gm - 8, 6) + 100100) * 1461, 4) + div_(153 * mod_(gm + 9, 12) + 2, 5) + gd - 34840408;
  d = d - div_(div_(gy + 100100 + div_(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}
function d2g(jdn) {
  let j = 4 * jdn + 139361631;
  j = j + div_(div_(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div_(mod_(j, 1461), 4) * 5 + 308;
  const gd = div_(mod_(i, 153), 5) + 1;
  const gm = mod_(div_(i, 153), 12) + 1;
  const gy = div_(j, 1461) - 100100 + div_(8 - gm, 6);
  return { gy, gm, gd };
}
function toJalali(gy, gm, gd) {
  const jdn = g2d(gy, gm, gd);
  const jy = d2g(jdn).gy;
  let j = jy - 621, r = jalCal(j), k = jdn - g2d(r.gy, 3, r.march);
  if (k < 0) { j--; r = jalCal(j); k = jdn - g2d(r.gy, 3, r.march); }
  let jm, jd;
  if (k <= 185) { jm = 1 + div_(k, 31); jd = mod_(k, 31) + 1; }
  else { jm = 7 + div_(k - 186, 30); jd = mod_(k - 186, 30) + 1; }
  return { jy: j, jm, jd };
}
const JALALI_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS_FA = { 0: 'یکشنبه', 1: 'دوشنبه', 2: 'سه‌شنبه', 3: 'چهارشنبه', 4: 'پنج‌شنبه', 5: 'جمعه', 6: 'شنبه' };

const dateKeyOf = (d) => d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
function jalaliLabel(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const j = toJalali(y, m, d);
  return { full: toFa(j.jd) + ' ' + JALALI_MONTHS[j.jm - 1] + ' ' + toFa(j.jy), short: toFa(j.jd) + ' ' + JALALI_MONTHS[j.jm - 1] };
}
function weekdayFa(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return WEEKDAYS_FA[new Date(y, m - 1, d).getDay()];
}
const addDays = (dateKey, n) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const dt = new Date(y, m - 1, d); dt.setDate(dt.getDate() + n);
  return dateKeyOf(dt);
};

/* ---------- داده‌های پایه ---------- */
const COURTS = [
  {
    id: 0, name: 'زمین ۱ — فول پانوراما روباز', short: 'فول پانوراما',
    spec: 'شیشه سکوریت ۱۲ میل بدون ستون مزاحم، چمن مصنوعی آبی FIP، نورپردازی LED',
  },
  {
    id: 1, name: 'زمین ۲ — استاندارد سرپوشیده', short: 'استاندارد سرپوشیده',
    spec: 'سقف بلند ۱۰ متری، تهویه مطبوع، مناسب تمام فصول',
  },
  {
    id: 2, name: 'زمین ۳ — زمین VIP مرکزی', short: 'VIP مرکزی',
    spec: 'جایگاه تماشاگر، رختکن اختصاصی، کفپوش حرفه‌ای',
  },
];
const SLOT_HOURS = [9, 10.5, 12, 13.5, 15, 16.5, 18, 19.5, 21, 22.5]; // شروع سانس‌های ۹۰ دقیقه‌ای
const OFF_PEAK_BEFORE = 15;   // سانس‌هایی که قبل از ۱۵:۰۰ شروع می‌شوند
const RACKET_FEE = 80000;
const CANCEL_FREE_HOURS = 6;
const SAMPLE_USER = { name: 'امیرحسین رضایی', phone: '09111234567', points: 240 };
const STORAGE_KEY = 'padel-club-demo-v1';

const slotLabel = (h) => {
  const start = faTime(Math.floor(h), h % 1 ? 30 : 0);
  const endH = h + 1.5;
  const end = faTime(Math.floor(endH), endH % 1 ? 30 : 0);
  return start + ' - ' + end;
};
const isOffPeak = (h) => h < OFF_PEAK_BEFORE;

/* ---------- State و LocalStorage ---------- */
let state = null;
let ui = { role: 'booking', court: 0, dayOffset: 0, cart: [], userTab: 'upcoming' };

function slotPrice(courtId, h) {
  const base = state.settings.prices[courtId];
  return isOffPeak(h) ? Math.round(base * (1 - state.settings.offPeakDiscount / 100)) : base;
}

function seedState() {
  const today = dateKeyOf(new Date());
  const basePrices = [420000, 500000, 600000];
  let n = 1;
  const code = () => pad2(n++) + pad2(30 + n++);
  const mk = (courtId, key, h, name, phone, status, racket = false, source = 'آنلاین') => ({
    id: uid(), code: code(), courtId, dateKey: key, slotHour: h,
    name, phone, racket, status, source,
    amount: Math.round(basePrices[courtId] * (h < OFF_PEAK_BEFORE ? .8 : 1)), createdAt: Date.now(),
  });
  return {
    settings: { prices: [420000, 500000, 600000], offPeakDiscount: 20 },
    blocks: [{ id: uid(), courtId: 1, dateKey: addDays(today, 1), slotHour: 18, reason: 'تمرین تیم باشگاه' }],
    bookings: [
      mk(0, today, 19.5, SAMPLE_USER.name, SAMPLE_USER.phone, 'confirmed', true),
      mk(2, today, 18, 'سارا محمدی', '09122334455', 'confirmed'),
      mk(1, addDays(today, 1), 10.5, 'علی کریمی', '09345678901', 'confirmed'),
      mk(0, addDays(today, 2), 21, 'محمد صالحی', '09199876543', 'confirmed'),
      mk(1, addDays(today, -3), 20, SAMPLE_USER.name, SAMPLE_USER.phone, 'confirmed'),
      mk(2, addDays(today, -7), 16.5, SAMPLE_USER.name, SAMPLE_USER.phone, 'confirmed', true),
      mk(0, addDays(today, -7), 18, SAMPLE_USER.name, SAMPLE_USER.phone, 'cancelled'),
      mk(1, addDays(today, -1), 12, 'رضا نوری', '09155544332', 'cancelled'),
    ],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { state = JSON.parse(raw); return; }
  } catch (e) { /* داده خراب است؛ دوباره seed می‌کنیم */ }
  state = seedState();
  saveState();
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function resetState() { state = seedState(); saveState(); }

/* ---------- توست ---------- */
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
}

/* ---------- مودال تایید ---------- */
let confirmResolve = null;
function confirmBox(title, text, yesLabel = 'تایید') {
  $('#confirm-title').textContent = title;
  $('#confirm-text').textContent = text;
  $('#confirm-yes').textContent = yesLabel;
  $('#confirm-modal').classList.remove('hidden');
  return new Promise((res) => { confirmResolve = res; });
}
$('#confirm-yes').addEventListener('click', () => { $('#confirm-modal').classList.add('hidden'); confirmResolve?.(true); });
$('#confirm-no').addEventListener('click', () => { $('#confirm-modal').classList.add('hidden'); confirmResolve?.(false); });

/* ---------- QR گرافیکی (SVG) ---------- */
function qrSvg(text) {
  const N = 21, cell = 6;
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  const rnd = () => { h = (h * 1103515245 + 12345) >>> 0; return (h >>> 8) / 0xFFFFFF; };
  let rects = '';
  const finder = (ox, oy) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      if (edge || core) rects += `<rect x="${(ox + x) * cell}" y="${(oy + y) * cell}" width="${cell}" height="${cell}"/>`;
    }
  };
  const inFinder = (x, y) => (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if (!inFinder(x, y) && rnd() > .5) rects += `<rect x="${x * cell}" y="${y * cell}" width="${cell}" height="${cell}"/>`;
  }
  finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
  return `<svg viewBox="0 0 ${N * cell} ${N * cell}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges"><g fill="#0F172A">${rects}</g></svg>`;
}

/* ---------- ناوبری نقش‌ها ---------- */
function switchRole(role) {
  ui.role = role;
  $$('.role-btn, .bottom-nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.role === role));
  ['booking', 'user', 'admin'].forEach((r) => $('#view-' + r).classList.toggle('hidden', r !== role));
  $('#summary-bar').classList.toggle('hidden', !(role === 'booking' && ui.cart.length));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (role === 'user') renderUser();
  if (role === 'admin') renderAdmin();
}
$$('.role-btn, .bottom-nav-btn').forEach((b) =>
  b.addEventListener('click', () => switchRole(b.dataset.role)));

$('#reset-demo-btn').addEventListener('click', async () => {
  const ok = await confirmBox('بازنشانی داده‌های دمو', 'تمام رزروها، مسدودسازی‌ها و تنظیمات به حالت اولیه برمی‌گردند. مطمئن هستید؟', 'بازنشانی');
  if (!ok) return;
  resetState(); ui.cart = []; renderAll();
  toast('داده‌های دمو بازنشانی شد');
});

/* ---------- نمای رزرو: زمین‌ها ---------- */
function renderCourts() {
  $('#court-grid').innerHTML = COURTS.map((c) => `
    <button type="button" class="court-card ${ui.court === c.id ? 'selected' : ''}" data-court="${c.id}">
      <span class="court-badge">تعرفه پایه</span>
      <h4>${c.name}</h4>
      <p class="court-spec">${c.spec}</p>
      <p class="court-price">${money(state.settings.prices[c.id])} <small>/ ۹۰ دقیقه</small></p>
    </button>`).join('');
  $$('#court-grid .court-card').forEach((b) =>
    b.addEventListener('click', () => { ui.court = +b.dataset.court; ui.cart = ui.cart.filter((s) => s.courtId === ui.court); renderBookingView(); }));
}

/* ---------- نمای رزرو: تقویم ۷ روزه ---------- */
function renderCalendar() {
  const today = dateKeyOf(new Date());
  let html = '';
  for (let i = 0; i < 7; i++) {
    const key = addDays(today, i);
    const j = jalaliLabel(key);
    html += `
      <button type="button" role="tab" class="day-chip ${i === ui.dayOffset ? 'selected' : ''}" data-day="${i}">
        <span class="dow">${i === 0 ? 'امروز — ' + weekdayFa(key) : weekdayFa(key)}</span>
        <span class="dnum">${j.short}</span>
      </button>`;
  }
  $('#calendar-strip').innerHTML = html;
  $$('#calendar-strip .day-chip').forEach((b) =>
    b.addEventListener('click', () => { ui.dayOffset = +b.dataset.day; renderBookingView(); }));
}

/* ---------- نمای رزرو: سانس‌ها ---------- */
function slotState(courtId, key, h) {
  if (state.bookings.some((b) => b.courtId === courtId && b.dateKey === key && b.slotHour === h && b.status === 'confirmed')) return 'booked';
  if (state.blocks.some((b) => b.courtId === courtId && b.dateKey === key && b.slotHour === h)) return 'blocked';
  const inCart = ui.cart.some((c) => c.courtId === courtId && c.dateKey === key && c.slotHour === h);
  return inCart ? 'selected' : 'free';
}

function renderSlots() {
  const key = addDays(dateKeyOf(new Date()), ui.dayOffset);
  const j = jalaliLabel(key);
  $('#slot-hint').textContent = `سانس‌های ${COURTS[ui.court].name} — ${weekdayFa(key)} ${j.full}`;
  $('#slots-heading').textContent = '۳. انتخاب سانس';
  $('#slots-grid').innerHTML = SLOT_HOURS.map((h) => {
    const st = slotState(ui.court, key, h);
    const block = st === 'blocked' ? state.blocks.find((b) => b.courtId === ui.court && b.dateKey === key && b.slotHour === h) : null;
    const disabled = st === 'booked' || st === 'blocked';
    const reason = block ? `<span class="slot-reason">${block.reason}</span>` : '';
    const statusText = st === 'booked' ? '<span class="slot-reason">رزرو شده</span>' : '';
    const tag = isOffPeak(h) ? `<span class="slot-tag">تخفیف صبح</span>` : '';
    return `
      <button type="button" class="slot ${st === 'booked' ? 'booked' : st === 'blocked' ? 'blocked' : st === 'selected' ? 'selected' : ''}"
        data-h="${h}" ${disabled ? 'disabled' : ''} aria-pressed="${st === 'selected'}">
        <span class="slot-time">${slotLabel(h)}</span>
        ${tag || ''}
        ${st === 'free' || st === 'selected' ? `<span class="slot-price">${money(slotPrice(ui.court, h))}</span>` : ''}
        ${reason}${statusText}
      </button>`;
  }).join('');
  $$('#slots-grid .slot:enabled').forEach((b) =>
    b.addEventListener('click', () => toggleCart(+b.dataset.h)));
  renderSummaryBar();
}

function toggleCart(h) {
  const key = addDays(dateKeyOf(new Date()), ui.dayOffset);
  const idx = ui.cart.findIndex((c) => c.courtId === ui.court && c.dateKey === key && c.slotHour === h);
  if (idx >= 0) ui.cart.splice(idx, 1);
  else {
    if (ui.cart.length >= 3) return toast('حداکثر می‌توانید ۳ سانس هم‌زمان انتخاب کنید', 'error');
    ui.cart.push({ courtId: ui.court, dateKey: key, slotHour: h });
  }
  renderSlots();
}

function renderSummaryBar() {
  const bar = $('#summary-bar');
  if (!ui.cart.length) return bar.classList.add('hidden');
  const total = ui.cart.reduce((s, c) => s + slotPrice(c.courtId, c.slotHour), 0);
  $('#summary-count').textContent = toFa(ui.cart.length) + ' سانس انتخاب شده';
  $('#summary-total').textContent = ' — جمع کل: ' + money(total);
  bar.classList.remove('hidden');
}

function renderBookingView() { renderCourts(); renderCalendar(); renderSlots(); }

/* ---------- مودال ثبت نهایی و بلیت ---------- */
let lastGroup = null; // {codes, bookings} پس از پرداخت

$('#open-checkout').addEventListener('click', () => {
  const slots = ui.cart;
  const slotsTotal = slots.reduce((s, c) => s + slotPrice(c.courtId, c.slotHour), 0);
  $('#checkout-body').innerHTML = `
    <h3 id="checkout-title">ثبت نهایی رزرو</h3>
    <div class="summary-box">
      ${slots.map((c) => {
        const j = jalaliLabel(c.dateKey);
        return `<div class="row"><span>${COURTS[c.courtId].short} — ${weekdayFa(c.dateKey)} ${j.short}</span><span>${slotLabel(c.slotHour)}</span><span>${money(slotPrice(c.courtId, c.slotHour))}</span></div>`;
      }).join('')}
      <div class="row total"><span>جمع سانس‌ها</span><span>${money(slotsTotal)}</span></div>
    </div>
    <form id="checkout-form" class="form-grid">
      <label>نام و نام خانوادگی
        <input type="text" id="cust-name" class="input" value="${SAMPLE_USER.name}" required />
      </label>
      <label>شماره موبایل
        <input type="tel" id="cust-phone" class="input" pattern="09[0-9]{9}" value="${SAMPLE_USER.phone}" required />
      </label>
      <label class="check-row">
        <input type="checkbox" id="cust-racket" />
        <span>اجاره ست راکت و توپ (+${money(RACKET_FEE)})</span>
      </label>
      <button class="btn btn-accent" type="submit" id="pay-btn">پرداخت موفق دمو</button>
    </form>`;
  $('#checkout-modal').classList.remove('hidden');

  $('#checkout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#cust-name').value.trim();
    const phone = toEn($('#cust-phone').value.trim());
    const racket = $('#cust-racket').checked;
    if (!name || !/^09\d{9}$/.test(phone)) return toast('نام و شماره موبایل معتبر وارد کنید', 'error');
    const btn = $('#pay-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> در حال پردازش پرداخت…';
    setTimeout(() => finalizeBooking(name, phone, racket, slotsTotal), 1000);
  });
});

function finalizeBooking(name, phone, racket, slotsTotal) {
  const groupCode = String(Math.floor(100000 + Math.random() * 900000));
  const newBookings = ui.cart.map((c) => ({
    id: uid(), code: groupCode, courtId: c.courtId, dateKey: c.dateKey, slotHour: c.slotHour,
    name, phone, racket, status: 'confirmed', source: 'آنلاین',
    amount: slotPrice(c.courtId, c.slotHour), createdAt: Date.now(),
  }));
  state.bookings.push(...newBookings);
  saveState();
  lastGroup = { code: groupCode, slots: [...ui.cart], name, phone, racket, slotsTotal };
  ui.cart = [];
  renderBookingView();
  renderTicket(groupCode);
  toast('رزرو شما با موفقیت ثبت شد');
}

function ticketHtml(code) {
  const g = lastGroup && lastGroup.code === code ? lastGroup
    : { slots: state.bookings.filter((b) => b.code === code && b.status === 'confirmed'), name: null, phone: null, racket: null, slotsTotal: null };
  const list = state.bookings.filter((b) => b.code === code && b.status === 'confirmed');
  if (!list.length) return '<p class="muted">این رزرو لغو شده است.</p>';
  const b0 = list[0];
  const j = jalaliLabel(b0.dateKey);
  const racketFee = list.some((b) => b.racket) ? RACKET_FEE : 0;
  return `
    <div class="ticket">
      <p class="muted">بلیت دیجیتال رزرو</p>
      <div class="ticket-code">${toFa(b0.code)}</div>
      <p class="muted">کد رهگیری</p>
      <div class="qr">${qrSvg(b0.code)}</div>
      <p class="ticket-meta">${COURTS[b0.courtId].name}<br/>
        ${weekdayFa(b0.dateKey)} — ${j.full}<br/>
        ${list.map((b) => slotLabel(b.slotHour)).join(' و ')}<br/>
        ${b0.name} — ${toFa(b0.phone)}<br/>
        ${list.some((b) => b.racket) ? 'اجاره ست راکت و توپ: ' + money(RACKET_FEE) + '<br/>' : ''}
        مبلغ پرداختی: <strong>${money(list.reduce((s, b) => s + b.amount, 0) + racketFee)}</strong>
      </p>
    </div>
    <div class="modal-actions">
      <button class="btn btn-accent" type="button" data-close2>مشاهده در پنل من</button>
      <button class="btn btn-ghost" type="button" data-close2>بستن</button>
    </div>`;
}

function renderTicket(code) {
  $('#checkout-body').innerHTML = ticketHtml(code);
  $$('[data-close2]', $('#checkout-body')).forEach((b) =>
    b.addEventListener('click', () => {
      $('#checkout-modal').classList.add('hidden');
      if (b.textContent.includes('پنل')) switchRole('user');
    }));
}

/* ---------- پنل مشتری ---------- */
function userBookings() {
  return state.bookings.filter((b) => b.phone === SAMPLE_USER.phone);
}
function isUpcoming(b) {
  const today = dateKeyOf(new Date());
  return b.dateKey > today || (b.dateKey === today && b.slotHour + 1.5 > new Date().getHours() + new Date().getMinutes() / 60);
}

function renderUser() {
  $('#profile-name').textContent = SAMPLE_USER.name;
  $('#profile-phone').textContent = toFa(SAMPLE_USER.phone);
  $('#profile-points').textContent = toFa(SAMPLE_USER.points);
  $$('.tab[data-usertab]').forEach((t) => t.classList.toggle('active', t.dataset.usertab === ui.userTab));

  const all = userBookings().sort((a, b) => (a.dateKey + a.slotHour).localeCompare(b.dateKey + b.slotHour));
  const upcoming = all.filter((b) => isUpcoming(b) && b.status === 'confirmed');
  const history = all.filter((b) => !isUpcoming(b) || b.status === 'cancelled');
  const list = ui.userTab === 'upcoming' ? upcoming : history;

  $('#user-bookings').innerHTML = list.length ? list.map((b) => {
    const j = jalaliLabel(b.dateKey);
    const free = hoursUntil(b) >= CANCEL_FREE_HOURS;
    return `
      <div class="booking-item ${b.status === 'cancelled' ? 'cancelled' : ''}">
        <div class="bi-main">
          <strong>${COURTS[b.courtId].name}</strong>
          <p class="bi-meta">${weekdayFa(b.dateKey)} ${j.full} — ${slotLabel(b.slotHour)} — ${money(b.amount)}</p>
          <p class="bi-code">کد رهگیری: ${toFa(b.code)}</p>
        </div>
        <span class="status-pill ${b.status === 'confirmed' ? 'ok' : 'cancelled'}">${b.status === 'confirmed' ? 'قطعی' : 'لغو شده'}</span>
        <div class="bi-actions">
          ${b.status === 'confirmed' ? `<button type="button" class="btn btn-ghost btn-sm" data-ticket="${b.code}">مشاهده بلیت</button>` : ''}
          ${b.status === 'confirmed' && isUpcoming(b) ? `<button type="button" class="btn btn-outline-danger" data-cancel="${b.id}">لغو رزرو</button>` : ''}
        </div>
        ${b.status === 'confirmed' && isUpcoming(b) ? `<p class="muted" style="width:100%">${free ? 'لغو این رزرو رایگان است.' : 'لغو تا ۶ ساعت قبل از سانس رایگان است — اکنون کمتر از ۶ ساعت مانده.'}</p>` : ''}
      </div>`;
  }).join('') : `<div class="empty-state">رزروی در این فهرست نیست — از بخش «رزرو آنلاین» یک سانس انتخاب کنید.</div>`;

  $$('[data-ticket]').forEach((b) => b.addEventListener('click', () => {
    $('#checkout-body').innerHTML = ticketHtml(b.dataset.ticket);
    $$('[data-close2]', $('#checkout-body')).forEach((x) => x.addEventListener('click', () => $('#checkout-modal').classList.add('hidden')));
    $('#checkout-modal').classList.remove('hidden');
  }));
  $$('[data-cancel]').forEach((b) => b.addEventListener('click', () => cancelBooking(b.dataset.cancel, 'user')));
}

function hoursUntil(b) {
  const [y, m, d] = b.dateKey.split('-').map(Number);
  const start = new Date(y, m - 1, d, Math.floor(b.slotHour), b.slotHour % 1 ? 30 : 0);
  return (start - new Date()) / 36e5;
}

async function cancelBooking(id, by) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return;
  const ok = await confirmBox('لغو رزرو', `لغو تا ۶ ساعت قبل از سانس رایگان است. رزرو ${COURTS[b.courtId].short} برای ${b.name} لغو شود؟`, 'لغو رزرو');
  if (!ok) return;
  b.status = 'cancelled';
  saveState();
  toast('رزرو لغو شد و سانس در تقویم آزاد شد');
  if (ui.role === 'user') renderUser(); else renderAdmin();
  if (ui.role === 'booking') renderBookingView();
}

/* ---------- پنل مدیریت ---------- */
function weekKeys() {
  const today = dateKeyOf(new Date());
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}
function confirmedBookings() { return state.bookings.filter((b) => b.status === 'confirmed'); }

function renderAdmin() {
  const wk = weekKeys();
  const conf = confirmedBookings();
  const todayKey = wk[0];
  const todayCount = conf.filter((b) => b.dateKey === todayKey).length;
  const weekRevenue = conf.filter((b) => wk.includes(b.dateKey)).reduce((s, b) => s + b.amount, 0)
    + new Set(conf.filter((b) => wk.includes(b.dateKey) && b.racket).map((b) => b.code)).size * RACKET_FEE;
  const occupancy = Math.round((conf.filter((b) => wk.includes(b.dateKey)).length / (3 * 7 * SLOT_HOURS.length)) * 100);
  const counts = [0, 0, 0];
  conf.forEach((b) => counts[b.courtId]++);
  const popularIdx = counts.indexOf(Math.max(...counts));

  $('#kpi-grid').innerHTML = `
    <div class="kpi-card"><p class="kpi-label">رزروهای امروز</p><p class="kpi-value">${toFa(todayCount)}</p></div>
    <div class="kpi-card"><p class="kpi-label">درآمد کل هفته</p><p class="kpi-value">${money(weekRevenue)}</p></div>
    <div class="kpi-card"><p class="kpi-label">درصد اشغال زمین‌ها</p>
      <p class="kpi-value">${toFa(occupancy)}٪</p>
      <div class="occupancy-bar"><i style="width:${occupancy}%"></i></div>
    </div>
    <div class="kpi-card"><p class="kpi-label">محبوب‌ترین زمین</p><p class="kpi-value" style="font-size:1rem">${COURTS[popularIdx].short}</p></div>`;

  renderChart(wk);
  renderFilters();
  renderAdminTable();
  renderBlockManager();
  renderPricingForm();
}

function renderChart(wk) {
  const W = 660, H = 220, pad = 36, groupW = (W - pad * 2) / 7, barW = 16;
  const counts = wk.map((k) => SLOT_HOURS.map(() => [0, 0, 0]));
  confirmedBookings().forEach((b) => {
    const di = wk.indexOf(b.dateKey);
    if (di >= 0) counts[di][SLOT_HOURS.indexOf(b.slotHour)][b.courtId]++;
  });
  const dayTotals = counts.map((slots) => slots.reduce((a, s) => [a[0] + s[0], a[1] + s[1], a[2] + s[2]], [0, 0, 0]));
  const max = Math.max(1, ...dayTotals.flat());
  const colors = ['#10B981', '#0EA5E9', '#F59E0B'];
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" dir="ltr">`;
  for (let g = 0; g <= 4; g++) {
    const y = H - pad - (g / 4) * (H - pad - 20);
    svg += `<line x1="${pad}" y1="${y}" x2="${W - pad / 2}" y2="${y}" stroke="#E5E7EB" stroke-width="1"/><text x="${W - 6}" y="${y + 4}" font-size="10" fill="#64748B" text-anchor="start">${toFa(Math.round(max * g / 4))}</text>`;
  }
  wk.forEach((k, di) => {
    const gx = W - pad - (di + 1) * groupW;
    dayTotals[di].forEach((v, ci) => {
      const h = (v / max) * (H - pad - 20);
      svg += `<rect x="${gx + groupW / 2 - barW * 1.6 + ci * barW}" y="${H - pad - h}" width="${barW - 4}" height="${Math.max(h, v ? 3 : 0)}" rx="3" fill="${colors[ci]}"><title>${COURTS[ci].short}: ${toFa(v)}</title></rect>`;
    });
    svg += `<text x="${gx + groupW / 2}" y="${H - 14}" font-size="10" fill="#64748B" text-anchor="middle">${jalaliLabel(k).short}</text>`;
  });
  COURTS.forEach((c, ci) => {
    svg += `<rect x="${pad + ci * 110}" y="6" width="10" height="10" rx="2" fill="${colors[ci]}"/><text x="${pad + ci * 110 + 16}" y="15" font-size="10" fill="#0F172A">${c.short}</text>`;
  });
  $('#admin-chart').innerHTML = svg + '</svg>';
}

function renderFilters() {
  const sel = $('#filter-court');
  if (!sel.options.length) {
    sel.innerHTML = '<option value="all">همه زمین‌ها</option>' + COURTS.map((c, i) => `<option value="${i}">${c.name}</option>`).join('');
  }
  const search = $('#filter-search').value;
  $('#filter-search').value = search;
}

function renderAdminTable() {
  const fc = $('#filter-court').value, fs = $('#filter-status').value;
  const q = toEn($('#filter-search').value.trim());
  const rows = state.bookings
    .filter((b) => (fc === 'all' || b.courtId === +fc) && (fs === 'all' || b.status === fs))
    .filter((b) => !q || b.name.includes($('#filter-search').value.trim()) || b.phone.includes(q) || b.code.includes(q))
    .sort((a, b) => (b.dateKey + b.slotHour).localeCompare(a.dateKey + a.slotHour));

  $('#admin-tbody').innerHTML = rows.length ? rows.map((b) => {
    const j = jalaliLabel(b.dateKey);
    return `<tr>
      <td>${toFa(b.code)}</td>
      <td>${b.name}<br/><span class="muted">${toFa(b.phone)}</span></td>
      <td>${COURTS[b.courtId].short}</td>
      <td>${weekdayFa(b.dateKey)} ${j.short}</td>
      <td>${slotLabel(b.slotHour)}</td>
      <td>${money(b.amount)}${b.racket ? ' + راکت' : ''}</td>
      <td><span class="status-pill ${b.status === 'confirmed' ? 'ok' : 'cancelled'}">${b.status === 'confirmed' ? 'قطعی' : 'لغو شده'}</span></td>
      <td>${b.status === 'confirmed' ? `<button type="button" class="btn btn-outline-danger" data-acancel="${b.id}">لغو توسط مدیر</button>` : '—'}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="8" class="muted" style="text-align:center;padding:24px">رزروی با این فیلترها پیدا نشد.</td></tr>';

  $$('[data-acancel]').forEach((b) => b.addEventListener('click', () => cancelBooking(b.dataset.acancel, 'admin')));
}

['#filter-court', '#filter-status'].forEach((s) => $(s).addEventListener('change', renderAdminTable));
$('#filter-search').addEventListener('input', renderAdminTable);

/* ثبت رزرو حضوری / تلفنی */
function fillSelects() {
  const wk = weekKeys();
  $$('select[data-court-select]').forEach((s) => {
    s.innerHTML = COURTS.map((c, i) => `<option value="${i}">${c.name}</option>`).join('');
  });
  [['#block-date'], ['#manual-date']].forEach(([sel]) => {
    $(sel).innerHTML = wk.map((k, i) => {
      const j = jalaliLabel(k);
      return `<option value="${k}">${i === 0 ? 'امروز' : weekdayFa(k)} ${j.short}</option>`;
    }).join('');
  });
  const fillSlots = () => {
    [['#block-slot', '#block-date', '#block-court'], ['#manual-slot', '#manual-date', '#manual-court']].forEach(([slotSel, dateSel, courtSel]) => {
      $(slotSel).innerHTML = SLOT_HOURS.map((h) => `<option value="${h}">${slotLabel(h)}</option>`).join('');
    });
  };
  fillSlots();
}

$('#open-manual-book').addEventListener('click', () => {
  $('#manual-form').reset();
  fillSelects();
  $('#manual-modal').classList.remove('hidden');
});
$('#manual-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#manual-name').value.trim();
  const phone = toEn($('#manual-phone').value.trim());
  const courtId = +$('#manual-court').value, dateKey = $('#manual-date').value, slotHour = +$('#manual-slot').value;
  if (!name || !/^09\d{9}$/.test(phone)) return toast('نام و شماره موبایل معتبر وارد کنید', 'error');
  if (state.bookings.some((b) => b.courtId === courtId && b.dateKey === dateKey && b.slotHour === slotHour && b.status === 'confirmed'))
    return toast('این سانس قبلاً رزرو شده است', 'error');
  if (state.blocks.some((b) => b.courtId === courtId && b.dateKey === dateKey && b.slotHour === slotHour))
    return toast('این سانس مسدود است', 'error');
  state.bookings.push({
    id: uid(), code: String(Math.floor(100000 + Math.random() * 900000)),
    courtId, dateKey, slotHour, name, phone, racket: false, status: 'confirmed',
    source: 'حضوری/تلفنی', amount: slotPrice(courtId, slotHour), createdAt: Date.now(),
  });
  saveState();
  $('#manual-modal').classList.add('hidden');
  renderAdmin();
  toast('رزرو حضوری/تلفنی ثبت شد');
});

/* مسدودسازی سانس */
$('#block-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const courtId = +$('#block-court').value, dateKey = $('#block-date').value,
    slotHour = +$('#block-slot').value, reason = $('#block-reason').value.trim();
  if (!reason) return toast('دلیل مسدودسازی را وارد کنید', 'error');
  const existing = state.blocks.find((b) => b.courtId === courtId && b.dateKey === dateKey && b.slotHour === slotHour);
  if (existing) { existing.reason = reason; } else {
    state.blocks.push({ id: uid(), courtId, dateKey, slotHour, reason });
  }
  saveState();
  $('#block-reason').value = '';
  renderAdmin();
  if (ui.role === 'booking') renderBookingView();
  toast('سانس مسدود شد');
});

function renderBlockManager() {
  const list = $('#block-list');
  list.innerHTML = state.blocks.length ? state.blocks.map((b) => {
    const j = jalaliLabel(b.dateKey);
    return `<li><span>${COURTS[b.courtId].short} — ${weekdayFa(b.dateKey)} ${j.short} — ${slotLabel(b.slotHour)} — ${b.reason}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-unblock="${b.id}">رفع مسدودی</button></li>`;
  }).join('') : '<li class="muted">سانس مسدودی وجود ندارد.</li>';
  $$('[data-unblock]').forEach((b) => b.addEventListener('click', () => {
    state.blocks = state.blocks.filter((x) => x.id !== b.dataset.unblock);
    saveState(); renderAdmin(); renderBookingView();
    toast('مسدودی سانس رفع شد');
  }));
}

/* تنظیمات تعرفه */
function renderPricingForm() {
  state.settings.prices.forEach((p, i) => $('#price-' + i).value = p);
  $('#offpeak').value = state.settings.offPeakDiscount;
}
$('#pricing-form').addEventListener('submit', (e) => {
  e.preventDefault();
  state.settings.prices = [0, 1, 2].map((i) => +toEn($('#price-' + i).value));
  state.settings.offPeakDiscount = +toEn($('#offpeak').value);
  saveState();
  renderBookingView();
  toast('تعرفه‌ها ذخیره شد و در کل سایت به‌روز شد');
});

/* ---------- بستن مودال‌ها ---------- */
$$('.modal-overlay').forEach((ov) => {
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.add('hidden'); });
  $$('[data-close]', ov).forEach((b) => b.addEventListener('click', () => ov.classList.add('hidden')));
});

/* ---------- تب‌های پنل مشتری ---------- */
$$('.tab[data-usertab]').forEach((t) =>
  t.addEventListener('click', () => { ui.userTab = t.dataset.usertab; renderUser(); }));

/* ---------- شروع ---------- */
function renderAll() {
  renderBookingView();
  renderUser();
  switchRole(ui.role);
}
loadState();
fillSelects();
renderAll();
