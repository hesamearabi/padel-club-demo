/* ═══ کیوسک کلاب — منطق اپلیکیشن (Vanilla JS) ═══ */
"use strict";

/* ─── helpers ─── */
const FA = "۰۱۲۳۴۵۶۷۸۹";
const toFa = (v) => String(v).replace(/\d/g, (d) => FA[d]);
const toEn = (v) => String(v).replace(/[۰-۹]/g, (d) => FA.indexOf(d));
const money = (n) => toFa(n.toLocaleString("en-US")) + " تومان";
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };

const WD = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];
const JM = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function toJalali(gy, gm, gd) {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
    + Math.floor((gy2 + 399) / 400) - 80 + g_d_m[gm - 1] + gd;
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}
const jStr = (d) => { const j = toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return `${toFa(j.jd)} ${JM[j.jm - 1]}`; };
const jParts = (d) => toJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());

/* ─── slots ─── */
const SLOT_STARTS = [540, 630, 720, 810, 900, 990, 1080, 1170, 1260, 1350]; // 09:00 … 22:30 (90 دقیقه)
const fmtMin = (m) => `${toFa(pad(Math.floor(m / 60)))}:${toFa(pad(m % 60))}`;
const slotLabel = (s) => `${fmtMin(s)} - ${fmtMin(s + 90)}`;
const windowOf = (s) => (s < 900 ? "morning" : s < 1080 ? "afternoon" : "night");
const isMorning = (s) => s < 900; // تخفیف برای سانس‌های ۰۹:۰۰ تا ۱۵:۰۰

/* ─── state ─── */
const STORE_NAME = "kioskClub.v3";
const todayISO = () => iso(new Date());
const weekISOs = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return iso(d); });

function seed() {
  const courts = [
    { id: "c1", name: "زمین ۱: فول پانوراما روباز", desc: "شیشه سکوریت ۱۲ میل بدون ستون مزاحم، چمن مصنوعی آبی FIP، نورپردازی LED", price: 420000, rating: "۴.۹" },
    { id: "c2", name: "زمین ۲: استاندارد سرپوشیده", desc: "سقف بلند ۱۰ متری، تهویه مطبوع چهارفصل، نورپردازی ضدخیرگی", price: 500000, rating: "۴.۷" },
    { id: "c3", name: "زمین ۳: زمین VIP مرکزی", desc: "جایگاه تماشاگر، رختکن و دوش اختصاصی، کفپوش حرفه‌ای", price: 600000, rating: "۵.۰" },
  ];
  const t = todayISO();
  const bookings = [
    { id: "b1", courtId: "c1", date: t, slot: 1080, name: "حسام عربی", phone: "09111234567", channel: "online", racket: false, price: 420000, status: "active" },
    { id: "b2", courtId: "c1", date: t, slot: 1170, name: "سارا کیانی", phone: "09121234567", channel: "online", racket: true, price: 500000, status: "active" },
    { id: "b3", courtId: "c2", date: t, slot: 900, name: "رضا مرادی", phone: "09131234567", channel: "walkin", racket: false, price: 400000, status: "active" },
    { id: "b4", courtId: "c3", date: t, slot: 1260, name: "امیر رضایی", phone: "09141234567", channel: "online", racket: true, price: 680000, status: "active" },
    { id: "b5", courtId: "c1", date: t, slot: 720, name: "مینا شریفی", phone: "09151234567", channel: "online", racket: false, price: 336000, status: "active" },
  ];
  const blocked = [{ courtId: "c2", date: t, slot: 1350, reason: "نگهداری دوره‌ای نور" }];
  return {
    courts, discountRate: 0.2,
    bookings, blocked,
    favorites: ["c1"],
    plans: [
      { id: "p1", name: "پلن برنزی", price: 1200000, perks: ["۴ سانس ماهانه در زمین ۱", "اجاره راکت رایگان", "۵٪ تخفیف کافه"] },
      { id: "p2", name: "پلن نقره‌ای", price: 2400000, perks: ["۹ سانس ماهانه در همه زمین‌ها", "اولویت رزرو سانس شب", "۱۰٪ تخفیف کافه", "یک جلسه تاکتیک خصوصی"] },
      { id: "p3", name: "پلن طلایی VIP", price: 4200000, perks: ["سانس نامحدود در همه زمین‌ها", "رزرو تا ۲ هفته جلوتر", "رختکن و دوش اختصاصی", "۲۰٪ تخفیف کافه", "دو جلسه تمرین خصوصی"] },
    ],
    activePlan: null,
    messages: [
      { id: "m1", name: "نیلوفر احمدی", phone: "09191234567", msg: "برای شنبه کلاس خصوصی دارید؟", at: Date.now() - 86400000, read: false },
    ],
    session: null,
  };
}
let state;
function load() {
  try { state = JSON.parse(localStorage.getItem(STORE_NAME)) || seed(); } catch { state = seed(); }
}
function save() { localStorage.setItem(STORE_NAME, JSON.stringify(state)); }
load();
save();

const courtById = (id) => state.courts.find((c) => c.id === id);
const slotPrice = (courtId, start) => {
  const p = courtById(courtId).price;
  return isMorning(start) ? Math.round(p * (1 - state.discountRate)) : p;
};
const isTaken = (courtId, date, slot) => state.bookings.some((b) => b.courtId === courtId && b.date === date && b.slot === slot && b.status === "active");
const isBlocked = (courtId, date, slot) => state.blocked.some((b) => b.courtId === courtId && b.date === date && b.slot === slot);
const freeCount = (courtId, date) => SLOT_STARTS.filter((s) => !isTaken(courtId, date, s) && !isBlocked(courtId, date, s)).length;

