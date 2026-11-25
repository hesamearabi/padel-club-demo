/* =====================================================
   باشگاه پدل قائم‌شهر — پورتال ورزشی و رزرو آنلاین
   Vanilla JS + LocalStorage (کلید: padel-club-demo-v2)
   ===================================================== */
'use strict';

/* ---------- ابزارهای کمکی ---------- */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const toFa = (v) => String(v).replace(/\d/g, (d) => FA_DIGITS[d]);
const toEn = (v) => String(v).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
const money = (n) => toFa(Number(n).toLocaleString('en-US')) + ' تومان';
const pad2 = (n) => String(n).padStart(2, '0');
const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
const faTime = (h, m = 0) => toFa(pad2(h) + ':' + pad2(m));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- تبدیل تاریخ میلادی به شمسی ---------- */
function div_(a, b) { return ~~(a / b); }
function mod_(a, b) { return a - ~~(a / b) * b; }
const JALALI_BREAKS = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

function jalCal(jy) {
  let bl = JALALI_BREAKS.length, gy = jy + 621, leapJ = -14, jp = JALALI_BREAKS[0], jm, jump = 0, leap, n, i;
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
const weekKeys = () => Array.from({ length: 7 }, (_, i) => addDays(dateKeyOf(new Date()), i));

/* ---------- داده‌های پایه ---------- */
const CLUB = {
  name: 'کیوسک کلاب',
  addr: 'قائم‌شهر، بلوار قائم‌آباد، نبش خیابان گلستان، مجموعه ورزشی شهید پدل',
  phone: '۰۱۱-۴۲۳۴۵۶۷۸',
  hours: '۰۸:۰۰ تا ۲۴:۰۰',
};
const COURTS = [
  { id: 0, name: 'زمین ۱ فول پانوراما روباز', short: 'فول پانوراما', price: 420000, rating: 4.9,
    spec: 'شیشه سکوریت ۱۲ میل بدون ستون مزاحم، چمن مصنوعی آبی FIP، نورپردازی LED' },
  { id: 1, name: 'زمین ۲ استاندارد سرپوشیده', short: 'استاندارد سرپوشیده', price: 500000, rating: 4.7,
    spec: 'سقف بلند ۱۰ متری، تهویه مطبوع چهارفصل، نورپردازی ضدخیرگی' },
  { id: 2, name: 'زمین ۳ VIP مرکزی', short: 'VIP مرکزی', price: 600000, rating: 5.0,
    spec: 'جایگاه تماشاگر، رختکن و دوش اختصاصی، کفپوش حرفه‌ای' },
];
const SLOT_HOURS = [9, 10.5, 12, 13.5, 15, 16.5, 18, 19.5, 21, 22.5];
const OFF_PEAK_BEFORE = 15;
const RACKET_FEE = 80000;
const CANCEL_FREE_HOURS = 6;
const SAMPLE_USER = { name: 'امیرحسین رضایی', phone: '09111234567', points: 240 };
const ADMIN_CRED = { user: 'admin', pass: 'admin123' };
const STORAGE_KEY = 'kiosk-club-demo-v1';

const slotLabel = (h) => {
  const start = faTime(Math.floor(h), h % 1 ? 30 : 0);
  const endH = h + 1.5;
  const end = faTime(Math.floor(endH), endH % 1 ? 30 : 0);
  return start + ' - ' + end;
};
const isOffPeak = (h) => h < OFF_PEAK_BEFORE;
const slotPrice = (courtId, h) => {
  const base = state.settings.prices[courtId];
  return isOffPeak(h) ? Math.round(base * (1 - state.settings.offPeakDiscount / 100)) : base;
};

/* استان‌ها و شهرها — حذف شده در ری‌برند کیوسک کلاب (تک‌شعبه قائم‌شهر) */

/* مقالات و پلن‌ها */
const ARTICLES = [
  { id: 'a1', tag: 'آموزش', title: 'پدل را از کجا شروع کنیم؟ راهنمای اولین جلسه',
    excerpt: 'قوانین امتیازگیری، سرویس زیر کمر و چیدمان زمین — هر آنچه برای اولین بازی لازم دارید.',
    body: ['پدل همیشه دوبل بازی می‌شود و زمین، ۲۰ در ۱۰ متر با دیوارهای شیشه‌ای است. توپ بعد از یک سرویس زیر کمر، باید در گوشه مقابل فرود بیاید و اجازه دارد پس از برخورد به دیوارِ زمینِ حریف، به هوا برخورد کند و سپس بازی ادامه یابد.', 'برای اولین جلسه، کفش پلاستیک‌دار مخصوص چمن مصنوعی بیاورید و اجاره ست راکت و توپ کافی است. مهم‌ترین مهارت اول، «بمب‌گذاری» دیوار پشت نیست؛ کنترل توپ با راکتِ کوتاه است.', 'در باشگاه ما هر پنجشنبه کلاس مقدماتی با مربی درجه ۱ فدراسیون برگزار می‌شود؛ ثبت‌نام از همین سایت و بدون پیش‌نیاز است.'] },
  { id: 'a2', tag: 'تاکتیک', title: 'چرا حریف همیشه نقطه را می‌بَرد؟ اصل کنترل مرکز',
    excerpt: 'در بازی دوبل، تیمی که جلوتر بایستد برنده است — به شرطی که بداند کی عقب برود.',
    body: ['معماهای پدل با یک اصل ساده حل می‌شود: تیمِ تهاجمی جلو می‌ایستد و تیمِ دفاعی عقب. اشتباه رایج بازیکنان تازه‌کار این است که بعد از هر لوپ، در نیمه زمین می‌مانند.', 'قاعده طلایی: تا وقتی توپ بالای تورِ شما رد شده و حریف تهاجمی است، عقب بمانید. به محض اینکه لوب کوتاه دادید یا توپ به دیوار خورد و شُل شد، به سمت تور حرکت کنید.', 'در کلینیک تاکتیک دوبل باشگاه، همین الگو روی زمین VIP تمرین می‌شود؛ ضبط بازی هم انجام می‌شود تا اشتباه‌های جابه‌جایی دیده شود.'] },
  { id: 'a3', tag: 'باشگاه', title: 'چهارشنبه‌شب‌ها زیر نورافکن: گزارش لیگ داخلی زمین VIP',
    excerpt: 'هفته سی‌ودوم لیگ داخلی با رکورد شرکت بازیکنان برگزار شد؛ گزارش کامل از دیدار فینال.',
    body: ['فینال لیگ داخلی این فصل با حضور ۳۲ تیم دوبل روی زمین VIP مرکزی برگزار شد و دیدار نهایی در دو ست پیاپی به تیم «دیوار آبی» رسید.', 'بازی‌های شب زیر نور LED با تهویه ضدخیرگی انجام می‌شود؛ همین ویژگی زمین سرپوشیده باعث شده لیگ در سرمای مازندران هم بدون توقف ادامه پیدا کند.', 'ثبت‌نام فصل بعد از طریق فرم تماس در همین سایت انجام می‌شود.'] },
];
const PLANS = [
  { id: 'bronze', name: 'پلن برنزی', price: 1450000, feats: ['۴ سانس ماهانه روی همه زمین‌ها', 'رزرو تا ۷ روز زودتر', 'بدون تخفیف اضافه'] },
  { id: 'silver', name: 'پلن نقره‌ای', price: 2690000, feats: ['۸ سانس ماهانه روی همه زمین‌ها', 'تخفیف ۱۰٪ روی همه رزروها', 'اولویت انتظار در سانس‌های پُر'] },
  { id: 'gold', name: 'پلن طلایی VIP', price: 4290000, feats: ['۱۲ سانس ماهانه، همه زمین‌ها', 'تخفیف ۱۰٪ + راکت و توپ رایگان', 'دسترسی زودهنگام به تورنمنت‌ها'] },
];

/* ---------- State و LocalStorage ---------- */
let state = null;
let ui = { view: 'home', court: 0, dayOffset: 0, cart: [], timeFilter: 'all', userTab: 'overview', lastView: 'home' };

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
    favorites: { courts: [0] },
    activePlan: null,
    messages: [
      { id: uid(), name: 'مهدی برقعی', phone: '09123334455', subject: 'پیام عمومی', body: 'سلام، شرایط رزرو دو سانس پیاپی در روز جمعه چطور است؟', createdAt: Date.now() - 86400000 },
    ],
    session: { role: 'guest' },
  };
}
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { state = JSON.parse(raw); return; }
  } catch (e) { /* داده خراب؛ دوباره seed */ }
  state = seedState();
  saveState();
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function resetState() { state = seedState(); ui.cart = []; }