/* ─── router ─── */
const VIEWS = ["home", "blog", "plans", "favorites", "map", "about", "contact", "auth", "player", "admin"];
let currentView = "home";
let pendingAuthView = "player";
let pendingPlansNav = false;
function show(view) {
  if (!VIEWS.includes(view)) view = "home";
  if ((view === "player" || view === "admin") && !state.session) { pendingAuthView = view; view = "auth"; }
  if (view === "admin" && state.session && state.session.role !== "admin") view = "auth";
  currentView = view;
  VIEWS.forEach((v) => { $(`#view-${v}`).hidden = v !== view; });
  document.querySelectorAll(".drawer-nav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === view));
  if (view === "home") renderBooking();
  if (view === "blog") renderBlog();
  if (view === "plans") renderPlans();
  if (view === "favorites") renderFavorites();
  if (view === "player") renderPlayer();
  if (view === "admin") renderAdmin();
  if (view === "auth") syncAuthView();
  updateAuthUI();
  window.scrollTo({ top: 0 });
}
document.addEventListener("click", (e) => {
  const nav = e.target.closest("[data-nav]");
  if (nav) { e.preventDefault(); closeDrawer(); show(nav.dataset.nav); }
});

/* ─── header / drawer ─── */
const drawer = $("#nav-drawer"), backdrop = $("#drawer-backdrop"), menuBtn = $("#menu-toggle");
function openDrawer() { drawer.classList.add("open"); backdrop.hidden = false; drawer.setAttribute("aria-hidden", "false"); menuBtn.setAttribute("aria-expanded", "true"); }
function closeDrawer() { drawer.classList.remove("open"); backdrop.hidden = true; drawer.setAttribute("aria-hidden", "true"); menuBtn.setAttribute("aria-expanded", "false"); }
menuBtn.addEventListener("click", () => (drawer.classList.contains("open") ? closeDrawer() : openDrawer()));
$("#drawer-close").addEventListener("click", closeDrawer);
backdrop.addEventListener("click", closeDrawer);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeDrawer(); closeModal(); } });

$("#fav-btn").addEventListener("click", () => show("favorites"));
$("#auth-btn").addEventListener("click", () => show(state.session ? (state.session.role === "admin" ? "admin" : "player") : "auth"));

document.querySelectorAll(".seg-btn[data-role]").forEach((b) =>
  b.addEventListener("click", () => {
    const r = b.dataset.role;
    if (r === "guest") { state.session = null; save(); closeDrawer(); show("home"); }
    else login(r === "admin" ? "admin" : "player", r === "admin" ? "مدیر باشگاه" : "حسام عربی", "09111234567");
  }));

$("#reset-demo").addEventListener("click", resetDemo);
$("#footer-reset").addEventListener("click", resetDemo);
function resetDemo() {
  if (!confirm("همه داده‌های دمو به حالت اولیه برمی‌گردد. ادامه می‌دهید؟")) return;
  const session = state.session;
  state = seed(); state.session = session; save();
  closeDrawer(); closeModal();
  renderHeroConsole(); renderBooking();
  show("home");
}
function updateAuthUI() {
  $("#auth-btn").textContent = state.session ? state.session.name.split(" ")[0] : "ورود / ثبت‌نام";
  const role = state.session ? state.session.role : "guest";
  document.querySelectorAll(".seg-btn[data-role]").forEach((b) => b.classList.toggle("active", b.dataset.role === role));
}

/* ─── favorites ─── */
function toggleFav(id) {
  const i = state.favorites.indexOf(id);
  if (i >= 0) state.favorites.splice(i, 1); else state.favorites.push(id);
  save(); syncFavBadge();
  if (currentView === "home") renderBooking();
  if (currentView === "favorites") renderFavorites();
  if (currentView === "player") renderPlayer();
}
function syncFavBadge() {
  const b = $("#fav-badge");
  b.hidden = state.favorites.length === 0;
  b.textContent = toFa(state.favorites.length);
}

/* ─── hero console ─── */
const filters = { court: "all", date: todayISO(), window: "all" };
function renderHeroConsole() {
  const courtSel = $("#hc-court");
  courtSel.innerHTML = `<option value="all">همه زمین‌ها</option>` +
    state.courts.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("");
  courtSel.value = filters.court;
  $("#hc-date").innerHTML = weekISOs().map((d) => {
    const dt = fromISO(d);
    return `<option value="${d}">${d === todayISO() ? "امروز — " : ""}${WD[dt.getDay()]} ${jStr(dt)}</option>`;
  }).join("");
  $("#hc-date").value = filters.date;
  $("#hc-window").value = filters.window;
}
$("#hc-court").addEventListener("change", (e) => { filters.court = e.target.value; renderBooking(); });
$("#hc-date").addEventListener("change", (e) => { filters.date = e.target.value; renderBooking(); });
$("#hc-window").addEventListener("change", (e) => { filters.window = e.target.value; renderBooking(); });
$("#hero-console").addEventListener("submit", (e) => {
  e.preventDefault();
  renderBooking();
  document.getElementById("booking-steps").scrollIntoView({ behavior: "smooth", block: "start" });
});

/* ─── booking steps ─── */
let cart = []; // [{courtId, date, slot}]
function selectedCourt() { return filters.court === "all" ? "c1" : filters.court; }

function renderBooking() {
  const sel = selectedCourt();
  $("#courts-grid").innerHTML = state.courts.map((c) => {
    const on = c.id === sel && filters.court !== "all";
    return `<article class="court-card ${on ? "selected" : ""}" aria-label="${esc(c.name)}">
      <div class="court-head">
        <div>
          <h3>${esc(c.name)}</h3>
          <p class="court-meta">${esc(c.desc)}</p>
        </div>
        <button class="fav-toggle" aria-pressed="${state.favorites.includes(c.id)}" aria-label="افزودن ${esc(c.name)} به علاقه‌مندی‌ها" data-fav="${c.id}">
          <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20.5 4.6 13a4.9 4.9 0 0 1 0-7 4.8 4.8 0 0 1 6.9 0l.5.5.5-.5a4.8 4.8 0 0 1 6.9 0 4.9 4.9 0 0 1 0 7Z"/></svg>
        </button>
      </div>
      <div class="court-stats">
        <span class="court-price">${money(c.price)} / ۹۰ دقیقه</span>
        <span class="court-rating">★ ${c.rating}</span>
      </div>
      <button class="court-select" data-court="${c.id}">${on ? "زمین انتخاب شده" : "انتخاب زمین"}</button>
    </article>`;
  }).join("");

  const days = weekISOs();
  $("#days-strip").innerHTML = days.map((d) => {
    const dt = fromISO(d);
    const free = filters.court === "all"
      ? SLOT_STARTS.filter((s) => state.courts.some((c) => !isTaken(c.id, d, s) && !isBlocked(c.id, d, s))).length
      : freeCount(filters.court, d);
    return `<button class="day-card ${d === filters.date ? "selected" : ""}" role="option" aria-selected="${d === filters.date}" data-day="${d}">
      <span class="weekday">${d === todayISO() ? "امروز" : WD[dt.getDay()]}</span>
      <span class="jdate">${jStr(dt)}</span>
      <span class="free-pill ${free === 0 ? "full" : ""}">${free === 0 ? "تکمیل" : `${toFa(free)} سانس آزاد`}</span>
    </button>`;
  }).join("");

  const wf = [["all", "همه سانس‌ها"], ["morning", "صبح و ظهر — ۲۰٪ تخفیف"], ["afternoon", "عصر"], ["night", "شب"]];
  $("#time-filters").innerHTML = wf.map(([v, l]) =>
    `<button class="filter-pill" aria-pressed="${filters.window === v}" data-window="${v}">${l}</button>`).join("");

  renderSlots();
  renderCart();
  syncFavBadge();
}

$("#booking-steps").addEventListener("click", (e) => {
  const fav = e.target.closest("[data-fav]");
  if (fav) { toggleFav(fav.dataset.fav); return; }
  const court = e.target.closest("[data-court]");
  if (court) { filters.court = court.dataset.court; renderHeroConsole(); renderBooking(); return; }
  const day = e.target.closest("[data-day]");
  if (day) { filters.date = day.dataset.day; renderHeroConsole(); renderBooking(); return; }
  const pill = e.target.closest("[data-window]");
  if (pill) { filters.window = pill.dataset.window; renderBooking(); return; }
  const slot = e.target.closest("[data-slot]");
  if (slot) {
    const { courtId, date, start } = slot.dataset;
    const key = (x) => `${x.courtId}|${x.date}|${x.slot}`;
    const item = { courtId, date, slot: Number(start) };
    const i = cart.findIndex((c) => key(c) === key(item));
    if (i >= 0) cart.splice(i, 1);
    else if (cart.length >= 3) alert("حداکثر ۳ سانس می‌توانید همزمان انتخاب کنید.");
    else cart.push(item);
    renderBooking();
  }
});

function renderSlots() {
  const courtId = selectedCourt();
  const d = filters.date;
  const visible = SLOT_STARTS.filter((s) => filters.window === "all" || windowOf(s) === filters.window);
  if (visible.length === 0) {
    $("#slots-panel").innerHTML = `<p class="empty-note">سانسی در این بازه نیست — بازه دیگری را انتخاب کنید.</p>`;
    return;
  }
  $("#slots-panel").innerHTML = visible.map((s) => {
    const taken = isTaken(courtId, d, s), blocked = isBlocked(courtId, d, s);
    const selected = cart.some((c) => c.courtId === courtId && c.date === d && c.slot === s);
    if (blocked) {
      const r = state.blocked.find((b) => b.courtId === courtId && b.date === d && b.slot === s);
      return `<button class="slot-card blocked" disabled><span class="time">${slotLabel(s)}</span><span class="state">مسدود${r ? " — " + esc(r.reason) : ""}</span></button>`;
    }
    if (taken) return `<button class="slot-card taken" disabled><span class="time">${slotLabel(s)}</span><span class="state">رزرو شده</span></button>`;
    return `<button class="slot-card ${selected ? "selected" : ""}" data-slot data-court-id="${courtId}" data-date="${d}" data-start="${s}" aria-pressed="${selected}">
      ${isMorning(s) ? `<span class="tag">تخفیف صبح</span>` : `<span class="tag" style="visibility:hidden">—</span>`}
      <span class="time">${slotLabel(s)}</span>
      <span class="price">${money(slotPrice(courtId, s))}</span>
      <span class="state" style="color:var(--ball-text)">آزاد</span>
    </button>`;
  }).join("");
}

/* ─── cart bar ─── */
function renderCart() {
  const bar = $("#cart-bar");
  if (cart.length === 0) { bar.hidden = true; return; }
  const gross = cart.reduce((t, c) => t + courtById(c.courtId).price, 0);
  const net = cart.reduce((t, c) => t + slotPrice(c.courtId, c.slot), 0);
  const saved = gross - net;
  bar.hidden = false;
  bar.innerHTML = `<div class="cart-row">
    <div class="cart-chips">
      ${cart.map((c, i) => `<button class="cart-chip" data-rm="${i}" aria-label="حذف سانس"><span class="time">${slotLabel(c.slot)}</span> — ${esc(courtById(c.courtId).name.split(":")[0].trim())} <span class="x">×</span></button>`).join("")}
    </div>
    <div class="cart-sum">
      ${saved > 0 ? `<s>${money(gross)}</s> ` : ""}<strong>${money(net)}</strong>${saved > 0 ? ` <span style="color:var(--ball-700)">(صرفه‌جویی ${money(saved)})</span>` : ""}
    </div>
    <button class="btn-primary" id="checkout-btn">ادامه و ثبت رزرو</button>
  </div>`;
  bar.querySelectorAll("[data-rm]").forEach((b) => b.addEventListener("click", () => { cart.splice(Number(b.dataset.rm), 1); renderBooking(); }));
  $("#checkout-btn").addEventListener("click", openCheckout);
}