/* ---------- توست و مودال تایید ---------- */
function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  $('#toast-container').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2600);
}
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

/* ---------- ناوبری و نقش‌ها ---------- */
const VIEWS = ['home', 'plans', 'map', 'favorites', 'blog', 'about', 'contact', 'auth', 'user', 'admin'];

function renderSessionBar() {
  const guest = state.session.role === 'guest';
  $('#auth-entry').classList.toggle('hidden', !guest);
  $('#session-box').classList.toggle('hidden', guest);
  if (!guest) $('#session-role-name').textContent =
    state.session.role === 'admin' ? 'مدیر باشگاه' : SAMPLE_USER.name;
}
function logout() {
  state.session = { role: 'guest' };
  saveState();
  renderSessionBar();
  showView('home');
  toast('از حساب خارج شدید');
}
$('#logout-btn').addEventListener('click', logout);
$('#panel-entry').addEventListener('click', () => showView(state.session.role === 'admin' ? 'admin' : 'user'));

function showView(name) {
  if (name === 'account') {
    name = state.session.role === 'admin' ? 'admin' : state.session.role === 'player' ? 'user' : 'auth';
  }
  if (name === 'booking') { showView('home'); $('#booking-section').scrollIntoView({ behavior: 'smooth' }); return; }
  if (!VIEWS.includes(name)) name = 'home';
  ui.view = name;
  VIEWS.forEach((v) => $('#view-' + v).classList.toggle('hidden', v !== name));
  $$('[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === name));
  $('#summary-bar').classList.toggle('hidden', !(name === 'home' && ui.cart.length));
  $('#nav-links').classList.remove('open');
  $('#menu-toggle').setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0 });
  if (name === 'home') renderBookingView();
  if (name === 'plans') renderPlans();
  if (name === 'favorites') renderFavorites();
  if (name === 'blog') renderBlog();
  if (name === 'user') renderUser();
  if (name === 'admin') renderAdmin();
}

/* کلیک روی همه [data-nav] */
document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { showView(nav.dataset.nav); return; }
  const cat = e.target.closest('.cat-tile');
  if (cat) handleCatTile(cat.dataset.cat);
});

function handleCatTile(cat) {
  if (['plans', 'map'].includes(cat)) { showView(cat); return; }
  showView('booking');
}

$('#nav-cta').addEventListener('click', () => showView('booking'));
$('#menu-toggle').addEventListener('click', () => {
  const nav = $('#nav-links');
  const open = nav.classList.toggle('open');
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
  $('#menu-toggle').setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
});

/* ---------- ساعت‌شمار: روز و سانس ---------- */
function fillProvinceSelects() {
  $('#us-date').innerHTML = weekKeys().map((k, i) => {
    const j = jalaliLabel(k);
    return `<option value="${k}">${i === 0 ? 'امروز' : weekdayFa(k)} ${j.short}</option>`;
  }).join('');
}

/* جستجوی هیرو */
$('#hero-search-form').addEventListener('submit', (e) => {
  e.preventDefault();
  showView('booking');
  const idx = $('#us-date').selectedIndex;
  if (idx >= 0) { ui.dayOffset = idx; renderBookingView(); }
});