/* ─── modal ─── */
const modalRoot = $("#modal-root"), modalCard = $("#modal-card");
function openModal(html) {
  modalCard.innerHTML = `<button class="icon-btn modal-close" data-modal-close aria-label="بستن"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>` + html;
  modalRoot.hidden = false;
  modalCard.querySelectorAll("[data-modal-close]").forEach((b) => b.addEventListener("click", closeModal));
  const f = modalCard.querySelector("input,select,button:not(.modal-close)");
  if (f) f.focus();
}
function closeModal() { modalRoot.hidden = true; modalCard.innerHTML = ""; }

/* ─── checkout + ticket ─── */
function openCheckout() {
  const sess = state.session;
  openModal(`<h2>تکمیل رزرو</h2>
    <div class="checkout-lines">
      ${cart.map((c) => `<div><span>${esc(courtById(c.courtId).name)} — <span class="time" dir="ltr">${slotLabel(c.slot)}</span>، ${jStr(fromISO(c.date))}</span><span>${money(slotPrice(c.courtId, c.slot))}</span></div>`).join("")}
      <div class="discount">تخفیف صبح: ${money(cart.reduce((t, c) => t + courtById(c.courtId).price - slotPrice(c.courtId, c.slot), 0))}</div>
    </div>
    <label class="addon"><input type="checkbox" id="rental-racket"> اجاره ست راکت و توپ (+${money(80000)})</label>
    <div class="inline-form">
      <div class="fr"><label for="co-name">نام بازیکن</label><input id="co-name" value="${sess ? esc(sess.name) : ""}"></div>
      <div class="fr"><label for="co-phone">شماره موبایل</label><input id="co-phone" inputmode="tel" value="${sess ? esc(sess.phone) : ""}"></div>
    </div>
    <p class="form-error" id="co-error" hidden></p>
    <button class="btn-primary" id="pay-btn" style="width:100%;margin-top:12px">پرداخت و صدور بلیت</button>`);
  $("#pay-btn").addEventListener("click", () => {
    const name = $("#co-name").value.trim(), phone = $("#co-phone").value.trim();
    const err = $("#co-error");
    if (!name || !/^0\d{10}$/.test(phone)) {
      err.hidden = false; err.textContent = "نام و شماره موبایل ۱۱ رقمی (با ۰) را کامل وارد کنید.";
      return;
    }
    const rental = $("#rental-racket").checked;
    const made = cart.map((c, i) => ({
      id: "b" + Date.now() + i,
      courtId: c.courtId, date: c.date, slot: c.slot,
      name, phone, channel: "online", racket: rental,
      price: slotPrice(c.courtId, c.slot) + (rental ? 80000 : 0),
      status: "active",
    }));
    made.forEach((b) => state.bookings.push(b));
    save();
    cart = [];
    renderBooking();
    openTicket(made[0], made.length);
  });
}
function openTicket(b, count = 1) {
  const code = `KC-${b.date.replace(/-/g, "")}-${b.courtId.toUpperCase()}-${b.slot}`;
  openModal(`<div class="ticket">
    <h2>بلیت دیجیتال کیوسک کلاب</h2>
    <p>${esc(b.name)} — ${esc(courtById(b.courtId).name)}</p>
    <p class="time" dir="ltr">${slotLabel(b.slot)}</p>
    <p>${jStr(fromISO(b.date))}${count > 1 ? ` (+${toFa(count - 1)} سانس دیگر)` : ""}${b.racket ? " — با اجاره راکت و توپ" : ""}</p>
    ${qrSVG(code)}
    <p class="ticket-code" dir="ltr">${code}</p>
    <p style="font-size:.85rem;color:var(--ink-2)">ورود فقط با نمایش این بلیت در پذیرش — ۱۵ دقیقه قبل از سانس حاضر باشید.</p>
    <button class="btn-primary" data-modal-close style="width:100%;margin-top:12px">باشه، ممنون</button>
  </div>`);
}
function qrSVG(seedStr) {
  let h = 0;
  for (const ch of seedStr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (h * 1103515245 + 12345) >>> 0; return h / 4294967295; };
  const n = 21; let cells = "";
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const finder = (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    if (finder) {
      const lx = x >= n - 7 ? x - (n - 7) : x, ly = y >= n - 7 ? y - (n - 7) : y;
      const ring = lx === 0 || lx === 6 || ly === 0 || ly === 6 || (lx >= 2 && lx <= 4 && ly >= 2 && ly <= 4);
      if (ring) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    } else if (rnd() < 0.45) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  }
  return `<svg class="qr" width="160" height="160" viewBox="-1 -1 ${n + 2} ${n + 2}" role="img" aria-label="کد QR بلیت"><rect x="-1" y="-1" width="${n + 2}" height="${n + 2}" fill="#fff"/><g fill="#0F172A">${cells}</g></svg>`;
}

/* ─── blog ─── */
const ARTICLES = [
  { id: "a1", cat: "آموزش", title: "اولین بازی پدل: سه اشتباهی که تازه‌کارها می‌کنند", at: "۴ آذر ۱۴۰۵", body: "پدل بازی دیواری است، نه بازی قدرتی. تازه‌کارها توپ را زودتر از وقت به شیشه می‌کوبند؛ در پدل ضربه بعد از قوس دیوار است. اول صبر کنید، بعد بزنید.\nدوم: از سرویس زیر دست استفاده کنید. سرویس تنیسی خطا است و امتیاز می‌دهد.\nسوم: بدون توپ جای خود را عوض کنید. زمین کوچک است، دو نفر باید مثل یک واحد جابه‌جا شوند." },
  { id: "a2", cat: "تاکتیک", title: "بازی شبکه در پدل دونفره: کی بالا برود، کی پایین بماند", at: "۲۸ آبان ۱۴۰۵", body: "قانون ساده: بعد از لوپ، هر دو به شبکه بروید. شبکه در پدل ۷۰ درصد امتیازها را می‌برد. اگر حریف توپ را به پایین زد، عقب بمانید و بندخن را نگه دارید.\nجابه‌جایی موازی به موازی و دیاگونال به دیاگونال — هرگز عکس آن." },
  { id: "a3", cat: "آموزش", title: "انتخاب راکت پدل بر اساس سطح بازی", at: "۱۹ آبان ۱۴۰۵", body: "شکل راکت گرد برای تازه‌کار، اشک قطره‌ای برای متوسط و الماسی برای حرفه‌ای است. تعادل پایین یعنی قدرت بیشتر و کنترل کمتر.\nبرای شروع وزن ۳۵۵ تا ۳۶۰ گرم و هسته فوم نرم بهترین انتخاب است." },
  { id: "a4", cat: "اخبار باشگاه", title: "چراغ‌های LED زمین ۱ ارتقا یافت", at: "۱۰ آبان ۱۴۰۵", body: "نورپردازی زمین فول پانوراما به LED ضدخیرگی ۳۰۰ لوکس ارتقا یافت. تفاوت را در سانس‌های شب احساس می‌کنید — سایه کمتر، دید بهتر، مصرف برق ۴۰ درصد کمتر." },
  { id: "a5", cat: "اخبار باشگاه", title: "لیگ داخلی کیوسک کلاب از دی ماه آغاز می‌شود", at: "۱ آبان ۱۴۰۵", body: "لیگ دونفره کیوسک کلاب برای اعضای نقره‌ای و طلایی، شش هفته، هر جمعه ساعت ۱۸. ثبت‌نام در پذیرش باشگاه — ظرفیت ۲۴ تیم." },
];
let blogCat = "همه مطالب";
function renderBlog() {
  const cats = ["همه مطالب", "آموزش", "تاکتیک", "اخبار باشگاه"];
  $("#blog-tabs").innerHTML = cats.map((c) => `<button class="filter-pill" aria-pressed="${blogCat === c}" data-cat="${c}">${c}</button>`).join("");
  const list = ARTICLES.filter((a) => blogCat === "همه مطالب" || a.cat === blogCat);
  $("#blog-list").innerHTML = list.map((a) => `<article class="article-card">
    <p class="article-meta">${a.cat} — ${a.at}</p>
    <h2><a href="#" data-article="${a.id}">${esc(a.title)}</a></h2>
    <p>${esc(a.body.split("\n")[0].slice(0, 120))}…</p>
  </article>`).join("") || `<p class="empty-note">مطلبی در این دسته نیست.</p>`;
}
$("#view-blog").addEventListener("click", (e) => {
  const pill = e.target.closest("[data-cat]");
  if (pill) { blogCat = pill.dataset.cat; renderBlog(); return; }
  const a = e.target.closest("[data-article]");
  if (a) {
    e.preventDefault();
    const art = ARTICLES.find((x) => x.id === a.dataset.article);
    openModal(`<h2>${esc(art.title)}</h2><p class="article-meta">${art.cat} — ${art.at}</p><div class="article-body">${esc(art.body)}</div>`);
  }
});

/* ─── plans ─── */
function renderPlans() {
  $("#plans-grid").innerHTML = state.plans.map((p, i) => `
    <article class="plan-card ${i === 2 ? "featured" : ""}">
      <h2>${esc(p.name)}</h2>
      <p class="plan-price">${money(p.price)} <small>/ ماه</small></p>
      <ul>${p.perks.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
      ${state.activePlan === p.id
        ? `<p class="plan-active">✓ همین حالا فعال است</p>`
        : `<button class="btn-primary" data-activate="${p.id}">فعال‌سازی پلن</button>`}
    </article>`).join("");
}
$("#view-plans").addEventListener("click", (e) => {
  const b = e.target.closest("[data-activate]");
  if (!b) return;
  if (!state.session) { pendingPlansNav = true; show("auth"); return; }
  state.activePlan = b.dataset.activate;
  save(); renderPlans();
  openModal(`<h2>پلن فعال شد</h2><p>«${esc(state.plans.find((p) => p.id === state.activePlan).name)}» فعال است و مزایایش روی رزروهای بعدی‌تان اعمال می‌شود.</p>`);
});

/* ─── favorites view ─── */
function renderFavorites() {
  const el = $("#favorites-list");
  const favs = state.favorites.map(courtById).filter(Boolean);
  if (favs.length === 0) {
    el.innerHTML = `<div class="empty-note" style="display:block">هنوز زمینی را ذخیره نکرده‌اید. در کنسول رزرو، قلب کنار هر زمین را بزنید تا اینجا ذخیره شود.<br><br><a href="#" data-nav="home">رفتن به کنسول رزرو</a></div>`;
    return;
  }
  el.innerHTML = favs.map((c) => `<div class="fav-item">
    <div><h2>${esc(c.name)}</h2><p class="price">${money(c.price)} / ۹۰ دقیقه — ★ ${c.rating}</p></div>
    <div style="display:flex;gap:8px">
      <button class="btn-ghost" data-nav="home">رزرو</button>
      <button class="btn-danger" data-unfav="${c.id}" aria-label="حذف ${esc(c.name)} از علاقه‌مندی‌ها">×</button>
    </div></div>`).join("");
  el.querySelectorAll("[data-unfav]").forEach((b) => b.addEventListener("click", () => toggleFav(b.dataset.unfav)));
}

/* ─── map diagram ─── */
$("#map-diagram").innerHTML = `<svg viewBox="0 0 400 260" role="img" aria-label="نقشه مجموعه کیوسک کلاب">
  <rect width="400" height="260" fill="#F4F7FB"/>
  <rect x="30" y="30" width="210" height="120" rx="6" fill="#0F3D91"/>
  <rect x="44" y="44" width="182" height="92" rx="3" fill="none" stroke="#fff" stroke-width="2"/>
  <line x1="135" y1="44" x2="135" y2="136" stroke="#fff" stroke-width="2"/>
  <text x="135" y="22" text-anchor="middle" font-size="12" fill="#0F3D91" font-weight="700">زمین ۱ و ۲</text>
  <rect x="260" y="30" width="110" height="120" rx="6" fill="#1D4ED8"/>
  <text x="315" y="95" text-anchor="middle" font-size="11" fill="#fff" font-weight="700">زمین VIP</text>
  <rect x="30" y="170" width="340" height="60" rx="6" fill="#FFFFFF" stroke="#DBE4EE"/>
  <text x="200" y="196" text-anchor="middle" font-size="12" fill="#475569" font-weight="700">پذیرش و کافه پدل — رختکن و دوش</text>
  <text x="200" y="216" text-anchor="middle" font-size="11" fill="#65A30D" font-weight="700">ورود از پارکینگ بلوار طالب‌آبادی</text>
</svg>`;