/* ---------- قلب علاقه‌مندی ---------- */
const heartSvg = (filled) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.6-7-9.6A4 4 0 0 1 12 7a4 4 0 0 1 7 3.4c0 5-7 9.6-7 9.6z" fill="${filled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8"/></svg>`;
function toggleFav(kind, id) {
  const f = state.favorites;
  const arr = f[kind];
  const i = arr.indexOf(id);
  if (i >= 0) arr.splice(i, 1); else arr.push(id);
  saveState();
  renderFavBadge();
  renderBookingView();
  if (ui.view === 'favorites') renderFavorites();
  if (ui.view === 'user' && ui.userTab === 'fav') renderUser();
}
function renderFavBadge() {
  const n = state.favorites.courts.length;
  $('#fav-badge').textContent = toFa(n);
}

/* ---------- نمای رزرو: زمین‌ها ---------- */
function renderCourts() {
  $('#court-grid').innerHTML = COURTS.map((c) => `
    <div class="court-card ${ui.court === c.id ? 'selected' : ''}">
      <button type="button" class="court-fav" data-cfav="${c.id}" aria-pressed="${state.favorites.courts.includes(c.id)}" aria-label="افزودن ${esc(c.short)} به علاقه‌مندی‌ها">${heartSvg(state.favorites.courts.includes(c.id))}</button>
      <span class="court-rating">★ ${toFa(c.rating.toLocaleString('en-US'))}</span>
      <h4>${c.name}</h4>
      <p class="court-spec">${c.spec}</p>
      <p class="court-price num">${money(state.settings.prices[c.id])} <small>/ ۹۰ دقیقه</small></p>
      <button type="button" class="btn ${ui.court === c.id ? 'btn-accent' : 'btn-ghost'} btn-sm" data-pick-court="${c.id}">${ui.court === c.id ? 'زمین انتخاب شده' : 'انتخاب زمین'}</button>
    </div>`).join('');
  $$('[data-cfav]').forEach((b) => b.addEventListener('click', () => toggleFav('courts', +b.dataset.cfav)));
  $$('[data-pick-court]').forEach((b) => b.addEventListener('click', () => {
    ui.court = +b.dataset.pickCourt;
    ui.cart = ui.cart.filter((s) => s.courtId === ui.court);
    renderBookingView();
    $('#slots-panel-anchor')?.scrollIntoView({ behavior: 'smooth' });
  }));
}

/* تقویم ۷ روزه */
function freeSlotCount(courtId, key) {
  return SLOT_HOURS.filter((h) => slotState(courtId, key, h) === 'free').length;
}
function renderCalendar() {
  const today = dateKeyOf(new Date());
  $('#calendar-strip').innerHTML = weekKeys().map((key, i) => {
    const j = jalaliLabel(key);
    const free = freeSlotCount(ui.court, key);
    return `
      <button type="button" role="tab" class="day-chip ${i === ui.dayOffset ? 'selected' : ''}" data-day="${i}" aria-selected="${i === ui.dayOffset}">
        <span class="dow">${i === 0 ? 'امروز — ' + weekdayFa(key) : weekdayFa(key)}</span>
        <span class="dnum num">${j.short}</span>
        <span class="day-free num">${toFa(free)} سانس آزاد</span>
      </button>`;
  }).join('');
  $$('#calendar-strip .day-chip').forEach((b) =>
    b.addEventListener('click', () => { ui.dayOffset = +b.dataset.day; renderBookingView(); }));
}

/* فیلتر زمان روز */
const TIME_FILTERS = [
  { id: 'all', label: 'همه سانس‌ها', test: () => true },
  { id: 'morning', label: 'صبح و ظهر — ۲۰٪ تخفیف', test: (h) => isOffPeak(h) },
  { id: 'afternoon', label: 'عصر', test: (h) => h >= 15 && h < 19 },
  { id: 'night', label: 'شب', test: (h) => h >= 19 },
];
function renderSlotFilters() {
  const box = $('#time-filters');
  box.innerHTML = TIME_FILTERS.map((f) =>
    `<button type="button" class="tf-pill ${ui.timeFilter === f.id ? 'active' : ''}" data-tf="${f.id}" aria-pressed="${ui.timeFilter === f.id}">${f.label}</button>`).join('');
  $$('[data-tf]').forEach((b) => b.addEventListener('click', () => {
    ui.timeFilter = b.dataset.tf;
    renderSlotFilters(); renderSlots();
  }));
}

/* ستون سه‌قدمی کنسول */
function renderStepConsole() {
  const box = $('#step-console');
  if (!box) return;
  const done = [
    true,
    ui.court !== null,
    ui.cart.length > 0,
  ];
  const stepNums = [
    { n: 1, t: 'انتخاب زمین', d: ui.court === null ? 'هنوز زمینی انتخاب نشده' : COURTS[ui.court].short },
    { n: 2, t: 'انتخاب روز', d: 'نوار هفت‌روزه جلالی با شمار سانس آزاد' },
    { n: 3, t: 'انتخاب سانس', d: ui.cart.length ? toFa(ui.cart.length) + ' سانس در سبد' : 'از ۰۹:۰۰ تا ۲۴:۰۰، هر سانس ۹۰ دقیقه' },
  ];
  box.innerHTML = stepNums.map((s, i) => `
    <div class="step-item ${done[i + 1] ? 'done' : ''} ${i === 0 ? 'active' : ''}">
      <span class="step-num num">${toFa(s.n)}</span>
      <span class="step-text"><strong>${s.t}</strong><small>${s.d}</small></span>
    </div>`).join('');
}

/* سانس‌ها */
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
  const tf = TIME_FILTERS.find((f) => f.id === ui.timeFilter) || TIME_FILTERS[0];
  const hours = SLOT_HOURS.filter(tf.test);
  $('#slots-grid').innerHTML = hours.map((h) => {
    const st = slotState(ui.court, key, h);
    const block = st === 'blocked' ? state.blocks.find((b) => b.courtId === ui.court && b.dateKey === key && b.slotHour === h) : null;
    const disabled = st === 'booked' || st === 'blocked';
    const reason = block ? `<span class="slot-reason">${esc(block.reason)}</span>` : '';
    const statusText = st === 'booked' ? '<span class="slot-reason">رزرو شده</span>' : '';
    const tag = isOffPeak(h) ? '<span class="slot-tag">تخفیف صبح</span>' : '';
    return `
      <button type="button" class="slot ${h >= 19 ? 'evening' : ''} ${st === 'booked' ? 'booked' : st === 'blocked' ? 'blocked' : st === 'selected' ? 'selected' : ''}"
        data-h="${h}" ${disabled ? 'disabled' : ''} aria-pressed="${st === 'selected'}">
        <span class="slot-time num">${slotLabel(h)}</span>
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
  $('#summary-total').textContent = 'جمع کل: ' + money(total);
  bar.classList.remove('hidden');
}
function renderBookingView() { renderCourts(); renderCalendar(); renderSlotFilters(); renderSlots(); renderStepConsole(); }

/* ---------- پرداخت و بلیت دیجیتال ---------- */
let lastGroup = null;
$('#open-checkout').addEventListener('click', () => {
  const slots = ui.cart;
  const slotsTotal = slots.reduce((s, c) => s + slotPrice(c.courtId, c.slotHour), 0);
  $('#checkout-body').innerHTML = `
    <h3>ثبت نهایی رزرو</h3>
    <div class="summary-box">
      ${slots.map((c) => {
        const j = jalaliLabel(c.dateKey);
        return `<div class="row"><span>${COURTS[c.courtId].short} — ${weekdayFa(c.dateKey)} ${j.short}</span><span>${slotLabel(c.slotHour)}</span><span>${money(slotPrice(c.courtId, c.slotHour))}</span></div>`;
      }).join('')}
      <div class="row total"><span>جمع سانس‌ها</span><span>${money(slotsTotal)}</span></div>
    </div>
    <form id="checkout-form" class="form-grid">
      <label>نام و نام خانوادگی
        <input type="text" id="cust-name" class="input" value="${esc(state.session.role === 'player' ? SAMPLE_USER.name : '')}" required />
      </label>
      <label>شماره موبایل
        <input type="tel" id="cust-phone" class="input" pattern="09[0-9]{9}" value="${esc(state.session.role === 'player' ? SAMPLE_USER.phone : '')}" required />
      </label>
      <label class="check-row span-2">
        <input type="checkbox" id="cust-racket" />
        <span>اجاره ست راکت و توپ (+${money(RACKET_FEE)})</span>
      </label>
      <button class="btn btn-accent" type="submit" id="pay-btn">پرداخت و صدور بلیت</button>
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
  const planDiscount = (state.activePlan && state.activePlan.phone === phone) ? state.activePlan.discount : 0;
  const newBookings = ui.cart.map((c) => ({
    id: uid(), code: groupCode, courtId: c.courtId, dateKey: c.dateKey, slotHour: c.slotHour,
    name, phone, racket, status: 'confirmed', source: 'آنلاین',
    amount: Math.round(slotPrice(c.courtId, c.slotHour) * (1 - planDiscount / 100)), createdAt: Date.now(),
  }));
  state.bookings.push(...newBookings);
  if (state.session.role === 'guest' && phone === SAMPLE_USER.phone) state.session = { role: 'player' };
  saveState();
  renderSessionBar();
  lastGroup = { code: groupCode, slots: [...ui.cart], name, phone, racket, slotsTotal };
  ui.cart = [];
  renderBookingView();
  renderTicket(groupCode);
  toast('رزرو شما با موفقیت ثبت شد');
}
function ticketHtml(code) {
  const list = state.bookings.filter((b) => b.code === code && b.status === 'confirmed');
  if (!list.length) return '<p class="muted">این رزرو لغو شده است.</p>';
  const b0 = list[0];
  const j = jalaliLabel(b0.dateKey);
  const racketFee = list.some((b) => b.racket) ? RACKET_FEE : 0;
  return `
    <div class="ticket">
      <p class="muted">بلیت دیجیتال رزرو</p>
      <div class="ticket-code num">${toFa(b0.code)}</div>
      <p class="muted">کد رهگیری — در ورود باشگاه اسکن کنید</p>
      <div class="qr">${qrSvg(b0.code)}</div>
      <p class="ticket-meta">${COURTS[b0.courtId].name}<br/>
        ${weekdayFa(b0.dateKey)}، ${j.full}<br/>
        ${list.map((b) => slotLabel(b.slotHour)).join(' و ')}<br/>
        ${esc(b0.name)} — ${toFa(b0.phone)}<br/>
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
      if (b.textContent.includes('پنل')) showView('user');
    }));
}

/* ---------- مقالات ---------- */
function articleCardHtml(a) {
  return `
    <button type="button" class="article-card" data-article="${a.id}">
      <span class="article-tag">${a.tag}</span>
      <h4>${a.title}</h4>
      <p class="article-excerpt">${a.excerpt}</p>
      <span class="article-meta">مطالعه حدود ${toFa(a.body.length * 2)} دقیقه</span>
    </button>`;
}
function renderBlogTeaser() { $('#blog-teaser-grid').innerHTML = ARTICLES.map(articleCardHtml).join(''); bindArticles($('#blog-teaser-grid')); }
function renderBlog() { $('#blog-grid').innerHTML = ARTICLES.map(articleCardHtml).join(''); bindArticles($('#blog-grid')); }
function bindArticles(root) {
  $$('[data-article]', root).forEach((b) => b.addEventListener('click', () => {
    const a = ARTICLES.find((x) => x.id === b.dataset.article);
    $('#article-modal-body').innerHTML = `
      <div class="reader-head">
        <span class="article-tag">${a.tag}</span>
        <h3>${a.title}</h3>
        <p class="muted">${a.excerpt}</p>
      </div>
      <div class="article-body">${a.body.map((p) => `<p>${p}</p>`).join('')}</div>
      <div class="modal-actions"><button class="btn btn-ghost" type="button" data-close2>بستن</button></div>`;
    $('#article-modal').classList.remove('hidden');
    $$('[data-close2]', $('#article-modal-body')).forEach((x) =>
      x.addEventListener('click', () => $('#article-modal').classList.add('hidden')));
  }));
}

/* ---------- پلن‌ها ---------- */
function renderPlans() {
  $('#plan-grid').innerHTML = PLANS.map((p) => {
    const active = state.activePlan && state.activePlan.planId === p.id;
    return `
      <div class="plan-card ${p.id === 'gold' ? 'gold' : ''}">
        <h3>${p.name}</h3>
        <p class="plan-price num">${money(p.price)} <span class="muted" style="font-size:.8rem;font-weight:400">/ ماه</span></p>
        <ul class="plan-feats">${p.feats.map((f) => `<li>${f}</li>`).join('')}</ul>
        ${active
          ? '<span class="plan-active-pill">✓ این پلن فعال شماست</span>'
          : `<button type="button" class="btn ${p.id === 'gold' ? 'btn-accent' : 'btn-ghost'}" data-plan="${p.id}">فعال‌سازی ${p.name}</button>`}
      </div>`;
  }).join('');
  $$('[data-plan]').forEach((b) => b.addEventListener('click', async () => {
    if (state.session.role === 'guest') {
      toast('برای فعال‌سازی پلن، ابتدا وارد حساب بازیکن شوید', 'error');
      showView('auth');
      return;
    }
    const p = PLANS.find((x) => x.id === b.dataset.plan);
    const ok = await confirmBox('فعال‌سازی ' + p.name, 'پلن بلافاصله در حساب بازیکن ثبت می‌شود و تخفیف آن روی رزروهای بعدی اعمال می‌شود. مبلغ: ' + money(p.price), 'فعال‌سازی');
    if (!ok) return;
    state.activePlan = { planId: p.id, phone: SAMPLE_USER.phone, name: p.name, discount: p.id === 'bronze' ? 0 : 10, sessions: PLANS.find((x) => x.id === p.id).feats[0] };
    saveState();
    renderPlans();
    toast(p.name + ' فعال شد؛ تخفیف پلن روی رزروهای بعدی اعمال می‌شود');
  }));
  $('#active-plan-card').innerHTML = state.activePlan
    ? `<h3>پلن فعال شما: ${state.activePlan.name}</h3>
       <p class="muted">تخفیف ${toFa(state.activePlan.discount)}٪ روی همه رزروهای آنلاین با موبایل ${toFa(state.activePlan.phone)} اعمال می‌شود.</p>`
    : '<h3>پلن فعالی ندارید</h3><p class="muted">با فعال‌سازی یکی از پلن‌های بالا، تخفیف به‌صورت خودکار روی رزروهای بعدی اعمال می‌شود.</p>';
}

/* ---------- علاقه‌مندی‌ها ---------- */
function renderFavorites() {
  const f = state.favorites;
  const fc = f.courts.map((i) => COURTS[i]).filter(Boolean);
  if (!fc.length) {
    $('#favorites-content').innerHTML = `
      <div class="fav-empty">
        <h3>هنوز زمینی به علاقه‌مندی‌ها اضافه نکرده‌اید</h3>
        <p>روی قلبِ هر زمین بزنید تا اینجا ذخیره شود.</p>
        <button type="button" class="btn btn-accent" data-nav="booking">مشاهده زمین‌ها</button>
      </div>`;
    return;
  }
  $('#favorites-content').innerHTML = `
    <div class="fav-group"><h3>زمین‌ها</h3><div class="court-grid">${fc.map((c) => `
      <div class="court-card"><h4>${c.name}</h4><p class="court-spec">${c.spec}</p>
      <p class="court-price">${money(state.settings.prices[c.id])} <small>/ ۹۰ دقیقه</small></p>
      <button type="button" class="btn btn-ghost btn-sm" data-nav="booking">مشاهده سانس‌ها</button></div>`).join('')}</div></div>`;
}

/* ---------- نقشه ---------- */
function renderMap() {
  $('#map-svg').innerHTML = `
  <svg viewBox="0 0 600 400" role="img" aria-label="نقشه شماتیک قائم‌شهر و موقعیت باشگاه">
    <rect width="600" height="400" fill="#E8EEF5"/>
    <path d="M0 300 L600 220" stroke="#C6D3E0" stroke-width="26" fill="none"/>
    <path d="M120 0 L180 400" stroke="#C6D3E0" stroke-width="20" fill="none"/>
    <path d="M380 0 L340 400" stroke="#C6D3E0" stroke-width="14" fill="none"/>
    <text x="30" y="270" fill="#5B6B7C" font-size="13">بلوار قائم‌آباد</text>
    <text x="60" y="40" fill="#5B6B7C" font-size="12">خیابان گلستان</text>
    <rect x="200" y="80" width="60" height="40" fill="#D6E0EA"/><text x="206" y="106" fill="#5B6B7C" font-size="11">پارک</text>
    <rect x="430" y="300" width="90" height="50" fill="#D6E0EA"/><text x="438" y="330" fill="#5B6B7C" font-size="11">میدان اصلی</text>
    <g>
      <rect x="300" y="150" width="120" height="80" rx="10" fill="rgba(52,211,153,.14)" stroke="#059669" stroke-width="2.4"/>
      <text x="330" y="185" fill="#059669" font-size="14" font-weight="700">باشگاه پدل</text>
      <text x="336" y="205" fill="#0F172A" font-size="11">قائم‌شهر</text>
      <circle cx="420" cy="150" r="6" fill="#1D4ED8"/>
    </g>
    <path d="M470 325 L400 240 L366 200" stroke="#1D4ED8" stroke-width="2.4" fill="none" stroke-dasharray="6 6" marker-end="none"/>
    <text x="440" y="245" fill="#1D4ED8" font-size="11">مسیر ۸ دقیقه‌ای از میدان</text>
  </svg>`;
  $('#court-layout-svg').innerHTML = `
  <svg viewBox="0 0 300 220" role="img" aria-label="چیدمان سه زمین باشگاه">
    <rect x="20" y="20" width="120" height="80" rx="6" fill="none" stroke="#059669" stroke-width="2"/><text x="34" y="64" fill="#0F172A" font-size="11">زمین ۱ — پانوراما</text>
    <rect x="160" y="20" width="120" height="80" rx="6" fill="none" stroke="#059669" stroke-width="2"/><text x="176" y="64" fill="#0F172A" font-size="11">زمین ۲ — سرپوشیده</text>
    <rect x="90" y="120" width="120" height="80" rx="6" fill="none" stroke="#1D4ED8" stroke-width="2.4"/><text x="106" y="156" fill="#0F172A" font-size="11">زمین ۳ — VIP مرکزی</text>
    <text x="112" y="176" fill="#5B6B7C" font-size="10">جایگاه تماشاگر</text>
  </svg>`;
  $('#map-addr').textContent = CLUB.addr;
  $('#map-phone').textContent = 'تلفن پذیرش: ' + CLUB.phone;
}

/* ---------- تماس با ما ---------- */
function renderContactInfo() {
  $('#contact-addr').textContent = CLUB.addr;
  $('#contact-phone').textContent = 'تلفن پذیرش: ' + CLUB.phone;
}
$('#contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#cf-name').value.trim(), phone = toEn($('#cf-phone').value.trim());
  const subject = $('#cf-subject').value, body = $('#cf-body').value.trim();
  if (!name || !/^09\d{9}$/.test(phone) || !body) return toast('نام، موبایل معتبر و متن پیام را کامل وارد کنید', 'error');
  state.messages.push({ id: uid(), name, phone, subject, body, createdAt: Date.now() });
  saveState();
  $('#contact-form').reset();
  toast('پیام شما ثبت شد؛ پاسخ از طرف پذیرش باشگاه ارسال می‌شود');
});

/* ---------- احراز هویت ---------- */
$$('.auth-tab').forEach((t) => t.addEventListener('click', () => {
  $$('.auth-tab').forEach((x) => x.classList.toggle('active', x === t));
  $('#auth-player-pane').classList.toggle('hidden', t.dataset.authtab !== 'player');
  $('#auth-admin-pane').classList.toggle('hidden', t.dataset.authtab !== 'admin');
}));
let demoOtp = null;
$('#otp-send').addEventListener('click', () => {
  const p = toEn($('#otp-phone').value.trim());
  if (!/^09\d{9}$/.test(p)) return toast('شماره موبایل معتبر وارد کنید', 'error');
  demoOtp = '1234';
  toast('کد دمو ارسال شد: ۱۲۳۴');
});
$('#otp-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const p = toEn($('#otp-phone').value.trim());
  if (!/^09\d{9}$/.test(p)) return toast('شماره موبایل معتبر وارد کنید', 'error');
  if (toEn($('#otp-code').value.trim()) !== (demoOtp || '')) return toast('کد یک‌بارمصرف را با «ارسال کد دمو» بگیرید', 'error');
  loginAs('player');
});
$('#admin-login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const u = $('#admin-user').value.trim(), p = $('#admin-pass').value;
  if (u === ADMIN_CRED.user && p === ADMIN_CRED.pass) loginAs('admin');
  else toast('نام کاربری یا گذرواژه نادرست است (دمو: admin / admin123)', 'error');
});
$('#demo-player-login').addEventListener('click', () => loginAs('player'));
$('#demo-admin-login').addEventListener('click', () => loginAs('admin'));
function loginAs(role) {
  state.session = { role };
  saveState();
  renderSessionBar();
  showView(role === 'admin' ? 'admin' : 'user');
  toast(role === 'admin' ? 'به پنل مدیریت خوش آمدید' : 'به حساب بازیکن وارد شدید');
}

/* ---------- پنل بازیکن ---------- */
function userBookings() { return state.bookings.filter((b) => b.phone === SAMPLE_USER.phone); }
function isUpcoming(b) {
  const today = dateKeyOf(new Date());
  return b.dateKey > today || (b.dateKey === today && b.slotHour + 1.5 > new Date().getHours() + new Date().getMinutes() / 60);
}
function hoursUntil(b) {
  const [y, m, d] = b.dateKey.split('-').map(Number);
  return (new Date(y, m - 1, d, Math.floor(b.slotHour), b.slotHour % 1 ? 30 : 0) - new Date()) / 3600000;
}
function cancelBooking(id, by) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return;
  const free = hoursUntil(b) >= CANCEL_FREE_HOURS;
  if (by === 'player' && !free) return toast('لغو رایگان فقط تا ۶ ساعت قبل از شروع سانس ممکن است', 'error');
  b.status = 'cancelled';
  saveState();
  renderBookingView();
  if (state.session.role === 'player') renderUser();
  if (state.session.role === 'admin') renderAdmin();
  toast('رزرو لغو شد و سانس آزاد شد');
}
function bookingItemHtml(b, role) {
  const j = jalaliLabel(b.dateKey);
  const free = hoursUntil(b) >= CANCEL_FREE_HOURS;
  return `
    <div class="booking-item ${b.status === 'cancelled' ? 'cancelled' : ''}">
      <div class="bi-main">
        <strong>${COURTS[b.courtId].name}</strong>
        <p class="bi-meta num">${weekdayFa(b.dateKey)} ${j.full} — ${slotLabel(b.slotHour)} — ${money(b.amount)}</p>
        <p class="bi-code num">کد رهگیری: ${toFa(b.code)}</p>
      </div>
      <span class="status-pill ${b.status === 'confirmed' ? 'ok' : 'cancelled'}">${b.status === 'confirmed' ? 'قطعی' : 'لغو شده'}</span>
      <div class="bi-actions">
        ${b.status === 'confirmed' ? `<button type="button" class="btn btn-ghost btn-sm" data-ticket="${b.code}">بلیت دیجیتال</button>` : ''}
        ${b.status === 'confirmed' && role === 'player' ? (free
          ? `<button type="button" class="btn btn-outline-danger btn-sm" data-cancel="${b.id}">لغو رایگان</button>`
          : '<span class="muted">لغو رایگان: تا ۶ ساعت قبل</span>') : ''}
        ${b.status === 'confirmed' && role === 'admin' ? `<button type="button" class="btn btn-outline-danger btn-sm" data-cancel="${b.id}">لغو توسط مدیر</button>` : ''}
      </div>
    </div>`;
}
function bindBookingItems(root, role) {
  $$('[data-cancel]', root).forEach((b) => b.addEventListener('click', () => cancelBooking(b.dataset.cancel, role)));
  $$('[data-ticket]', root).forEach((b) => b.addEventListener('click', () => {
    $('#checkout-body').innerHTML = ticketHtml(b.dataset.ticket);
    $$('[data-close2]', $('#checkout-body')).forEach((x) =>
      x.addEventListener('click', () => $('#checkout-modal').classList.add('hidden')));
    $('#checkout-modal').classList.remove('hidden');
  }));
}

function renderUser() {
  $('#user-greeting').textContent = SAMPLE_USER.name + ' عزیز، خوش برگشتی. امتیاز فعلی: ' + toFa(SAMPLE_USER.points);
  $$('.tab[data-usertab]').forEach((t) => t.classList.toggle('active', t.dataset.usertab === ui.userTab));
  const main = $('#user-panel-main');
  const all = userBookings().sort((a, b) => (a.dateKey + a.slotHour).localeCompare(b.dateKey + b.slotHour));
  const upcoming = all.filter((b) => isUpcoming(b) && b.status === 'confirmed');
  const history = all.filter((b) => !isUpcoming(b) || b.status === 'cancelled');

  if (ui.userTab === 'overview') {
    main.innerHTML = `
      <div class="kpi-grid">
        <div class="kpi"><p class="kpi-label">رزروهای پیش‌رو</p><p class="kpi-value green">${toFa(upcoming.length)}</p></div>
        <div class="kpi"><p class="kpi-label">امتیاز باشگاه</p><p class="kpi-value gold">${toFa(SAMPLE_USER.points)}</p></div>
        <div class="kpi"><p class="kpi-label">بازی‌های ثبت‌شده</p><p class="kpi-value">${toFa(all.length)}</p></div>
        <div class="kpi"><p class="kpi-label">پلن عضویت</p><p class="kpi-value" style="font-size:1.1rem">${state.activePlan ? state.activePlan.name : 'بدون پلن'}</p></div>
      </div>
      <div class="panel-card"><h3>بلیت نزدیک‌ترین بازی</h3>${upcoming.length ? ticketHtml(upcoming[0].code) : '<p class="muted">بازی پیش‌رویی ندارید؛ از بخش رزرو سریع شروع کنید.</p>'}</div>`;
    bindBookingItems(main, 'player');
    $$('[data-close2]', main).forEach((x) => x.addEventListener('click', () => showView('booking')));
    return;
  }
  if (ui.userTab === 'upcoming' || ui.userTab === 'history') {
    const list = ui.userTab === 'upcoming' ? upcoming : history;
    main.innerHTML = `
      <h3>${ui.userTab === 'upcoming' ? 'رزروهای پیش‌رو' : 'تاریخچه بازی‌ها'}</h3>
      ${list.length ? list.map((b) => bookingItemHtml(b, 'player')).join('')
        : `<div class="fav-empty"><p>${ui.userTab === 'upcoming' ? 'رزرو پیش‌رویی ندارید.' : 'تاریخچه‌ای ثبت نشده.'}</p><button type="button" class="btn btn-accent" data-nav="booking">رزرو سانس جدید</button></div>`}`;
    bindBookingItems(main, 'player');
    return;
  }
  if (ui.userTab === 'plan') {
    main.innerHTML = `
      <h3>پلن عضویت فعال</h3>
      ${state.activePlan ? `
        <div class="panel-card">
          <h4>${state.activePlan.name}</h4>
          <p class="muted">تخفیف ${toFa(state.activePlan.discount)}٪ روی رزروهای آنلاین با موبایل ${toFa(state.activePlan.phone)}</p>
          <p class="plan-active-pill">✓ فعال</p>
        </div>` : `
        <div class="fav-empty">
          <p>پلن فعالی ندارید. با یک پلن ماهانه، هر سانس ارزان‌تر تمام می‌شود.</p>
          <button type="button" class="btn btn-accent" data-nav="plans">مشاهده پلن‌ها</button>
        </div>`}`;
    return;
  }
  if (ui.userTab === 'fav') {
    main.innerHTML = '<h3>علاقه‌مندی‌ها</h3>' + '<div id="user-fav-inner"></div>';
    const f = state.favorites;
    $('#user-fav-inner').innerHTML = f.courts.length
      ? '<div class="fav-group"><h4>زمین‌ها</h4><div class="court-grid">' + f.courts.map((i) => `<div class="court-card"><h4>${COURTS[i].name}</h4><p class="court-price num">${money(state.settings.prices[i])}</p></div>`).join('') + '</div></div>'
      : '<div class="fav-empty"><p>لیست علاقه‌مندی‌ها خالی است.</p><button type="button" class="btn btn-accent" data-nav="favorites">رفتن به صفحه علاقه‌مندی‌ها</button></div>';
    return;
  }
  if (ui.userTab === 'profile') {
    main.innerHTML = `
      <h3>اطلاعات پروفایل</h3>
      <form class="form-grid" id="profile-form">
        <label>نام و نام خانوادگی<input type="text" class="input" value="${esc(SAMPLE_USER.name)}" /></label>
        <label>موبایل<input type="tel" class="input" value="${SAMPLE_USER.phone}" disabled /></label>
        <p class="muted span-2">در این دمو، اطلاعات بازیکن نمونه ثابت است و تغییرات فقط ظاهری ذخیره می‌شوند.</p>
        <button class="btn btn-accent" type="submit">ذخیره تغییرات</button>
      </form>`;
    $('#profile-form').addEventListener('submit', (e) => { e.preventDefault(); toast('تغییرات پروفایل ذخیره شد'); });
  }
}
$$('.tab[data-usertab]').forEach((t) =>
  t.addEventListener('click', () => { ui.userTab = t.dataset.usertab; renderUser(); }));

/* ---------- پنل مدیریت ---------- */
function renderAdmin() {
  renderKpis();
  renderAdminChart();
  renderAdminTable();
  renderBlockManager();
  renderPricingForm();
  renderInbox();
}
function renderKpis() {
  const today = dateKeyOf(new Date());
  const todayBookings = state.bookings.filter((b) => b.dateKey === today && b.status === 'confirmed');
  const weekRev = state.bookings.filter((b) => b.status === 'confirmed' && weekKeys().includes(b.dateKey))
    .reduce((s, b) => s + b.amount, 0);
  const slotsPerCourt = SLOT_HOURS.length * weekKeys().length;
  const occ = Math.round(state.bookings.filter((b) => b.status === 'confirmed' && weekKeys().includes(b.dateKey)).length / (slotsPerCourt * 3) * 100);
  const counts = [0, 0, 0];
  state.bookings.filter((b) => b.status === 'confirmed').forEach((b) => counts[b.courtId]++);
  const popular = counts.indexOf(Math.max(...counts));
  $('#kpi-grid').innerHTML = `
    <div class="kpi"><p class="kpi-label">رزروهای امروز</p><p class="kpi-value green">${toFa(todayBookings.length)}</p></div>
    <div class="kpi"><p class="kpi-label">درآمد هفته</p><p class="kpi-value gold">${money(weekRev)}</p></div>
    <div class="kpi"><p class="kpi-label">اشغال زمین‌ها (هفته)</p><p class="kpi-value">${toFa(occ)}٪</p><div class="occ-bar"><div class="occ-fill" style="width:${Math.min(occ, 100)}%"></div></div></div>
    <div class="kpi"><p class="kpi-label">زمین محبوب</p><p class="kpi-value" style="font-size:1.15rem">${COURTS[popular].short}</p></div>`;
}
function renderAdminChart() {
  const W = 560, H = 240, pad = 34;
  const wk = weekKeys();
  const dayTotals = wk.map((k) => COURTS.map((_, ci) =>
    state.bookings.filter((b) => b.dateKey === k && b.courtId === ci && b.status === 'confirmed').length));
  const max = Math.max(1, ...dayTotals.flat());
  const colors = ['#059669', '#4FA8E0', '#1D4ED8'];
  const barW = 14, groupW = (W - pad * 2) / 7;
  let svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" dir="ltr">`;
  for (let g = 0; g <= 4; g++) {
    const y = H - pad - (g / 4) * (H - pad - 20);
    svg += `<line x1="${pad}" y1="${y}" x2="${W - pad / 2}" y2="${y}" stroke="#C6D3E0" stroke-width="1"/><text x="${W - pad / 2 + 4}" y="${y + 4}" font-size="10" fill="#5B6B7C">${toFa(Math.round(max * g / 4))}</text>`;
  }
  wk.forEach((k, di) => {
    const gx = W - pad - (di + 1) * groupW;
    dayTotals[di].forEach((v, ci) => {
      const h = (v / max) * (H - pad - 20);
      svg += `<rect x="${gx + groupW / 2 - barW * 1.6 + ci * barW}" y="${H - pad - h}" width="${barW - 4}" height="${Math.max(h, v ? 3 : 0)}" rx="3" fill="${colors[ci]}"><title>${COURTS[ci].short}: ${toFa(v)}</title></rect>`;
    });
    svg += `<text x="${gx + groupW / 2}" y="${H - 12}" font-size="10" fill="#5B6B7C" text-anchor="middle">${jalaliLabel(k).short}</text>`;
  });
  COURTS.forEach((c, ci) => {
    svg += `<rect x="${pad + ci * 110}" y="6" width="10" height="10" rx="2" fill="${colors[ci]}"/><text x="${pad + ci * 110 + 16}" y="15" font-size="10" fill="#0F172A">${c.short}</text>`;
  });
  $('#admin-chart').innerHTML = svg + '</svg>';
}
function renderAdminTable() {
  const fc = $('#filter-court').value || 'all', fs = $('#filter-status').value;
  const raw = $('#filter-search').value.trim();
  const q = toEn(raw);
  const rows = state.bookings
    .filter((b) => (fc === 'all' || b.courtId === +fc) && (fs === 'all' || b.status === fs))
    .filter((b) => !q || b.name.includes(raw) || b.phone.includes(q) || b.code.includes(q))
    .sort((a, b) => (b.dateKey + b.slotHour).localeCompare(a.dateKey + a.slotHour));
  $('#admin-tbody').innerHTML = rows.length ? rows.map((b) => {
    const j = jalaliLabel(b.dateKey);
    return `<tr>
      <td class="num">${toFa(b.code)}</td>
      <td>${esc(b.name)}<br/><span class="muted num">${toFa(b.phone)}</span></td>
      <td>${COURTS[b.courtId].short}</td>
      <td>${weekdayFa(b.dateKey)} ${j.short}</td>
      <td class="num">${slotLabel(b.slotHour)}</td>
      <td class="num">${money(b.amount)}${b.racket ? ' + راکت' : ''}</td>
      <td><span class="status-pill ${b.status === 'confirmed' ? 'ok' : 'cancelled'}">${b.status === 'confirmed' ? 'قطعی' : 'لغو شده'}</span></td>
      <td>${b.status === 'confirmed' ? `<button type="button" class="btn btn-outline-danger btn-sm" data-acancel="${b.id}">لغو توسط مدیر</button>` : '—'}</td>
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
  [['#block-slot'], ['#manual-slot']].forEach(([slotSel]) => {
    $(slotSel).innerHTML = SLOT_HOURS.map((h) => `<option value="${h}">${slotLabel(h)}</option>`).join('');
  });
  $('#filter-court').innerHTML = '<option value="all">همه زمین‌ها</option>' + COURTS.map((c, i) => `<option value="${i}">${c.name}</option>`).join('');
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
  renderBookingView();
  toast('سانس مسدود شد');
});
function renderBlockManager() {
  const list = $('#block-list');
  list.innerHTML = state.blocks.length ? state.blocks.map((b) => {
    const j = jalaliLabel(b.dateKey);
    return `<li><span>${COURTS[b.courtId].short} — ${weekdayFa(b.dateKey)} ${j.short} — <span class="num">${slotLabel(b.slotHour)}</span> — ${esc(b.reason)}</span>
      <button type="button" class="btn btn-ghost btn-sm" data-unblock="${b.id}">رفع مسدودی</button></li>`;
  }).join('') : '<li>سانس مسدودی وجود ندارد.</li>';
  $$('[data-unblock]').forEach((b) => b.addEventListener('click', () => {
    state.blocks = state.blocks.filter((x) => x.id !== b.dataset.unblock);
    saveState(); renderAdmin(); renderBookingView();
    toast('مسدودی سانس رفع شد');
  }));
}

/* تعرفه‌ها */
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

/* صندوق پیام‌ها */
function renderInbox() {
  const box = $('#inbox-list');
  if (!state.messages.length) { box.innerHTML = '<p class="muted">پیامی دریافت نشده است.</p>'; return; }
  box.innerHTML = state.messages.slice().reverse().map((m) => {
    const d = new Date(m.createdAt);
    return `<div class="inbox-item">
      <strong>${esc(m.subject)}</strong> — ${esc(m.name)} <span class="muted num">(${toFa(m.phone)})</span>
      <p class="muted" style="margin:4px 0 0">${esc(m.body)}</p>
      <p class="muted" style="margin:4px 0 0;font-size:.78rem">${toFa(d.toLocaleDateString('fa-IR'))}</p>
    </div>`;
  }).join('');
}

/* ---------- بستن مودال‌ها ---------- */
$$('.modal-overlay').forEach((ov) => {
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.classList.add('hidden'); });
  $$('[data-close]', ov).forEach((b) => b.addEventListener('click', () => ov.classList.add('hidden')));
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $$('.modal-overlay:not(.hidden)').forEach((m) => m.classList.add('hidden'));
});

/* ---------- بازنشانی دمو ---------- */
$('#view-home'); // noop guard
async function resetDemo() {
  const ok = await confirmBox('بازنشانی داده‌های دمو', 'تمام رزروها، سفارش‌ها، پلن فعال و تنظیمات به حالت اولیه برمی‌گردند. مطمئن هستید؟', 'بازنشانی');
  if (!ok) return;
  resetState();
  renderSessionBar();
  renderFavBadge();
  renderAll();
  toast('داده‌های دمو بازنشانی شد');
}

/* ---------- فوتر ---------- */
function buildFooter() {
  const foot = document.createElement('footer');
  foot.className = 'site-footer';
  foot.innerHTML = `
    <div class="footer-inner">
      <div>
        <h4>${CLUB.name}</h4>
        <p class="muted">سه زمین استاندارد FIP در قائم‌شهر با رزرو آنلاین ۹۰ دقیقه‌ای، بلیت دیجیتال و پنل مدیریت باشگاه. این یک دموی نمایشی است؛ داده‌ها فقط در مرورگر شما ذخیره می‌شوند.</p>
        <p class="footer-legal">© ${toFa(new Date().getFullYear())} ${CLUB.name} — دموی آموزشی</p>
      </div>
      <div>
        <h4>دسترسی سریع</h4>
        <ul class="footer-links">
          <li><button type="button" data-nav="about">درباره ما</button></li>
          <li><button type="button" data-nav="blog">وبلاگ</button></li>
          <li><button type="button" data-nav="favorites">علاقه‌مندی‌ها</button></li>
          <li><button type="button" data-nav="account">حساب کاربری</button></li>
          <li><button type="button" data-nav="plans">پلن‌های عضویت</button></li>
          <li><button type="button" data-nav="map">نقشه</button></li>
          <li><button type="button" data-nav="contact">تماس با ما</button></li>
        </ul>
      </div>
      <div>
        <h4>تماس با ما</h4>
        <ul class="plain-list">
          <li><span>${CLUB.addr}</span></li>
          <li><span>پذیرش: ${CLUB.phone}</span></li>
          <li><span>ساعت کاری: ${CLUB.hours}</span></li>
          <li><button type="button" class="btn btn-ghost btn-sm" id="reset-demo-btn">بازنشانی داده‌های دمو</button></li>
        </ul>
      </div>
    </div>`;
  document.body.appendChild(foot);
  $('#reset-demo-btn').addEventListener('click', resetDemo);
}

/* ---------- شروع ---------- */
function renderAll() {
  fillProvinceSelects();
  renderBookingView();
  renderBlogTeaser();
  renderFavBadge();
  renderSessionBar();
  renderContactInfo();
  renderMap();
  showView('home');
}
loadState();
fillSelects();
buildFooter();
renderAll();