/* ─── contact ─── */
$("#contact-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#cf-name").value.trim(), phone = $("#cf-phone").value.trim(), msg = $("#cf-msg").value.trim();
  const err = $("#contact-error"), ok = $("#contact-ok");
  ok.hidden = true; err.hidden = true;
  if (!name || !msg || !/^0\d{10}$/.test(phone)) {
    err.hidden = false;
    err.textContent = "نام، شماره موبایل ۱۱ رقمی (با ۰) و متن پیام را کامل وارد کنید.";
    return;
  }
  state.messages.push({ id: "m" + Date.now(), name, phone, msg, at: Date.now(), read: false });
  save();
  e.target.reset();
  ok.hidden = false;
  ok.textContent = "پیام شما ثبت شد و در صندوق پیام‌های مدیر دیده می‌شود.";
});

/* ─── auth ─── */
let authRole = "player";
function syncAuthView() {
  $("#tab-player").classList.toggle("active", authRole === "player");
  $("#tab-admin").classList.toggle("active", authRole === "admin");
}
$("#tab-player").addEventListener("click", () => { authRole = "player"; syncAuthView(); });
$("#tab-admin").addEventListener("click", () => { authRole = "admin"; syncAuthView(); });
$("#login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("#li-name").value.trim(), phone = $("#li-phone").value.trim();
  const err = $("#login-error"); err.hidden = true;
  if (!name || !/^0\d{10}$/.test(phone)) { err.hidden = false; err.textContent = "نام و شماره موبایل ۱۱ رقمی (با ۰) لازم است."; return; }
  login(authRole, name, phone);
});
document.querySelectorAll("[data-demo-login]").forEach((b) => b.addEventListener("click", () => {
  const r = b.dataset.demoLogin;
  login(r, r === "admin" ? "مدیر باشگاه" : "حسام عربی", "09111234567");
}));
function login(role, name, phone) {
  state.session = { role, name, phone };
  save();
  closeModal(); closeDrawer();
  updateAuthUI();
  show(role === "admin" ? "admin" : (pendingPlansNav ? "plans" : pendingAuthView));
  pendingAuthView = "player";
  pendingPlansNav = false;
}

/* ─── player panel ─── */
function renderPlayer() {
  const s = state.session;
  if (!s) { show("auth"); return; }
  const el = $("#player-body");
  const mine = state.bookings.filter((b) => b.phone === s.phone && b.status === "active" && b.date >= todayISO());
  const past = state.bookings.filter((b) => b.phone === s.phone && (b.status !== "active" || b.date < todayISO()));
  const plan = state.activePlan ? state.plans.find((p) => p.id === state.activePlan) : null;
  const favs = state.favorites.map(courtById).filter(Boolean);
  el.innerHTML = `
    <div class="panel-grid">
      <div class="kpi"><span class="v">${toFa(mine.length)}</span><span class="l">رزرو پیش‌رو</span></div>
      <div class="kpi"><span class="v">${plan ? esc(plan.name) : "—"}</span><span class="l">عضویت فعال</span></div>
    </div>
    <div class="panel-box"><h2>رزروهای پیش‌رو</h2>
      ${mine.length ? mine.map((b) => `<div class="booking-item">
        <div class="row"><strong>${esc(courtById(b.courtId).name)}</strong><span class="time" dir="ltr">${slotLabel(b.slot)}</span></div>
        <div class="row"><span>${jStr(fromISO(b.date))} — ${money(b.price)}${b.racket ? " (با راکت)" : ""}</span>
        <button class="btn-danger" data-cancel="${b.id}">کنسلی</button></div>
      </div>`).join("") : `<p class="empty-note">رزرو پیش‌رویی ندارید. <a href="#" data-nav="home">اولین سانس را رزرو کنید.</a></p>`}
    </div>
    <div class="panel-grid">
      <div class="panel-box"><h2>علاقه‌مندی‌ها</h2>
        ${favs.length ? favs.map((c) => `<div class="fav-item"><h2>${esc(c.name)}</h2><button class="btn-ghost" data-nav="home">رزرو</button></div>`).join("") : `<p class="empty-note">زمینی ذخیره نشده است.</p>`}
      </div>
      <div class="panel-box"><h2>عضویت و تاریخچه</h2>
        ${plan ? `<p>«${esc(plan.name)}» فعال است. ${plan.perks[0]} و ${plan.perks[1]}.</p>` : `<p>عضویتی فعال ندارید. <a href="#" data-nav="plans">پلن‌ها را ببینید.</a></p>`}
        <h2 style="margin-top:16px">تاریخچه بازی‌ها</h2>
        ${past.length ? past.map((b) => `<div class="booking-item"><div class="row"><span>${esc(courtById(b.courtId).name.split(":")[0].trim())} — ${jStr(fromISO(b.date))}</span><span class="status-pill ${b.status === "active" ? "past" : "cancelled"}">${b.status === "active" ? "برگزار شده" : "کنسل شده"}</span></div></div>`).join("") : `<p>هنوز بازی ثبت‌شده‌ای ندارید.</p>`}
      </div>
    </div>`;
  el.querySelectorAll("[data-cancel]").forEach((b) => b.addEventListener("click", () => cancelBooking(b.dataset.cancel)));
}
function cancelBooking(id) {
  const b = state.bookings.find((x) => x.id === id);
  if (!b) return;
  const startMs = fromISO(b.date).getTime() + b.slot * 60000;
  const hrs = (startMs - Date.now()) / 3600000;
  openModal(`<h2>کنسلی رزرو</h2>
    <p>${esc(courtById(b.courtId).name)} — ${jStr(fromISO(b.date))} — <span class="time" dir="ltr">${slotLabel(b.slot)}</span></p>
    <p style="margin-block:12px">${hrs >= 6
      ? "بیش از ۶ ساعت تا سانس باقی است؛ کنسلی رایگان است و سانس بلافاصله آزاد می‌شود."
      : "کمتر از ۶ ساعت تا سانس مانده؛ طبق قوانین باشگاه مبلغ این رزرو مسترد نمی‌شود."}</p>
    <button class="btn-danger" id="confirm-cancel" style="width:100%">تأیید کنسلی</button>`);
  $("#confirm-cancel").addEventListener("click", () => {
    b.status = "cancelled";
    save(); closeModal(); renderPlayer();
  });
}

/* ─── admin panel ─── */
function renderAdmin() {
  const s = state.session;
  if (!s || s.role !== "admin") { show("auth"); return; }
  const t = todayISO();
  const week = weekISOs();
  const todays = state.bookings.filter((b) => b.date === t && b.status === "active");
  const weekCount = state.bookings.filter((b) => week.includes(b.date) && b.status === "active");
  const revenue = todays.reduce((a, b) => a + b.price, 0);
  const unread = state.messages.filter((m) => !m.read).length;
  const el = $("#admin-body");
  el.innerHTML = `
    <div class="panel-grid kpi4">
      <div class="kpi"><span class="v">${toFa(todays.length)}</span><span class="l">رزروهای امروز</span></div>
      <div class="kpi"><span class="v">${money(revenue)}</span><span class="l">درآمد امروز</span></div>
      <div class="kpi"><span class="v">${toFa(weekCount.length)}</span><span class="l">رزروهای این هفته</span></div>
      <div class="kpi"><span class="v">${toFa(unread)}</span><span class="l">پیام خوانده‌نشده</span></div>
    </div>
    <div class="panel-box"><h2>رزروهای هفت روز پیش‌رو</h2>${adminChart(week)}</div>
    <div class="panel-box"><h2>همه رزروها</h2>
      <input class="search-input" id="adm-search" placeholder="جستجوی نام یا شماره…" aria-label="جستجو">
      <div class="seg" style="margin-bottom:12px">
        ${["all", "online", "walkin"].map((f) => `<button class="seg-btn" data-bfilter="${f}">${{ all: "همه", online: "آنلاین", walkin: "حضوری / تلفنی" }[f]}</button>`).join("")}
      </div>
      <div id="adm-table"></div>
    </div>
    <div class="panel-grid">
      <div class="panel-box"><h2>ثبت رزرو حضوری / تلفنی</h2>
        <div class="inline-form">
          <div class="fr"><label for="wi-court">زمین</label><select id="wi-court">${state.courts.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
          <div class="fr"><label for="wi-date">روز</label><select id="wi-date">${week.map((d) => `<option value="${d}">${jStr(fromISO(d))}</option>`).join("")}</select></div>
          <div class="fr"><label for="wi-slot">سانس</label><select id="wi-slot">${SLOT_STARTS.map((x) => `<option value="${x}">${slotLabel(x)}</option>`).join("")}</select></div>
          <div class="fr"><label for="wi-name">نام بازیکن</label><input id="wi-name"></div>
          <div class="fr"><label for="wi-phone">شماره</label><input id="wi-phone" inputmode="tel"></div>
          <button class="btn-primary" id="wi-add">ثبت رزرو</button>
          <p class="form-error" id="wi-error" hidden></p>
        </div>
      </div>
      <div class="panel-box"><h2>مدیریت مسدودسازی سانس</h2>
        <div class="inline-form">
          <div class="fr"><label for="bl-court">زمین</label><select id="bl-court">${state.courts.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
          <div class="fr"><label for="bl-date">روز</label><select id="bl-date">${week.map((d) => `<option value="${d}">${jStr(fromISO(d))}</option>`).join("")}</select></div>
          <div class="fr"><label for="bl-slot">سانس</label><select id="bl-slot">${SLOT_STARTS.map((x) => `<option value="${x}">${slotLabel(x)}</option>`).join("")}</select></div>
          <div class="fr"><label for="bl-reason">علت</label><input id="bl-reason" placeholder="مثلاً نگهداری"></div>
          <button class="btn-primary" id="bl-add">مسدود کن</button>
        </div>
        <div id="bl-list" style="margin-top:12px"></div>
      </div>
    </div>
    <div class="panel-grid">
      <div class="panel-box"><h2>قیمت زمین‌ها و تخفیف صبح</h2>
        <div class="inline-form">
          ${state.courts.map((c) => `<div class="fr"><label for="pr-${c.id}">${esc(c.name)} (تومان / ۹۰ دقیقه)</label><input id="pr-${c.id}" inputmode="numeric" value="${toFa(c.price)}"></div>`).join("")}
          <div class="fr"><label for="pr-disc">درصد تخفیف صبح</label><input id="pr-disc" inputmode="numeric" value="${toFa(Math.round(state.discountRate * 100))}"></div>
          <button class="btn-primary" id="pr-save">ذخیره تنظیمات</button>
          <p class="form-ok" id="pr-ok" hidden>ذخیره شد.</p>
        </div>
      </div>
      <div class="panel-box"><h2>صندوق پیام‌ها</h2><div id="msg-list"></div></div>
    </div>`;
  renderAdminTable();
  renderBlockedList();
  renderMessages();
  bindAdminEvents(el);
}
function adminChart(week) {
  const counts = week.map((d) => state.bookings.filter((b) => b.date === d && b.status === "active").length);
  const max = Math.max(...counts, 4);
  const W = 640, H = 160, bw = 56, gap = (W - week.length * bw) / (week.length + 1);
  return `<svg viewBox="0 0 ${W} ${H + 30}" style="width:100%" role="img" aria-label="نمودار ستونی رزروها">
    ${week.map((d, i) => {
      const jp = jParts(fromISO(d));
      const x = gap + i * (bw + gap), h = (counts[i] / max) * H;
      return `<rect x="${x}" y="${H - h}" width="${bw}" height="${h}" rx="4" fill="#1D4ED8"/>
        <text x="${x + bw / 2}" y="${H - h - 6}" text-anchor="middle" font-size="13" fill="#0F172A">${toFa(counts[i])}</text>
        <text x="${x + bw / 2}" y="${H + 20}" text-anchor="middle" font-size="11" fill="#475569">${toFa(jp.jd)} ${JM[jp.jm - 1]}</text>`;
    }).join("")}
  </svg>`;
}
let adminFilter = "all", adminQuery = "";
function renderAdminTable() {
  const tb = $("#adm-table");
  if (!tb) return;
  let rows = [...state.bookings].sort((a, b) => (a.date + a.slot > b.date + b.slot ? 1 : -1));
  if (adminFilter !== "all") rows = rows.filter((b) => b.channel === adminFilter);
  if (adminQuery) rows = rows.filter((b) => b.name.includes(adminQuery) || b.phone.includes(adminQuery));
  tb.innerHTML = rows.length ? `<table class="data-table">
    <thead><tr><th>بازیکن</th><th>زمین</th><th>روز</th><th>سانس</th><th>کانال</th><th>مبلغ</th><th>وضعیت</th></tr></thead>
    <tbody>${rows.map((b) => `<tr>
      <td>${esc(b.name)}<br><span style="color:#475569;font-size:.78rem" dir="ltr">${esc(b.phone)}</span></td>
      <td>${esc(courtById(b.courtId).name.split(":")[0].trim())}</td>
      <td>${jStr(fromISO(b.date))}</td>
      <td><span class="time" dir="ltr">${slotLabel(b.slot)}</span></td>
      <td>${b.channel === "online" ? "آنلاین" : "حضوری"}</td>
      <td>${money(b.price)}</td>
      <td><span class="status-pill ${b.status}">${b.status === "active" ? "فعال" : "کنسل"}</span></td>
    </tr>`).join("")}</tbody></table>`
    : `<p class="empty-note">رزروی با این شرایط پیدا نشد.</p>`;
}
function renderBlockedList() {
  const el = $("#bl-list");
  if (!el) return;
  el.innerHTML = state.blocked.length ? state.blocked.map((b, i) =>
    `<div class="fav-item"><div><h2>${esc(courtById(b.courtId).name.split(":")[0].trim())} — ${jStr(fromISO(b.date))}</h2><p class="price"><span class="time" dir="ltr">${slotLabel(b.slot)}</span>${b.reason ? " — " + esc(b.reason) : ""}</p></div><button class="btn-danger" data-unblock="${i}">آزاد کن</button></div>`).join("")
    : `<p class="empty-note">سانسی مسدود نشده است.</p>`;
  el.querySelectorAll("[data-unblock]").forEach((x) => x.addEventListener("click", () => {
    state.blocked.splice(Number(x.dataset.unblock), 1); save(); renderAdmin();
  }));
}
function renderMessages() {
  const el = $("#msg-list");
  if (!el) return;
  el.innerHTML = state.messages.length ? state.messages.map((m) =>
    `<div class="msg-item"><p class="who">${esc(m.name)} — <span dir="ltr">${esc(m.phone)}</span></p><p>${esc(m.msg)}</p></div>`).join("")
    : `<p class="empty-note">پیامی نیست.</p>`;
}
function bindAdminEvents(el) {
  el.querySelectorAll("[data-bfilter]").forEach((b) => {
    b.classList.toggle("active", b.dataset.bfilter === adminFilter);
    b.addEventListener("click", () => { adminFilter = b.dataset.bfilter; renderAdmin(); });
  });
  $("#adm-search").addEventListener("input", (e) => { adminQuery = e.target.value.trim(); renderAdminTable(); });
  $("#wi-add").addEventListener("click", () => {
    const name = $("#wi-name").value.trim(), phone = $("#wi-phone").value.trim();
    const err = $("#wi-error"); err.hidden = true;
    if (!name || !/^0\d{10}$/.test(phone)) { err.hidden = false; err.textContent = "نام و شماره ۱۱ رقمی (با ۰) لازم است."; return; }
    const courtId = $("#wi-court").value, date = $("#wi-date").value, slot = Number($("#wi-slot").value);
    if (isTaken(courtId, date, slot) || isBlocked(courtId, date, slot)) { err.hidden = false; err.textContent = "این سانس آزاد نیست."; return; }
    state.bookings.push({ id: "b" + Date.now(), courtId, date, slot, name, phone, channel: "walkin", racket: false, price: slotPrice(courtId, slot), status: "active" });
    save(); renderAdmin();
  });
  $("#bl-add").addEventListener("click", () => {
    const courtId = $("#bl-court").value, date = $("#bl-date").value, slot = Number($("#bl-slot").value);
    const reason = $("#bl-reason").value.trim() || "بدون توضیح";
    if (!isBlocked(courtId, date, slot)) state.blocked.push({ courtId, date, slot, reason });
    save(); renderAdmin();
  });
  $("#pr-save").addEventListener("click", () => {
    state.courts.forEach((c) => {
      const v = Number(toEn($("#pr-" + c.id).value).replace(/\D/g, ""));
      if (v > 0) c.price = v;
    });
    const d = Number(toEn($("#pr-disc").value).replace(/\D/g, ""));
    if (d >= 0 && d <= 50) state.discountRate = d / 100;
    save();
    $("#pr-ok").hidden = false;
  });
}

/* ─── boot ─── */
renderHeroConsole();
renderBooking();
syncFavBadge();
updateAuthUI();
show("home");
