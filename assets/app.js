/* Seul 2026 — uygulama mantığı: yönlendirme, plan hesapları, tur oluşturucu, derin linkler, PWA. */
(() => {
  "use strict";
  const S = window.SEOUL;
  const { KRW_TRY, PEOPLE, BUDGET, REF_DEP, REF_RET, KETA_KRW, deps, rets, P, QR, ALTS, SEARCH_AIRLINES, AL_CODE,
    AREAS, STAYS, CATS, CAT_META, PLACES, ICN, NEIGH, HOMECL, LUNCH, FOOD, APPS, PHRASES, CHECKLIST, SEASONS } = S;
  const PLACE = Object.fromEntries(PLACES.map(p => [p.id, p]));
  const APP = Object.fromEntries(APPS.map(a => [a.id, a]));
  const SEASON = Object.fromEntries(SEASONS.map(s => [s.id, s]));
  const STORE = "seulPlan.v3", OLD_STORE = "seulPlan.v2", WX_KEY = "seulWx", THEME_KEY = "seulTheme";

  // ---------- Platform ----------
  const UA = navigator.userAgent;
  const IS_IOS = /iPad|iPhone|iPod/.test(UA) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const IS_ANDROID = /Android/i.test(UA);
  const IS_MOBILE = IS_IOS || IS_ANDROID;
  const IS_STANDALONE = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  const NAVER_APPNAME = location.protocol.startsWith("http") ? location.origin : "com.seul2026.planlayici";

  // ---------- Yardımcılar ----------
  const MONTHS = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
  const MONTHS_L = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];
  const DAYS = ["Paz","Pzt","Sal","Çar","Per","Cum","Cmt"];
  const DAYS_L = ["Pazar","Pazartesi","Salı","Çarşamba","Perşembe","Cuma","Cumartesi"];
  const $ = id => document.getElementById(id);
  const d = s => { const p = s.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); };
  const iso = dt => dt.toISOString().slice(0, 10);
  const addDays = (s, n) => { const x = d(s); x.setUTCDate(x.getUTCDate() + n); return iso(x); };
  const diff = (a, b) => Math.round((d(b) - d(a)) / 86400000);
  const fmtD = s => { const x = d(s); return x.getUTCDate() + " " + MONTHS[x.getUTCMonth()]; };
  const fmtDL = s => { const x = d(s); return x.getUTCDate() + " " + MONTHS[x.getUTCMonth()] + " " + DAYS[x.getUTCDay()]; };
  const n0 = n => Math.round(n).toLocaleString("tr-TR");
  const tl = n => n0(n) + " TL";
  const won = n => "₩" + n0(n);
  const hNum = s => { const [h, m] = s.split(":").map(Number); return h + m / 60; };
  const durMin = s => { const m = s.match(/(\d+) sa(?: (\d+) dk)?/); return +m[1] * 60 + +(m[2] || 0); };
  const hm = x => { const t = Math.round(x * 4) * 15; return String(Math.floor(t / 60) % 24).padStart(2, "0") + ":" + String(t % 60).padStart(2, "0"); };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tier = p => p < 32000 ? "p1" : p < 36000 ? "p2" : p < 40000 ? "p3" : "p4";
  const yymmdd = s => s.slice(2, 4) + s.slice(5, 7) + s.slice(8, 10);
  const ic = (name, cls) => "<svg class='ic" + (cls ? " " + cls : "") + "' aria-hidden='true'><use href='#i-" + name + "'/></svg>";
  const EXT = ic("external");
  const extLink = (cls, href, label) => "<a class='" + cls + "' href='" + href + "' target='_blank' rel='noopener'>" + label + EXT + "</a>";
  const enc = encodeURIComponent;

  // ---------- Linkler ----------
  const gflights = (dep, ret, airline, nonstop) => {
    const q = (nonstop ? "Nonstop flights" : "Flights") + " to ICN from IST on " + dep + " through " + ret + (airline ? " on " + airline : "");
    return "https://www.google.com/travel/flights?q=" + enc(q) + "&curr=TRY&hl=tr";
  };
  const skyscanner = (dep, ret) => "https://www.skyscanner.com.tr/transport/flights/ist/icn/" + yymmdd(dep) + "/" + yymmdd(ret) + "/?adultsv2=4&cabinclass=economy";
  const stayUrl = (s, ci, co) => s.kind === "ev"
    ? "https://www.airbnb.com.tr/rooms/" + s.id + "?check_in=" + ci + "&check_out=" + co + "&adults=4&currency=TRY"
    : "https://www.booking.com/hotel/kr/" + s.id + ".tr.html?checkin=" + ci + "&checkout=" + co + "&group_adults=4&no_rooms=2&group_children=0&selected_currency=TRY";
  const airbnbArea = (q, ci, co) => "https://www.airbnb.com.tr/s/" + enc(q) + "/homes?checkin=" + ci + "&checkout=" + co + "&adults=4&min_bedrooms=2&room_types%5B%5D=Entire%20home%2Fapt&currency=TRY";
  const bookingArea = (q, ci, co) => "https://www.booking.com/searchresults.tr.html?ss=" + enc(q) + "&checkin=" + ci + "&checkout=" + co + "&group_adults=4&no_rooms=2&group_children=0&selected_currency=TRY";
  const gRoute = (from, to) => "https://www.google.com/maps/dir/?api=1&origin=" + enc(from) + "&destination=" + enc(to) + "&travelmode=transit";
  const iosStore = id => "https://apps.apple.com/tr/app/" + id;
  const playStore = pkg => "https://play.google.com/store/apps/details?id=" + pkg;

  // Hedef: { name, ko, q, lat?, lng? }. Koordinat varsa rota, yoksa (restoranlar) uygulama içi arama açılır.
  const hasXY = dst => typeof dst.lat === "number" && typeof dst.lng === "number";
  const nm = dst => dst.ko || dst.name;
  const NAV = {
    naver: dst => ({ app: APP.naver,
      scheme: hasXY(dst)
        ? "nmap://route/public?dlat=" + dst.lat + "&dlng=" + dst.lng + "&dname=" + enc(nm(dst)) + "&appname=" + enc(NAVER_APPNAME)
        : "nmap://search?query=" + enc(nm(dst)) + "&appname=" + enc(NAVER_APPNAME),
      web: "https://map.naver.com/p/search/" + enc(nm(dst)) }),
    kakao: dst => ({ app: APP.kakaomap,
      scheme: hasXY(dst) ? "kakaomap://route?ep=" + dst.lat + "," + dst.lng + "&by=publictransit" : "kakaomap://search?q=" + enc(nm(dst)),
      web: hasXY(dst) ? "https://map.kakao.com/link/to/" + enc(nm(dst)) + "," + dst.lat + "," + dst.lng : "https://map.kakao.com/?q=" + enc(nm(dst)) })
  };
  // Android: intent:// yüklü değilse Google Play'i açar. iOS: şema açılmazsa 1,6 sn sonra App Store.
  function launchScheme(scheme, app) {
    if (IS_ANDROID) {
      const i = scheme.indexOf("://");
      location.href = "intent://" + scheme.slice(i + 3) + "#Intent;scheme=" + scheme.slice(0, i) + ";package=" + app.android + ";end";
      return;
    }
    let left = false;
    const onHide = () => { if (document.visibilityState === "hidden") left = true; };
    document.addEventListener("visibilitychange", onHide);
    location.href = scheme;
    setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      if (!left) { toast(app.name + " yüklü değil; App Store açılıyor"); location.href = iosStore(app.ios); }
    }, 1600);
  }

  // ---------- Durum ----------
  const VIEWS = ["ana", "tur", "kesfet", "planla", "rehber"];
  const SUBS = { kesfet: ["yerler", "restoran", "turkler"], planla: ["butce", "ucus", "konaklama"], rehber: ["uygulamalar", "ulasim", "sozluk", "pratik"] };
  const LEGACY = { plan: "planla/butce", ucus: "planla/ucus", konaklama: "planla/konaklama", yerler: "kesfet" };
  const state = {
    di: 5, ri: 3, t: "t1", alt: null, stay: STAYS[0].id, food: 1,
    picks: Object.fromEntries(PLACES.filter(p => p.def).map(p => [p.id, true])),
    origin: "", checks: {}, apps: {},
    stayFilter: "all", cat: "all", q: "", restKind: "all", phraseCat: "Temel", allChecks: false,
    season: "yilbasi", trip: { bayram: "b2", sakura: "s2" }, fl: { bayram: 0, sakura: 0 },
    view: "ana", sub: { kesfet: "yerler", planla: "butce", rehber: "uygulamalar" }
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || localStorage.getItem(OLD_STORE) || "null");
    if (saved && typeof saved === "object") {
      if (Number.isInteger(saved.di) && Number.isInteger(saved.ri) && P[saved.di] && P[saved.di][saved.ri] != null) { state.di = saved.di; state.ri = saved.ri; }
      if (saved.t === "t1" || saved.t === "t2") state.t = saved.t;
      if (saved.alt === null || (Number.isInteger(saved.alt) && ALTS[saved.alt])) state.alt = saved.alt;
      if (STAYS.some(s => s.id === saved.stay)) state.stay = saved.stay;
      if (FOOD[saved.food]) state.food = saved.food;
      if (saved.picks && typeof saved.picks === "object") state.picks = Object.fromEntries(Object.keys(saved.picks).filter(k => PLACE[k] && saved.picks[k]).map(k => [k, true]));
      // Kaydedilmiş planda bulunmayan yeni yerlerin varsayılan seçimini ekle.
      const known = Array.isArray(saved.known) ? saved.known : Object.keys(saved.picks || {}).concat(["gyeongbok","bukchon","changdeok","insadong","gwanghwamun","ikseon","gwangjang","ddp","namsan","myeongdong","namsangol","nmk","itaewon","hongdae","seongsu","coex","seoulsky","bosingak","rink","nami","suwon","dmz"]);
      PLACES.forEach(p => { if (p.def && !known.includes(p.id)) state.picks[p.id] = true; });
      if (SEASON[saved.season]) state.season = saved.season;
      ["bayram", "sakura"].forEach(sid => {
        if (saved.trip && SEASON[sid].trips.some(t => t.id === saved.trip[sid])) state.trip[sid] = saved.trip[sid];
        if (saved.fl && Number.isInteger(saved.fl[sid]) && saved.fl[sid] >= 0) state.fl[sid] = saved.fl[sid];
      });
      if (typeof saved.origin === "string") state.origin = saved.origin;
      if (saved.checks && typeof saved.checks === "object") state.checks = saved.checks;
      if (saved.apps && typeof saved.apps === "object") state.apps = saved.apps;
    }
  } catch (e) { /* bozuk kayıt: varsayılanlar */ }
  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify({ di: state.di, ri: state.ri, t: state.t, alt: state.alt, stay: state.stay, food: state.food,
        picks: state.picks, known: PLACES.map(p => p.id), origin: state.origin, checks: state.checks, apps: state.apps,
        season: state.season, trip: state.trip, fl: state.fl }));
    } catch (e) { /* depolama kapalı */ }
  };

  // ---------- Plan hesapları ----------
  const matrixNights = (di, ri) => diff(addDays(deps[di], 1), rets[ri]);
  const matrixNYE = (di, ri) => addDays(deps[di], 1) <= "2026-12-31" && rets[ri] >= "2027-01-01";
  const isOpen = (p, date) => {
    if (p.closed && p.closed.includes(d(date).getUTCDay())) return false;
    if (p.closedDates && p.closedDates.includes(date)) return false;
    if (p.window && (date < p.window[0] || date > p.window[1])) return false;
    return true;
  };
  const passCost = days => {
    const opts = [[1, 5000], [2, 8000], [3, 10000], [5, 15000], [7, 20000]];
    const best = [0];
    for (let i = 1; i <= days; i++) best[i] = Math.min(...opts.map(([n, c]) => best[Math.max(0, i - n)] + c));
    return best[days];
  };

  // ---------- Dönemler ----------
  const inSeason = (p, sid) => !p.seasons || p.seasons.includes(sid);
  const tipFor = (p, sid) => (sid !== "yilbasi" && p.tipSpring) || p.tip;
  const tripOf = sid => { const s = SEASON[sid]; return s.trips.find(t => t.id === state.trip[sid]) || s.trips[0]; };
  // Dönemin konaklama fiyatı; o tarihte müsait görünmeyen ilan için Aralık gecelik fiyatı tahmin olarak kullanılır.
  function stayPrice(st, sid) {
    if (sid === "yilbasi") return { nightly: st.nightly };
    const s = SEASON[sid], total = s.stay[st.id];
    if (total == null) return { nightly: st.nightly, na: true };
    return { nightly: total / diff(s.stayRange[0], s.stayRange[1]) };
  }

  function context(sid) {
    sid = sid || state.season;
    let flight;
    if (sid !== "yilbasi") {
      const tr = tripOf(sid);
      const f = tr.flights[Math.min(state.fl[sid] || 0, tr.flights.length - 1)];
      flight = { airline: f.al, dep: f.dep, arr: f.arr, off: f.off, dur: f.dur, via: f.via, direct: f.direct, price: f.price, depDate: tr.dep, retDate: tr.ret,
        link: gflights(tr.dep, tr.ret, f.al, f.direct), note: f.note };
    } else if (state.alt !== null) {
      const a = ALTS[state.alt];
      flight = { airline: a.al, dep: a.dep, arr: a.arr, off: a.off, dur: a.dur, via: a.via, direct: a.direct, price: a.price, depDate: REF_DEP, retDate: REF_RET,
        link: gflights(REF_DEP, REF_RET, a.al, a.direct), note: a.note };
    } else {
      const q = QR[state.t];
      flight = { airline: "Qatar Airways", dep: q.dep, arr: q.arr, off: q.off, dur: q.dur, via: q.via, direct: false, price: P[state.di][state.ri],
        depDate: deps[state.di], retDate: rets[state.ri], link: gflights(deps[state.di], rets[state.ri], "Qatar Airways") };
    }
    const arrDate = addDays(flight.depDate, flight.off);
    const nights = diff(arrDate, flight.retDate);
    const arrH = hNum(flight.arr);
    const stay = STAYS.find(s => s.id === state.stay);
    const custom = state.origin.trim();
    const origin = custom || stay.origin;
    const home = { name: stay.name, ko: stay.ko, q: origin, lat: stay.lat, lng: stay.lng, approx: !!stay.approx, custom };
    return { season: sid, S: SEASON[sid], flight, arrDate, retDate: flight.retDate, nights, days: nights + 1, arrH, homeH: arrH + 2, stay, sp: stayPrice(stay, sid), origin, home,
      nye: arrDate <= "2026-12-31" && flight.retDate >= "2027-01-01" };
  }

  function buildTour(ctx) {
    const days = [];
    for (let dt = ctx.arrDate; dt <= ctx.retDate; dt = addDays(dt, 1)) {
      const kind = dt === ctx.arrDate ? "arrival" : dt === ctx.retDate ? "departure" : dt === "2026-12-31" ? "nye" : dt === "2027-01-01" ? "newyear" : "full";
      const cap = kind === "full" ? 7 : (kind === "nye" || kind === "newyear") ? 5 : kind === "arrival" ? (ctx.homeH <= 12 ? 3.5 : ctx.homeH <= 14.5 ? 2 : 0) : 0;
      const eve = kind === "departure" ? 0 : kind === "arrival" ? (ctx.homeH <= 19 ? 1 : 0) : 1;
      days.push({ date: dt, kind, cap, left: cap, eve, items: [], evening: null, trip: null, cluster: kind === "arrival" ? HOMECL[ctx.stay.area] : null });
    }
    const picks = PLACES.filter(p => state.picks[p.id] && inSeason(p, ctx.season));
    const unplaced = [];
    const placedOn = {};

    // Tarihi sabit etkinlikler: sabah olanlar (bayram namazı) günün başına, akşam olanlar (çan töreni) akşama.
    picks.filter(p => p.pin).forEach(p => {
      const morning = p.when === "day";
      const day = days.find(x => x.date === p.pin && x.kind !== "departure" &&
        (x.kind !== "arrival" || (morning ? ctx.homeH + 0.5 <= p.at : ctx.homeH <= 22)));
      if (!day) {
        const there = days.some(x => x.date === p.pin);
        unplaced.push([p, there ? "O sabah henüz konaklamaya varmış olmuyorsunuz; daha erken varan bir uçuş seçin." : "Bu tarihte Seul'de değilsiniz."]);
      } else if (morning) {
        day.items.unshift(p); day.left = Math.max(0, day.left - p.hours); day.cluster = p.cluster;
      } else { day.evening = p; day.eve = 0; }
    });

    const full = days.filter(x => x.kind === "full");
    const mid = (full.length - 1) / 2;
    picks.filter(p => p.trip).forEach(p => {
      const cands = full.filter(x => !x.trip && isOpen(p, x.date)).sort((a, b) => Math.abs(full.indexOf(a) - mid) - Math.abs(full.indexOf(b) - mid));
      if (!cands.length) { unplaced.push([p, "Boş tam gün kalmadı; kalışı uzatın veya başka bir günübirliği çıkarın."]); return; }
      const day = cands[0];
      day.trip = p; day.left = 0; day.cluster = "trip";
      if (!day.evening) day.eve = 0;
    });

    const pool = picks.filter(p => !p.pin && !p.trip && p.when !== "evening");
    const capDays = days.filter(x => x.left > 0);
    const totalH = pool.reduce((s, p) => s + p.hours, 0);
    const target = capDays.length ? Math.min(7, Math.max(4, totalH / capDays.length + 1)) : 0;
    const take = (day, p) => { day.items.push(p); day.left -= p.hours; pool.splice(pool.indexOf(p), 1); };
    days.forEach(day => {
      if (day.left <= 0) return;
      const cands = pool.filter(p => isOpen(p, day.date) && p.hours <= day.left);
      if (!cands.length) return;
      const byCl = {};
      cands.forEach(p => { byCl[p.cluster] = (byCl[p.cluster] || 0) + p.hours; });
      let cl = null;
      if (day.kind === "arrival") {
        cl = [day.cluster, ...(NEIGH[day.cluster] || [])].find(c => byCl[c]) || null;
        if (!cl) return;
      } else {
        cl = Object.keys(byCl).sort((a, b) => byCl[b] - byCl[a])[0];
      }
      day.cluster = cl;
      const byOrder = c => pool.filter(p => p.cluster === c && isOpen(p, day.date)).sort((a, b) => a.order - b.order);
      byOrder(cl).forEach(p => { if (p.hours <= day.left) take(day, p); });
      (NEIGH[cl] || []).forEach(c => byOrder(c).forEach(p => {
        if (p.hours <= day.left && (day.cap - day.left) + p.hours <= target) take(day, p);
      }));
    });

    const evePlace = p => {
      const cands = days.filter(x => x.eve > 0 && !x.evening && isOpen(p, x.date));
      if (!cands.length) return false;
      const score = x => x.cluster === p.cluster ? 2 : (NEIGH[x.cluster] || []).includes(p.cluster) ? 1 : 0;
      cands.sort((a, b) => score(b) - score(a));
      cands[0].evening = p;
      return true;
    };
    picks.filter(p => !p.pin && !p.trip && p.when === "evening").forEach(p => {
      if (!evePlace(p)) {
        const open = days.some(x => x.kind !== "departure" && isOpen(p, x.date));
        unplaced.push([p, open ? "Boş akşam kalmadı." : "Tarihlerinizde açık değil."]);
      }
    });
    pool.slice().forEach(p => { if (p.when === "flex" && evePlace(p)) pool.splice(pool.indexOf(p), 1); });
    pool.forEach(p => {
      const open = days.some(x => x.cap > 0 && isOpen(p, x.date));
      unplaced.push([p, open ? "Gündüz kapasitesi doldu; bir yeri çıkarın veya kalışı uzatın." : "Tarihlerinizde kapalı (" + (p.tip || "") + ")"]);
    });

    days.forEach((day, i) => {
      [...day.items, day.trip, day.evening].filter(Boolean).forEach(p => { placedOn[p.id] = i; });
    });
    return { days, unplaced, placedOn };
  }

  // Günün saatli durakları; tur, ana sayfa ve takvim dışa aktarımı aynı programı kullanır.
  function schedule(day, ctx) {
    const out = [];
    if (day.trip) out.push({ h: 8.5, p: day.trip });
    let t = day.kind === "arrival" ? ctx.homeH + 0.75 : day.kind === "newyear" ? 11 : day.kind === "nye" ? 10.5 : 9.5;
    day.items.forEach(p => {
      if (p.pin && p.at) t = p.at;
      if (p.id === "bukchon" && t < 10) t = 10;
      out.push({ h: t, p });
      t += p.hours + 0.5;
    });
    if (day.evening) out.push({ h: day.evening.at || Math.max(t, 18), p: day.evening });
    return out;
  }

  function computeCosts(ctx, tour) {
    const food = FOOD[state.food].krw * KRW_TRY * ctx.days;
    const homeTotal = ctx.sp.nightly * ctx.nights;
    const passDays = Math.max(0, ctx.days - 2);
    const t = { arex: 2 * 4750, rides: 4 * 1550, cards: 7000, passDays, pass: passCost(passDays) };
    t.krw = t.arex + t.rides + t.cards + t.pass;
    const placed = Object.keys(tour.placedOn).map(id => PLACE[id]).filter(p => p.fee);
    const ticketsKrw = placed.reduce((s, p) => s + p.fee, 0);
    const c = {
      flight: ctx.flight.price, home: homeTotal / PEOPLE, homeTotal, food,
      transport: t.krw * KRW_TRY, tickets: ticketsKrw * KRW_TRY, ticketCount: placed.length, keta: KETA_KRW * KRW_TRY, t
    };
    c.total = c.flight + c.home + c.food + c.transport + c.tickets + c.keta;
    return c;
  }

  // ---------- Zaman ----------
  const seoulToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  function departInstant(ctx) {
    const [y, m, dd] = ctx.flight.depDate.split("-").map(Number);
    const [h, mi] = ctx.flight.dep.split(":").map(Number);
    return Date.UTC(y, m - 1, dd, h - 3, mi); // İstanbul UTC+3
  }
  function returnEnd(ctx) {
    const [y, m, dd] = ctx.retDate.split("-").map(Number);
    return Date.UTC(y, m - 1, dd, 23 - 9, 59); // Seul UTC+9
  }

  // ---------- Bileşen parçaları ----------
  const mono = (cls, content) => "<span class='mono " + cls + "'>" + content + "</span>";
  function destOf(key, ctx) {
    if (key === "home") return ctx.home;
    if (key === "icn") return ICN;
    if (key.startsWith("rest:")) return RESTS[+key.slice(5)];
    return PLACE[key.slice(6)];
  }
  // Navigasyon butonları: href = web yedeği (masaüstü), data-launch = telefonda uygulama.
  function navButtons(key, ctx, from, style) {
    const dst = destOf(key, ctx);
    const nv = NAV.naver(dst), kk = NAV.kakao(dst);
    const g = hasXY(dst) || dst.q ? gRoute(from || ctx.origin, dst.q) : gRoute(from || ctx.origin, dst.name + ", Seoul");
    const cls = style === "pill" ? "pill" : "navbtn";
    const lbl = (txt) => style === "pill" ? txt : "<span>" + txt + "</span>";
    return "<a class='" + cls + "' href='" + nv.web + "' target='_blank' rel='noopener' data-launch='naver' data-dest='" + key + "' aria-label='" + esc(dst.name) + " için Naver Map'>" + mono("n", "N") + lbl("Naver") + "</a>" +
      "<a class='" + cls + "' href='" + kk.web + "' target='_blank' rel='noopener' data-launch='kakao' data-dest='" + key + "' aria-label='" + esc(dst.name) + " için KakaoMap'>" + mono("k", "K") + lbl("Kakao") + "</a>" +
      "<a class='" + cls + "' href='" + g + "' target='_blank' rel='noopener' aria-label='" + esc(dst.name) + " için Google Haritalar'>" + mono("g", "G") + lbl("Google") + "</a>" +
      (dst.ko ? "<button type='button' class='" + cls + "' data-taxi='" + key + "' aria-label='" + esc(dst.name) + " için taksi kartı'>" + mono("t", ic("car")) + lbl("Taksi") + "</button>" : "");
  }

  // ---------- Araştırma verisi: puanlar, Türk blogları, restoranlar ----------
  const R = window.RESEARCH || { images: {}, ratings: {}, trmap: {}, tr: { sources: [], places: [], restaurants: [], tips: [] } };
  const SRC = Object.fromEntries(R.tr.sources.map((s, i) => [s.id, Object.assign({ n: i + 1 }, s)]));
  const NSRC = R.tr.sources.length;
  const cite = txt => esc(txt || "").replace(/\bs(\d{1,2})\b/g, (m, n) => SRC["s" + n]
    ? "<a class='cite' href='" + esc(SRC["s" + n].url) + "' target='_blank' rel='noopener' title='" + esc(SRC["s" + n].site) + "'>[" + SRC["s" + n].n + "]</a>" : m);
  const citeList = ids => ids.filter(id => SRC[id]).map(id => "<a class='cite' href='" + esc(SRC[id].url) + "' target='_blank' rel='noopener' title='" + esc(SRC[id].site) + "'>[" + SRC[id].n + "]</a>").join("");
  const restCluster = a => {
    const s = (a || "").toLowerCase();
    if (/itaewon|haebang|yongsan/.test(s)) return "yongsan";
    if (/ikseon|gwangjang|jongno 3|dongdaemun/.test(s)) return "eastjongno";
    if (/anguk|bukchon|gwanghwamun|insa|samcheong|jongno|gyeongbok/.test(s)) return "palace";
    if (/myeongdong|namdaemun|namsan|city hall|jung/.test(s)) return "namsan";
    if (/hongdae|yeonnam|hapjeong|mapo|sinchon/.test(s)) return "west";
    if (/seongsu|seoul forest/.test(s)) return "seongsu";
    if (/gangnam|samseong|coex|apgujeong|jamsil/.test(s)) return "gangnam";
    return null;
  };
  const RESTS = R.tr.restaurants.map((r, i) => Object.assign({}, r, { i, key: "rest:" + i, cluster: restCluster(r.area), q: (r.ko || r.name) + ", Seoul" }));
  const restKind = r => /kafe|kahve|fırın|bakery|çay|dondurma/i.test(r.type || "") ? "kafe"
    : (r.halal === "yes" || /türk|helal|kebap|kebab/i.test(r.type || "") ? "helal" : /pazar|sokak/i.test(r.type || "") ? "pazar" : "yemek");
  const REST_KINDS = [["all", "Tümü"], ["yemek", "Yemek"], ["kafe", "Kafe ve fırın"], ["pazar", "Pazar ve sokak"], ["helal", "Helal ve Türk"]];
  const compact = n => n >= 1000 ? (n / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 1 }) + " bin" : String(n);
  const rateLine = r => {
    if (!r) return "";
    const bits = [];
    if (r.g) bits.push("<a class='rb g' href='" + esc(r.g[2]) + "' target='_blank' rel='noopener'><b>" + ic("star") + String(r.g[0]).replace(".", ",") + "</b> Google <small>(" + compact(r.g[1]) + ")</small></a>");
    if (r.ta) bits.push("<a class='rb' href='" + esc(r.ta[2]) + "' target='_blank' rel='noopener'><b>" + String(r.ta[0]).replace(".", ",") + "</b> Tripadvisor <small>(" + compact(r.ta[1]) + ")</small></a>");
    return bits.join("");
  };

  // ---------- ANA SAYFA ----------
  function renderHome(ctx, tour, costs) {
    const f = ctx.flight;
    const S = ctx.S;
    $("homeHero").innerHTML =
      "<div class='season-seg' role='group' aria-label='Dönem seç'>" + SEASONS.map(s =>
        "<button type='button' data-season='" + s.id + "' aria-pressed='" + (s.id === ctx.season) + "'>" + ic(s.icon) + "<span><b>" + s.label + "</b><small>" + s.sub + "</small></span></button>").join("") + "</div>" +
      "<div class='hero-top'><div class='hero-text'>" +
        "<p class='eyebrow'>" + ic(S.icon) + "<span class='ko' lang='ko'>서울</span> " + S.eyebrow + "</p>" +
        "<h2 id='heroTitle'>Seul'e geri sayım</h2>" +
        "<p class='meta'>" + fmtDL(f.depDate) + " " + f.dep + " İstanbul → " + fmtDL(ctx.retDate) + " dönüş · " + ctx.nights + " gece · " + esc(f.airline) + " · " + esc(ctx.stay.name) + "</p>" +
      "</div><div class='countdown' id='countdown' aria-live='off'></div></div>" +
      "<div class='summary' aria-label='Kişi başı bütçe özeti'>" +
        "<div><span class='label'>" + ic("plane") + "Uçak</span><span class='big num'>" + tl(costs.flight) + "</span><span class='sub'>" + (costs.flight <= BUDGET ? "bütçe içinde" : "bütçe dışı") + "</span></div>" +
        "<div><span class='label'>" + ic("home") + "Konaklama</span><span class='big num'>" + tl(costs.home) + "</span><span class='sub'>" + ctx.nights + " gece</span></div>" +
        "<div><span class='label'>" + ic("utensils") + "Yemek</span><span class='big num'>" + tl(costs.food) + "</span><span class='sub'>" + FOOD[state.food].label + "</span></div>" +
        "<div><span class='label'>" + ic("ticket") + "Ulaşım + gezi</span><span class='big num'>" + tl(costs.transport + costs.tickets + costs.keta) + "</span><span class='sub'>" + costs.ticketCount + " bilet, K-ETA</span></div>" +
        "<div class='total'><span class='label'>" + ic("wallet") + "Toplam, kişi başı</span><span class='big num'>" + tl(costs.total) + "</span><span class='sub'>4 kişi: " + tl(costs.total * PEOPLE) + "</span></div>" +
      "</div>" +
      "<div class='hero-actions'><a class='btn light' href='#tur'>" + ic("route") + "Rotayı aç</a><a class='btn glass' href='#planla/butce'>" + ic("wallet") + "Bütçeyi düzenle</a></div>";

    // Bugün / ilk gün önizlemesi
    const today = seoulToday();
    const ti = tour.days.findIndex(x => x.date === today);
    const idx = ti >= 0 ? ti : (Date.now() > returnEnd(ctx) ? tour.days.length - 1 : 0);
    const day = tour.days[idx];
    const sch = schedule(day, ctx);
    const x = d(day.date);
    $("nextDay").innerHTML =
      "<div class='card-head'><h2><span class='h-ic'>" + ic("route") + "</span>" + (ti >= 0 ? "Bugünün planı" : "İlk gün") + "</h2><span class='tag blue'>" + (idx + 1) + ". gün · " + x.getUTCDate() + " " + MONTHS_L[x.getUTCMonth()] + "</span></div>" +
      (sch.length
        ? "<ul class='mini-stops'>" + sch.map(s => "<li style='--c: var(--c-" + s.p.cats[0] + ")'><span class='t'>" + hm(s.h) + "</span><span class='dot' aria-hidden='true'></span><span>" + esc(s.p.name) + "</span></li>").join("") + "</ul>"
        : "<p class='sub'>" + (day.kind === "arrival" ? "Varış günü: iniş " + f.arr + ", konaklamaya yaklaşık " + hm(ctx.homeH) + "." : "Bu gün için plan yok.") + "</p>") +
      "<a class='btn ghost sm' href='#tur/gun-" + (idx + 1) + "'>Günün detayları" + ic("arrow-right") + "</a>";

    // Hazırlık listesi
    const CL = CHECKLIST.filter(c => !c.seasons || c.seasons.includes(ctx.season));
    const done = CL.filter(c => state.checks[c.id]).length;
    const pct = Math.round(done / CL.length * 100);
    const items = state.allChecks ? CL : CL.filter(c => !state.checks[c.id]).slice(0, 5);
    $("checkCard").innerHTML =
      "<div class='card-head'><h2><span class='h-ic green'>" + ic("list-check") + "</span>Hazırlık listesi</h2>" +
        "<div class='progress'><span class='sub'>" + done + "/" + CL.length + " tamam</span><span class='ring' style='--p:" + pct + "' role='img' aria-label='Yüzde " + pct + " tamamlandı'><span>%" + pct + "</span></span></div></div>" +
      (items.length ? "<ul class='checklist'>" + items.map(c =>
        "<li><label><input type='checkbox' data-check='" + c.id + "'" + (state.checks[c.id] ? " checked" : "") + "><span>" + esc(c.text) + "</span></label>" +
        (c.href ? (c.ext ? "<a href='" + c.href + "' target='_blank' rel='noopener'>Aç" + EXT + "</a>" : "<a href='" + c.href + "'>Git</a>") : "") +
        (c.action === "install" ? "<a href='#' data-action='install'>Yükle</a>" : "") + "</li>").join("") + "</ul>"
        : "<p class='callout info'>" + ic("check-circle") + "<span>Her şey hazır. İyi yolculuklar!</span></p>") +
      "<button type='button' class='more' data-action='toggle-checks'>" + (state.allChecks ? "Yalnızca kalanları göster" : "Tüm listeyi göster") + "</button>";

    // Bütçe dağılımı
    const parts = [["Uçak", costs.flight, "--c-sehir"], ["Konaklama", costs.home, "--c-alisveris"], ["Yemek", costs.food, "--c-yemek"],
      ["Ulaşım", costs.transport, "--c-muze"], ["Gezi biletleri", costs.tickets, "--c-tarih"], ["K-ETA", costs.keta, "--c-gunubirlik"]];
    $("homeCosts").innerHTML =
      "<div class='card-head'><h2><span class='h-ic green'>" + ic("wallet") + "</span>Kişi başı bütçe dağılımı</h2><a class='btn ghost sm' href='#planla/butce'>Ayrıntı" + ic("arrow-right") + "</a></div>" +
      "<div class='stackbar' role='img' aria-label='Bütçe dağılımı: " + parts.map(p => p[0] + " " + tl(p[1])).join(", ") + "'>" +
        parts.map(p => "<span style='flex:" + p[1].toFixed(0) + ";background:var(" + p[2] + ")'></span>").join("") + "</div>" +
      "<div class='legend-list'>" + parts.map(p => "<div><i style='background:var(" + p[2] + ")'></i><span>" + p[0] + "</span><b class='num'>" + tl(p[1]) + "</b><small>%" + Math.round(p[1] / costs.total * 100) + "</small></div>").join("") + "</div>";
    renderCompare();
    tick(ctx);
  }

  // Üç dönemin seçili seçeneklerle karşılaştırması (aynı yemek seviyesi, konaklama ve yer seçimleriyle).
  function renderCompare() {
    const rows = SEASONS.map(s => { const c = context(s.id); const k = computeCosts(c, buildTour(c)); return { s, c, k }; });
    const minT = Math.min(...rows.map(r => r.k.total));
    $("compareCard").innerHTML =
      "<div class='card-head'><h2><span class='h-ic'>" + ic("calendar") + "</span>Hangi dönem?</h2><span class='sub'>Kişi başı, seçili uçuş ve konaklamayla</span></div>" +
      "<div class='compare'>" + rows.map(({ s, c, k }) => {
        const on = s.id === state.season;
        const bf = bloomFit(c);
        return "<button type='button' class='cmp" + (on ? " on" : "") + "' data-season='" + s.id + "' aria-pressed='" + on + "' style='--sc:" + s.color + "'>" +
          "<span class='cmp-h'><span class='cmp-ic'>" + ic(s.icon) + "</span><span><b>" + s.label + "</b><small>" + fmtD(c.flight.depDate) + " → " + fmtD(c.retDate) + " · " + c.nights + " gece</small></span>" +
            (on ? "<span class='tag blue'>" + ic("check") + "Seçili</span>" : "") + "</span>" +
          "<span class='cmp-total'><b class='num'>" + tl(k.total) + "</b>" + (k.total === minT ? "<span class='tag good'>En uygun</span>" : "<small>+" + tl(k.total - minT) + "</small>") + "</span>" +
          "<span class='cmp-kv'><span>" + ic("plane") + esc(c.flight.airline) + " · " + tl(k.flight) + "</span>" +
            "<span>" + ic("home") + tl(k.home) + (c.sp.na ? " (tahmin)" : "") + "</span>" +
            "<span>" + ic("thermo") + s.weather.hi + "° / " + s.weather.lo + "° · " + s.weather.rain + " mm</span>" +
            (bf ? "<span>" + ic("flower") + bf.hits + "/" + bf.n + " yıl tam çiçeklenme denk</span>" : "") + "</span>" +
          "<span class='sub'>" + esc(s.highlight) + "</span>" +
          "<span class='cmp-leave'>" + ic("calendar") + esc(s.leaveNote) + "</span>" +
        "</button>";
      }).join("") + "</div>";
  }

  let tickCtx = null;
  function tick(ctx) {
    if (ctx) tickCtx = ctx;
    const c = tickCtx;
    if (!c) return;
    const now = Date.now(), start = departInstant(c), end = returnEnd(c);
    const cd = $("countdown"), title = $("heroTitle");
    if (cd && title) {
      if (now < start) {
        const ms = start - now, dd = Math.floor(ms / 864e5), hh = Math.floor(ms % 864e5 / 36e5), mm = Math.floor(ms % 36e5 / 6e4);
        title.textContent = "Seul'e " + dd + " gün kaldı";
        cd.innerHTML = "<div><b>" + dd + "</b><span>gün</span></div><div><b>" + hh + "</b><span>saat</span></div><div><b>" + mm + "</b><span>dakika</span></div>";
      } else if (now <= end) {
        const n = diff(c.arrDate, seoulToday()) + 1;
        title.textContent = n >= 1 ? "Seul'desiniz · " + n + ". gün" : "Yoldasınız";
        cd.innerHTML = "<div><b>" + Math.max(0, diff(seoulToday(), c.retDate)) + "</b><span>gün kaldı</span></div>";
      } else {
        title.textContent = "Tatil tamamlandı";
        cd.innerHTML = "";
      }
    }
    const clock = $("seoulClock");
    if (clock) {
      const t = new Intl.DateTimeFormat("tr-TR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }).format(new Date());
      const dt = new Intl.DateTimeFormat("tr-TR", { timeZone: "Asia/Seoul", weekday: "long", day: "numeric", month: "long" }).format(new Date());
      clock.textContent = t;
      $("seoulDate").textContent = dt;
    }
  }

  // ---------- Seul şu an: saat + canlı hava (Open-Meteo) ----------
  const WX = (code) => {
    if (code === 0) return ["sun", "Açık"];
    if (code <= 2) return ["cloud-sun", "Parçalı bulutlu"];
    if (code === 3) return ["cloud", "Kapalı"];
    if (code === 45 || code === 48) return ["fog", "Sisli"];
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return ["cloud-snow", "Kar"];
    if (code >= 51 && code <= 67) return ["cloud-rain", code < 60 ? "Çisenti" : "Yağmur"];
    if (code >= 80 && code <= 82) return ["cloud-rain", "Sağanak"];
    if (code >= 95) return ["cloud-rain", "Fırtına"];
    return ["cloud", "—"];
  };
  function renderNow(wx, stale) {
    const head = "<div class='card-head'><h2><span class='h-ic'>" + ic("globe") + "</span>Seul şu an</h2><span class='tag blue'>Türkiye +6 saat</span></div>";
    let body = "<div class='now'><div><div class='clock' id='seoulClock'>--:--</div><div class='sub' id='seoulDate'></div></div>";
    if (wx && wx.current) {
      const [icon, txt] = WX(wx.current.weather_code);
      body += "<div class='wx'>" + ic(icon) + "<div><b class='num'>" + Math.round(wx.current.temperature_2m) + "°</b><div class='sub'>" + txt + " · hissedilen " + Math.round(wx.current.apparent_temperature) + "°</div></div></div></div>";
      if (wx.daily) {
        body += "<div class='forecast'>" + wx.daily.time.slice(0, 4).map((t, i) => {
          const [di] = WX(wx.daily.weather_code[i]);
          return "<div><span>" + (i === 0 ? "Bugün" : DAYS[d(t).getUTCDay()]) + "</span>" + ic(di) + "<span class='num'><b>" + Math.round(wx.daily.temperature_2m_max[i]) + "°</b> / " + Math.round(wx.daily.temperature_2m_min[i]) + "°</span></div>";
        }).join("") + "</div>";
      }
      body += "<p class='sub'>" + (stale ? "Çevrimdışı; son alınan veri gösteriliyor." : "Canlı veri: Open-Meteo.") + " Yolculuk tarihleri için tahmin, gidişten yaklaşık 2 hafta önce anlamlı hale gelir.</p>";
    } else {
      body += "<div class='wx sub'>Hava durumu yüklenemedi</div></div><p class='sub'>Aralık ortalaması 0,2 °C; gece −3,4 °C.</p>";
    }
    $("seoulNow").innerHTML = head + body;
    tick();
  }
  async function loadWeather() {
    let cached = null;
    try { cached = JSON.parse(localStorage.getItem(WX_KEY) || "null"); } catch (e) { /* yok */ }
    if (cached && Date.now() - cached.at < 30 * 60 * 1000) { renderNow(cached.data, false); return; }
    renderNow(cached && cached.data, !!cached);
    try {
      const url = "https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.978&current=temperature_2m,apparent_temperature,weather_code" +
        "&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FSeoul&forecast_days=4";
      const r = await fetch(url);
      if (!r.ok) throw new Error(r.status);
      const data = await r.json();
      try { localStorage.setItem(WX_KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) { /* kota */ }
      renderNow(data, false);
    } catch (e) { renderNow(cached && cached.data, true); }
  }

  // ---------- Kur çevirici ----------
  const parseNum = s => { const v = parseFloat(String(s).replace(/\./g, "").replace(",", ".").replace(/[^\d.]/g, "")); return isFinite(v) ? v : 0; };
  const fmtNum = (v, dec) => v.toLocaleString("tr-TR", { maximumFractionDigits: dec });
  function fxFrom(which) {
    if (which === "try") $("fxKrw").value = fmtNum(parseNum($("fxTry").value) / KRW_TRY, 0);
    else $("fxTry").value = fmtNum(parseNum($("fxKrw").value) * KRW_TRY, 2);
  }

  // ---------- TUR ----------
  function renderTour(ctx, tour, costs) {
    const input = $("originInput");
    if (document.activeElement !== input) input.value = state.origin;
    $("originName").textContent = ctx.home.custom || ctx.stay.name;
    $("originNote").textContent = ctx.home.custom
      ? "Google rotaları yazdığınız adresten başlar. Naver ve Kakao her zaman telefonun bulunduğu konumdan rota çizer."
      : "Rotalar \"" + ctx.stay.origin + "\" noktasından hesaplanıyor" + (ctx.stay.approx ? " (tam adres rezervasyondan sonra paylaşılır; yaklaşık konum)." : ".");
    const placed = Object.keys(tour.placedOn).length;
    $("tourSub").textContent = fmtD(ctx.arrDate) + "–" + fmtD(ctx.retDate) + " · " + ctx.days + " gün · " + ctx.stay.name;
    $("tourStat").innerHTML =
      "<span>" + ic("pin") + "<b>" + placed + "</b> yer</span>" +
      "<span>" + ic("ticket") + "Biletler kişi başı <b>" + tl(costs.tickets) + "</b></span>" +
      "<span class='noprint'><a href='#kesfet'>Yer ekle / çıkar</a>" + ic("arrow-right") + "</span>";

    const today = seoulToday();
    $("dayChips").innerHTML = tour.days.map((day, i) => {
      const x = d(day.date);
      return "<a href='#tur/gun-" + (i + 1) + "' class='" + (day.date === today ? "today " : "") + (day.kind === "nye" ? "nye" : "") + "'><span>" + DAYS[x.getUTCDay()] + "</span><b>" + x.getUTCDate() + "</b><span>" + (i + 1) + ". gün</span></a>";
    }).join("");

    const KIND = { arrival: ["Varış günü", "blue", "plane"], departure: ["Dönüş günü", "blue", "plane"], nye: ["Yılbaşı gecesi", "", "sparkles"], newyear: ["Yeni yıl · resmi tatil", "warn", "sparkles"], full: ["Tam gün", "good", "route"] };
    $("days").innerHTML = tour.days.map((day, i) => {
      const x = d(day.date);
      let [tag, tone, tIcon] = KIND[day.kind];
      if (day.date === "2026-12-25") { tag += " · Noel (resmi tatil)"; tone = "warn"; }
      if (day.trip) { tag = "Günübirlik gezi"; tone = "good"; tIcon = "bus"; }
      const stops = [];
      let prev = ctx.origin;
      const stop = (time, title, how, cls, color, go) => stops.push("<li class='stop" + (cls ? " " + cls : "") + "'" + (color ? " style='--c: var(--c-" + color + ")'" : "") + ">" +
        "<span class='t'>" + time + "</span><span class='dot' aria-hidden='true'></span><div class='what'>" + title + (how ? "<div class='how'>" + how + "</div>" : "") + (go ? "<div class='go'>" + go + "</div>" : "") + "</div></li>");

      if (day.kind === "arrival") {
        stop(ctx.flight.arr, "<b>Incheon'a varış</b>", "Pasaport ve bagaj sonrası AREX/limuzin ile konaklamaya. T-money kartı alın ve yükleyin.", "note", "", navButtons("home", ctx, ICN.q, "pill"));
        stop(hm(ctx.homeH), "<b>Konaklamaya giriş · " + esc(ctx.stay.name) + "</b>", ctx.homeH < 15 ? "Giriş saatinden önce: bavulları bırakın." : "", "note");
      }
      if (day.kind === "departure") {
        stop("Sabah", "<b>Çıkış ve havalimanı</b>", "Dönüş uçuşundan en az 3 saat önce havalimanında olun. AREX Ekspres Seul İstasyonu'ndan 43 dk; genel tren 59 dk.", "note", "", navButtons("icn", ctx, ctx.origin, "pill"));
      }
      schedule(day, ctx).forEach(s => {
        const p = s.p;
        stop(hm(s.h), "<b>" + esc(p.name) + " <span class='ko' lang='ko'>" + esc(p.ko) + "</span></b>",
          esc(p.station) + (p.fee ? " · " + won(p.fee) : "") + "<br>" + esc(tipFor(p, ctx.season)), "", p.cats[0], navButtons("place:" + p.id, ctx, prev, "pill"));
        prev = p.q;
      });
      if (!day.items.length && !day.trip && !day.evening && (day.kind === "full" || day.kind === "newyear" || day.kind === "nye")) {
        stop("–", "<b>Serbest gün</b>", "Keşfet sekmesinden yer ekleyin veya dinlenme/alışveriş günü yapın.", "note");
      }
      if (day.kind !== "departure" && prev !== ctx.origin) {
        stop("Dönüş", "<b>Konaklamaya dönüş</b>", day.kind === "nye" && day.evening && day.evening.id === "bosingak" ? "2025'te metro 02:00'ye kadar çalıştı; 2026 duyurusunu kontrol edin." : "", "note", "", navButtons("home", ctx, prev, "pill"));
      }
      const notes = [];
      if (day.cluster && LUNCH[day.cluster] && (day.items.length || day.trip)) notes.push(LUNCH[day.cluster]);
      if (day.kind === "newyear") notes.push("1 Ocak resmi tatil: Ulusal Müze kapalı, birçok yer geç açılır.");
      if (day.kind === "nye") notes.push("Akşam yemeğini önceden ayırtın; törene erken gidin.");
      const numCls = day.kind === "nye" ? " nye" : day.trip ? " trip" : "";
      return "<article class='day" + (day.date === today ? " today" : "") + "' id='gun-" + (i + 1) + "'><div class='dh'><span class='dnum" + numCls + "' aria-hidden='true'>" + (i + 1) + "</span>" +
        "<div class='dtitle'><h3>" + (i + 1) + ". gün · " + x.getUTCDate() + " " + MONTHS_L[x.getUTCMonth()] + "</h3><span class='sub'>" + DAYS_L[x.getUTCDay()] + (day.date === today ? " · bugün" : "") + "</span></div>" +
        "<span class='tag " + tone + "'>" + ic(tIcon) + tag + "</span></div>" +
        "<ol class='stops'>" + stops.join("") + "</ol>" +
        (notes.length ? "<p class='dnote'>" + ic("utensils") + "<span>" + notes.map(esc).join(" ") + "</span></p>" : "") + "</article>";
    }).join("");

    $("unplacedCard").hidden = !tour.unplaced.length;
    $("unplaced").innerHTML = tour.unplaced.map(([p, why]) => "<li><b>" + esc(p.name) + "</b> — " + esc(why) + "</li>").join("");
  }

  // ---------- KEŞFET ----------
  function renderExplore(ctx, tour) {
    if (!$("catSeg").childElementCount) {
      $("catSeg").innerHTML = CATS.map(([k, l]) => "<button type='button' data-cat='" + k + "'>" + (CAT_META[k] ? ic(CAT_META[k].icon) : "") + l + "</button>").join("");
    }
    const seasonal = PLACES.filter(p => inSeason(p, ctx.season));
    document.querySelectorAll("#catSeg button").forEach(b => {
      b.setAttribute("aria-pressed", b.dataset.cat === state.cat ? "true" : "false");
      b.hidden = b.dataset.cat !== "all" && !seasonal.some(p => p.cats.includes(b.dataset.cat));
    });
    if (state.cat !== "all" && !seasonal.some(p => p.cats.includes(state.cat))) state.cat = "all";
    const q = state.q.trim().toLocaleLowerCase("tr");
    const list = seasonal.filter(p => (state.cat === "all" || p.cats.includes(state.cat)) &&
      (!q || [p.name, p.ko, p.desc, p.station].join(" ").toLocaleLowerCase("tr").includes(q)));
    const nPick = seasonal.filter(p => state.picks[p.id]).length;
    const hiddenN = PLACES.length - seasonal.length;
    $("placeCount").textContent = ctx.S.label + " dönemi · " + nPick + " yer turda · " + Object.keys(tour.placedOn).length + " tanesi günlere yerleşti" +
      (hiddenN ? " · başka döneme ait " + hiddenN + " yer gizli" : "");
    $("placesEmpty").hidden = list.length > 0;
    $("places").innerHTML = list.map(p => {
      const on = !!state.picks[p.id];
      const di = tour.placedOn[p.id];
      const meta = CAT_META[p.cats[0]];
      const status = on ? (di !== undefined ? "<a class='tag good' href='#tur/gun-" + (di + 1) + "'>" + ic("calendar") + (di + 1) + ". gün · " + fmtD(tour.days[di].date) + "</a>" : "<span class='tag warn'>" + ic("alert") + "Plana sığmadı</span>") : "";
      const closedTxt = [
        p.closed && p.closed.length ? p.closed.map(i => DAYS_L[i]).join(", ") + " kapalı" : "",
        p.closedDates ? p.closedDates.map(fmtD).join(", ") + " kapalı" : "",
        p.window ? fmtD(p.window[0]) + "–" + fmtD(p.window[1]) + " arası" : "",
        p.pin ? fmtD(p.pin) + " gecesi" : ""
      ].filter(Boolean).join(" · ");
      const fee = p.fee === null ? "Değişken" : p.fee === 0 ? "Ücretsiz" : won(p.fee) + " ≈ " + tl(p.fee * KRW_TRY);
      const kv = (icon, label, val) => "<div><dt>" + ic(icon) + "<span class='sr'>" + label + "</span></dt><dd>" + val + "</dd></div>";
      const cr = R.images[p.id], rt = R.ratings[p.id], tr = R.trmap[p.id];
      const photo = cr
        ? "<figure class='photo'><img src='assets/img/" + p.id + ".jpg' alt='" + esc(p.name) + " fotoğrafı' loading='lazy' width='800' height='500'>" +
            "<span class='ph-cat'><span class='cat-ic'>" + ic(meta.icon) + "</span>" + meta.label + "</span><span class='ph-st'>" + status + "</span>" +
            "<figcaption>Foto: " + esc(cr.artist) + " · <a href='" + esc(cr.page) + "' target='_blank' rel='noopener'>" + esc(cr.lic) + "</a></figcaption></figure>"
        : "<div class='cover'><span class='cat-ic'>" + ic(meta.icon) + "</span><span class='cat'>" + meta.label + "</span>" + status + "</div>";
      const voices = rt && (rt.praise.length || rt.complaints.length)
        ? "<details class='voices'><summary>" + ic("message") + "<span>Ziyaretçiler ne diyor?</span>" + ic("chevron", "chev") + "</summary>" +
            (rt.verdict ? "<p class='verdict'>" + (ctx.season !== "yilbasi" ? "<small class='sub'>Kış ziyareti değerlendirmesi: </small>" : "") + esc(rt.verdict) + "</p>" : "") +
            (rt.praise.length ? "<ul class='vl good'>" + rt.praise.map(x => "<li>" + ic("check-circle") + "<span>" + esc(x) + "</span></li>").join("") + "</ul>" : "") +
            (rt.complaints.length ? "<ul class='vl bad'>" + rt.complaints.map(x => "<li>" + ic("minus-circle") + "<span>" + esc(x) + "</span></li>").join("") + "</ul>" : "") +
            (tr && tr.comment ? "<p class='trc'>" + ic("users") + "<span><b>Türk bloglarında:</b> " + cite(tr.comment) + "</span></p>" : "") +
            "<p class='sub'>Kaynak: " + rt.sources.map(u => "<a href='" + esc(u) + "' target='_blank' rel='noopener'>" + esc(new URL(u).hostname.replace(/^www\./, "")) + "</a>").join(", ") + "</p></details>"
        : "";
      const rateRow = (rt && (rt.g || rt.ta)) || tr
        ? "<div class='rate'>" + rateLine(rt) + (tr ? "<a class='rb tr' href='#kesfet/turkler'>" + ic("users") + "<b>" + tr.n + "/" + NSRC + "</b> Türk blogunda</a>" : "") + "</div>"
        : "";
      return "<article class='place" + (on ? " on" : "") + "' style='--c: var(--c-" + p.cats[0] + ")'>" + photo +
        "<div class='pbody'>" +
          "<h3>" + esc(p.name) + "<span class='ko' lang='ko'>" + esc(p.ko) + "</span></h3>" + rateRow +
          "<p class='sub'>" + esc(p.desc) + "</p>" +
          "<dl class='kv'>" +
            kv(p.when === "evening" ? "moon" : "clock", "Süre", (p.trip ? "Tam gün" : "~" + String(p.hours).replace(".", ",") + " saat") + " · " + (p.when === "evening" ? "akşam" : p.when === "flex" ? "gündüz veya akşam" : "gündüz")) +
            kv("ticket", "Ücret", fee + (p.feeNote ? "<span class='det'>" + esc(p.feeNote) + "</span>" : "")) +
            kv("train", "Nasıl gidilir", esc(p.station)) +
            (closedTxt ? kv("calendar", "Takvim", esc(closedTxt)) : "") +
            kv("bulb", "İpucu", esc(tipFor(p, ctx.season))) +
          "</dl>" + voices +
          (p.unconfirmed ? "<p class='callout'>" + ic("alert") + "<span>2026 tarihleri henüz açıklanmadı; gitmeden kontrol edin.</span></p>" : "") +
        "</div>" +
        "<div class='foot'>" +
          "<button type='button' class='btn sm" + (on ? " on" : "") + "' data-pick='" + p.id + "' aria-pressed='" + on + "' style='justify-self:stretch'>" + ic(on ? "check" : "plus") + (on ? "Turda" : "Tura ekle") + "</button>" +
          "<div class='navrow'>" + navButtons("place:" + p.id, ctx) + "</div>" +
        "</div></article>";
    }).join("");
    renderRestaurants(ctx);
    renderTurks(tour);
  }

  function renderRestaurants(ctx) {
    const multi = RESTS.filter(r => r.m.length >= 2).length;
    $("restIntro").innerHTML = "Türkçe " + NSRC + " blog/gezi yazısından derlendi; en çok bahsedilenler üstte. Çoğu Türk blogu mekan adı vermiyor, bu yüzden listedeki " + RESTS.length + " mekanın " + multi + " tanesi birden fazla kaynakta geçiyor; tek kaynaklı olanlar kişisel öneridir, <b>puan değildir</b>. Hangul adı olmayanlarda Naver/Kakao İngilizce adla arar.";
    if (!$("restFilter").childElementCount) $("restFilter").innerHTML = REST_KINDS.map(([k, l]) => "<button type='button' data-rf='" + k + "'>" + l + "</button>").join("");
    document.querySelectorAll("#restFilter button").forEach(b => b.setAttribute("aria-pressed", b.dataset.rf === state.restKind ? "true" : "false"));
    const list = RESTS.filter(r => state.restKind === "all" || restKind(r) === state.restKind);
    $("restEmpty").hidden = list.length > 0;
    $("restaurants").innerHTML = list.map(r => {
      const kind = restKind(r);
      const kv = (icon, label, val) => "<div><dt>" + ic(icon) + "<span class='sr'>" + label + "</span></dt><dd>" + val + "</dd></div>";
      const color = kind === "kafe" ? "--c-alisveris" : kind === "helal" ? "--c-gunubirlik" : kind === "pazar" ? "--c-yemek" : "--c-tarih";
      return "<article class='place rest' style='--c: var(" + color + ")'>" +
        "<div class='cover'><span class='cat-ic'>" + ic(kind === "kafe" ? "coffee" : "utensils") + "</span><span class='cat'>" + esc(r.type || "") + "</span>" +
          (r.halal === "yes" ? "<span class='tag good'>" + ic("check") + "Helal etiketli</span>" : "") + "</div>" +
        "<div class='pbody'>" +
          "<h3>" + esc(r.name) + (r.ko ? "<span class='ko' lang='ko'>" + esc(r.ko) + "</span>" : "") + "</h3>" +
          "<div class='rate'><a class='rb tr' href='#kesfet/turkler'>" + ic("users") + "<b>" + r.m.length + "/" + NSRC + "</b> blogda</a><span class='rb plain'>" + ic("pin") + esc(r.area || "") + "</span></div>" +
          "<dl class='kv'>" +
            (r.order ? kv("utensils", "Ne yenmiş", esc(r.order)) : "") +
            (r.note ? kv("message", "Türk gezginler", cite(r.note)) : "") +
            (r.price ? kv("ticket", "Fiyat", esc(r.price)) : "") +
            (r.station ? kv("train", "Nasıl gidilir", esc(r.station)) : "") +
            kv("list-check", "Kaynaklar", citeList(r.m) || "—") +
          "</dl></div>" +
        "<div class='foot'><div class='navrow'>" + navButtons(r.key, ctx) + "</div></div></article>";
    }).join("");
  }

  function renderTurks(tour) {
    const planned = id => id && state.picks[id];
    $("trIntro").innerHTML = NSRC + " Türkçe kaynakta adı geçen yerler, kaç kaynakta geçtiğine göre sıralı. Bu bir <b>anılma sayısı</b>: çoğu yazı liste halinde yazılmış, \"gitti ve beğendi\" demek değil. Gerçek yorum olanlar aşağıda alıntılandı; köşeli parantezler kaynak bloga gider.";
    $("trPlaces").innerHTML = R.tr.places.map(p => {
      const pct = Math.round(p.n / NSRC * 100);
      const dst = { name: p.name, ko: p.ko, q: p.name + ", Seoul" };
      const links = p.id
        ? "<a class='btn ghost sm' href='#kesfet/yerler'>" + (planned(p.id) ? ic("check") + "Turda" : "Yerlerde gör") + "</a>"
        : "<a class='pill' href='" + NAV.naver(dst).web + "' target='_blank' rel='noopener'>" + mono("n", "N") + "Naver</a><a class='pill' href='" + gRoute(tour ? context().origin : "Seoul", dst.q) + "' target='_blank' rel='noopener'>" + mono("g", "G") + "Google</a>";
      return "<div class='trrow'><div class='trhead'><div><b>" + esc(p.name) + "</b>" + (p.ko ? " <span class='ko' lang='ko'>" + esc(p.ko) + "</span>" : "") +
        (p.id ? " <span class='tag good'>Planında seçenek var</span>" : " <span class='tag'>Keşfet listende yok</span>") + "</div>" +
        "<span class='num trn'><b>" + p.n + "</b>/" + NSRC + "</span></div>" +
        "<div class='bar' role='img' aria-label='" + NSRC + " kaynağın " + p.n + " tanesinde geçiyor'><span style='width:" + pct + "%'></span></div>" +
        (p.comment ? "<p class='sub'>" + cite(p.comment) + "</p>" : "") +
        "<div class='actions'>" + links + "</div></div>";
    }).join("");
    $("trTips").innerHTML = R.tr.tips.map(t => "<li>" + cite(t.text) + " " + citeList(t.mentions || []) + "</li>").join("");
    $("trSources").innerHTML = R.tr.sources.map(s => "<li><a href='" + esc(s.url) + "' target='_blank' rel='noopener'>" + esc(s.title) + "</a> <span class='sub'>· " + esc(s.site) + (s.date ? " · " + esc(s.date) : "") + "</span></li>").join("");
  }

  // ---------- PLANLA ----------
  function buildMatrix() {
    const t = $("matrix");
    let html = "<thead><tr><th class='row'>Gidiş ↓ / Dönüş →</th>";
    rets.forEach(r => { html += "<th class='" + (r >= "2027-01-01" ? "nye" : "") + "'>" + DAYS[d(r).getUTCDay()] + "<span class='d'>" + fmtD(r) + "</span></th>"; });
    html += "</tr></thead><tbody>";
    deps.forEach((dp, di) => {
      html += "<tr><th class='row'><span class='d'>" + fmtD(dp) + "</span>" + DAYS[d(dp).getUTCDay()] + "</th>";
      rets.forEach((r, ri) => {
        if (matrixNights(di, ri) < 1) { html += "<td class='na'>–</td>"; return; }
        if (P[di][ri] === null) { html += "<td class='na'>fiyat yok</td>"; return; }
        const nye = matrixNYE(di, ri);
        html += "<td tabindex='0' role='button' data-di='" + di + "' data-ri='" + ri + "' class='" + tier(P[di][ri]) + "' aria-label='" +
          fmtD(dp) + " gidiş, " + fmtD(r) + " dönüş, " + n0(P[di][ri]) + " TL" + (nye ? ", yılbaşı Seul'de" : "") + "'>" +
          n0(P[di][ri]) + (nye ? "<span class='nyetag'>YILBAŞI</span>" : "") + "</td>";
      });
      html += "</tr>";
    });
    t.innerHTML = html + "</tbody>";
    const pick = td => { state.di = +td.dataset.di; state.ri = +td.dataset.ri; state.alt = null; render(); toast(fmtD(deps[state.di]) + " → " + fmtD(rets[state.ri]) + " seçildi"); };
    t.addEventListener("click", e => { const td = e.target.closest("td[data-di]"); if (td) pick(td); });
    t.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const td = e.target.closest("td[data-di]");
      if (td) { e.preventDefault(); pick(td); }
    });
  }

  function renderBudget(ctx, costs) {
    const f = ctx.flight;
    document.querySelectorAll("#matrix td[data-di]").forEach(td => {
      const on = state.alt === null && +td.dataset.di === state.di && +td.dataset.ri === state.ri;
      td.classList.toggle("sel", on);
      td.setAttribute("aria-pressed", on ? "true" : "false");
    });
    const spring = ctx.season !== "yilbasi";
    $("matrixCard").hidden = spring;
    $("tripCard").hidden = !spring;
    if (spring) renderTrips(ctx);
    $("timeSeg").hidden = spring || state.alt !== null;
    ["t1", "t2"].forEach(k => $(k).setAttribute("aria-pressed", k === state.t ? "true" : "false"));
    $("fTitle").textContent = f.airline;
    $("fPrice").textContent = n0(f.price) + " TL / kişi";
    $("timeline").innerHTML =
      "<span class='t'>" + fmtDL(f.depDate) + " · " + f.dep + "</span><span>İstanbul Havalimanı'ndan kalkış</span>" +
      "<span class='t'>" + (f.direct ? "Uçuş" : "Aktarma") + "</span><span>" + esc(f.direct ? "Aktarmasız, " + f.dur : f.via) + "</span>" +
      "<span class='t'>" + fmtDL(ctx.arrDate) + " · " + f.arr + "</span><span>Incheon'a varış (toplam " + f.dur + ")</span>" +
      "<span class='t'>" + fmtDL(f.retDate) + "</span><span>Seul'den dönüş</span>";
    $("flightLink").href = f.link;
    $("flightNote").textContent = (f.note ? f.note + " " : "") + "Dönüş uçuşunun saatleri link açılınca görünür. Bagajlı tarifeyi seçin." +
      (state.alt !== null ? " Bu fiyat yalnızca 25 Ara–1 Oca içindir; başka tarih için matristen seçin." : "") +
      (state.alt === null && state.t === "t1" ? " Not: 7 Kasım'daki 25 Aralık aramasında 13:50 kalkışlı sefer Doha'da 8 sa 35 dk bekleyip 17:15'te varıyordu; 10:30 varışlı bağlantıyı linkte doğrulayın." : "");

    const s = ctx.stay;
    let arrival;
    if (ctx.homeH < 15) {
      arrival = "İniş " + f.arr + ", konaklamaya varış (pasaport, bagaj ve ulaşımla) yaklaşık " + hm(ctx.homeH) + ". Giriş genelde 15:00–16:00. " +
        (s.early ? s.early : s.kind === "otel" ? "Otele bavulları erken bırakıp bırakamayacağınızı sorun." : "Ev sahibine erken giriş veya bagaj bırakmayı önceden sorun.");
    } else if (ctx.homeH <= 20) {
      arrival = "İniş " + f.arr + ", konaklamaya varış yaklaşık " + hm(ctx.homeH) + ". Normal giriş saatinden sonra; ilk akşam mahallede yemek ve dinlenme.";
    } else {
      arrival = "İniş " + f.arr + ", konaklamaya varış yaklaşık " + hm(ctx.homeH) + ". Geç giriş için ev sahibine/otele haber verin; AREX son seferlerine dikkat.";
    }
    $("arrivalNote").textContent = arrival;
    $("stayLine").innerHTML =
      "<span class='t'>Konaklama</span><span>" + esc(s.name) + " · " + esc(s.where) + "</span>" +
      "<span class='t'>Giriş</span><span>" + fmtDL(ctx.arrDate) + "</span>" +
      "<span class='t'>Çıkış</span><span>" + fmtDL(ctx.retDate) + "</span>" +
      "<span class='t'>Süre</span><span>" + ctx.nights + " gece, " + ctx.days + " gün Seul'de</span>" +
      seasonRow(ctx);

    if (!$("foodSeg").childElementCount) $("foodSeg").innerHTML = FOOD.map((x, i) => "<button type='button' data-food='" + i + "'>" + x.label + " · " + won(x.krw) + "</button>").join("");
    document.querySelectorAll("#foodSeg button").forEach(b => b.setAttribute("aria-pressed", +b.dataset.food === state.food ? "true" : "false"));
    const ft = FOOD[state.food];
    $("foodNote").innerHTML = "Kişi başı günde " + won(ft.krw) + " ≈ " + tl(ft.krw * KRW_TRY) + " (" + ft.desc + "). " +
      ctx.days + " gün × 4 kişi = <strong class='num'>" + tl(costs.food * PEOPLE) + "</strong>, kişi başı " + tl(costs.food) + ".";

    const row = (icon, tone, label, det, pp) => "<tr><td><div class='row-l'><span class='h-ic" + (tone ? " " + tone : "") + "'>" + ic(icon) + "</span><span>" + label +
      "<span class='det'>" + det + "</span></span></div></td><td>" + tl(pp) + "</td><td>" + tl(pp * PEOPLE) + "</td></tr>";
    $("breakdown").innerHTML =
      row("plane", "", "Uçak", esc(f.airline) + ", " + fmtD(f.depDate) + " → " + fmtD(f.retDate), costs.flight) +
      row("home", "", "Konaklama", esc(s.name) + ", " + ctx.nights + " gece " + (ctx.sp.na ? "(bu tarihte müsait görünmüyor; Aralık fiyatıyla tahmin)" : "(tahmini)"), costs.home) +
      row("utensils", "amber", "Yemek", ft.label + ", " + ctx.days + " gün", costs.food) +
      row("train", "", "Şehir içi ulaşım", "AREX gidiş-dönüş + İklim Kartı (tahmini)", costs.transport) +
      row("ticket", "red", "Gezi biletleri", costs.ticketCount + " ücretli yer, plana yerleşenler", costs.tickets) +
      row("shield", "green", "K-ETA", "Elektronik seyahat izni, " + won(KETA_KRW), costs.keta) +
      "<tr class='sum'><td>Toplam</td><td>" + tl(costs.total) + "</td><td>" + tl(costs.total * PEOPLE) + "</td></tr>";
    const bn = $("budgetNote");
    if (f.price <= BUDGET) { bn.className = "budget ok"; bn.innerHTML = ic("check-circle") + "<span>Uçak kişi başı 40.000 TL bütçesinin " + n0(BUDGET - f.price) + " TL altında.</span>"; }
    else { bn.className = "budget over"; bn.innerHTML = ic("alert") + "<span>Uçak kişi başı 40.000 TL bütçesini " + n0(f.price - BUDGET) + " TL aşıyor.</span>"; }
  }

  // Dönemin kısa bilgisi: yılbaşı gecesi, Kore'de bayram, sakura denk gelme oranı.
  function bloomFit(ctx) {
    const B = ctx.S.bloom;
    if (!B) return null;
    const hits = B.filter(([, , full]) => { const dt = "2027-" + full; return dt >= ctx.arrDate && dt < ctx.retDate; });
    return { hits: hits.length, n: B.length, years: hits.map(h => h[0]) };
  }
  function seasonRow(ctx) {
    if (ctx.season === "yilbasi") return "<span class='t'>Yılbaşı</span><span>" + (ctx.nye ? "31 Aralık gecesi Seul'desiniz" : "Bu tarihlerde yılbaşı Seul'de geçmiyor") + "</span>";
    if (ctx.season === "bayram") {
      const ok = ctx.arrDate < "2027-03-09" || (ctx.arrDate === "2027-03-09" && ctx.homeH + 0.5 <= 7.5);
      return "<span class='t'>Bayram</span><span>TR'de 9–11 Mart. " + (ok ? "9 Mart sabahı Seul'desiniz; bayram namazına yetişirsiniz." : "9 Mart sabahı henüz Seul'de değilsiniz; Kore'de bayram 9 Mart'sa namazı kaçırırsınız.") + "</span>";
    }
    const bf = bloomFit(ctx);
    return "<span class='t'>Sakura</span><span>Son " + bf.n + " yılın " + bf.hits + "'ünde Yeouido'nun tam çiçeklenmesi bu tarihlere denk geldi.</span>";
  }

  function renderTrips(ctx) {
    const S = ctx.S;
    $("tripCard").innerHTML =
      "<div class='card-head'><h2><span class='h-ic' style='background:color-mix(in srgb," + S.color + " 15%, var(--surface));color:" + S.color + "'>" + ic(S.icon) + "</span>" + S.label + " · tarih seçenekleri</h2>" +
        "<a class='btn ghost sm' href='#planla/ucus'>Tüm uçuşlar" + ic("arrow-right") + "</a></div>" +
      "<p class='hint'>" + ic("info") + "<span>" + esc(S.leaveNote) + " Fiyatlar 8 Kasım 2026'da Google Uçuşlar'da görülen kişi başı gidiş-dönüş fiyatlarıdır.</span></p>" +
      "<div class='trips'>" + S.trips.map(tr => {
        const on = tr.id === tripOf(ctx.season).id;
        const ok = tr.flights.filter(f => durMin(f.dur) <= 20 * 60);
        const cheapest = (ok.length ? ok : tr.flights).slice().sort((a, b) => a.price - b.price)[0];
        const direct = tr.flights.filter(f => f.direct).sort((a, b) => a.price - b.price)[0];
        let extra = "";
        if (S.bloom) {
          const arr = addDays(tr.dep, 1);
          const hits = S.bloom.filter(([, , full]) => { const dt = "2027-" + full; return dt >= arr && dt < tr.ret; }).length;
          extra = "<span class='tag' style='background:color-mix(in srgb,var(--c-bahar) 15%,var(--surface));color:var(--c-bahar)'>" + ic("flower") + hits + "/" + S.bloom.length + " yıl tam çiçeklenme</span>";
        }
        return "<button type='button' class='trip" + (on ? " on" : "") + "' data-trip='" + tr.id + "' aria-pressed='" + on + "'>" +
          "<span class='tdates'><b>" + fmtD(tr.dep) + " → " + fmtD(tr.ret) + "</b><small>" + DAYS_L[d(tr.dep).getUTCDay()] + " – " + DAYS_L[d(tr.ret).getUTCDay()] + "</small></span>" +
          "<span class='sub'>" + esc(tr.leave) + "</span>" +
          "<span class='tprice'><span>En ucuz (≤20 sa) <b class='num'>" + tl(cheapest.price) + "</b> " + esc(cheapest.al) + "</span>" +
            (direct ? "<span>Aktarmasız <b class='num'>" + tl(direct.price) + "</b> " + esc(direct.al) + "</span>" : "") + "</span>" + extra +
          (on ? "<span class='tag blue'>" + ic("check") + "Planda</span>" : "") + "</button>";
      }).join("") + "</div>";
  }

  function renderFlights(ctx) {
    const spring = ctx.season !== "yilbasi";
    $("altTrips").hidden = !spring;
    if (spring) { renderSeasonFlights(ctx); return; }
    $("altTitle").textContent = "25 Aralık → 1 Ocak, tüm havayolları";
    $("altHint").textContent = "Google Uçuşlar'da 7 Kasım 2026'da görülen seçenekler; saatler gidiş uçuşu içindir. \"Plana uygula\" tarihleri 25 Ara–1 Oca'ya ayarlar ve toplamı bu fiyatla hesaplar.";
    renderDecFlights(ctx);
  }

  function renderSeasonFlights(ctx) {
    const S = ctx.S, tr = tripOf(ctx.season), sel = Math.min(state.fl[ctx.season] || 0, tr.flights.length - 1);
    $("altTitle").textContent = S.label + ": " + fmtD(tr.dep) + " → " + fmtD(tr.ret) + ", tüm havayolları";
    $("altHint").textContent = "Google Uçuşlar'da 8 Kasım 2026'da görülen seçenekler (1 yetişkin, ekonomi); saatler gidiş uçuşu içindir. Önce tarih seçeneğini, sonra uçuşu seçin.";
    $("altTrips").innerHTML = S.trips.map(t => "<button type='button' data-trip='" + t.id + "' aria-pressed='" + (t.id === tr.id) + "'>" + fmtD(t.dep) + " → " + fmtD(t.ret) + "</button>").join("");
    const fl = tr.flights.map((f, i) => Object.assign({ i }, f)).sort((a, b) => a.price - b.price);
    const ref = fl[0].price;
    const inB = fl.filter(f => f.price <= BUDGET && durMin(f.dur) <= 20 * 60);
    const best = inB.sort((a, b) => a.price - b.price)[0];
    const cd = fl.filter(f => f.direct)[0];
    $("altInsights").innerHTML =
      (best ? "<div class='callout info'>" + ic("check-circle") + "<span><b>Bütçe içinde, 20 saatten kısa en ucuz:</b> " + esc(best.al) + ", " + best.dur + ", " + tl(best.price) + ", varış " + best.arr + ".</span></div>"
        : "<div class='callout'>" + ic("alert") + "<span>Bu tarihte 40.000 TL altında, 20 saatten kısa uçuş görünmedi.</span></div>") +
      (cd ? "<div class='callout info'>" + ic("plane") + "<span><b>Aktarmasız en ucuz:</b> " + esc(cd.al) + ", " + tl(cd.price) + ", 4 kişi " + tl(cd.price * PEOPLE) + ".</span></div>" : "");
    $("alts").innerHTML = fl.map(a => {
      const dlt = a.price - ref;
      const on = a.i === sel;
      return "<div class='frow" + (on ? " on" : "") + "'>" +
        "<div class='airline'><span class='al-av' aria-hidden='true'>" + (AL_CODE[a.al] || a.al.slice(0, 2).toUpperCase()) + "</span><span><b>" + esc(a.al) + "</b>" + (a.note ? "<span class='det'>" + esc(a.note) + "</span>" : "") + "</span></div>" +
        "<div class='times'>" + a.dep + " → " + a.arr + (a.off ? "<sup>+" + a.off + "</sup>" : "") + "<span class='det'>" + a.dur + "</span></div>" +
        "<div class='dur sub'>" + (dlt === 0 ? "en ucuz" : "+" + n0(dlt) + " TL") + "</div>" +
        "<div class='via'>" + (a.direct ? "<span class='tag good'>" + ic("check") + "Aktarmasız</span>" : "<span class='sub'>" + esc(a.via) + "</span>") + "</div>" +
        "<div class='price'><b class='" + tier(a.price) + "'>" + n0(a.price) + " TL</b><span class='det'>4 kişi " + n0(a.price * PEOPLE) + "</span></div>" +
        "<div class='actions'>" +
          (on ? "<span class='tag blue'>" + ic("check") + "Planda</span>" : "<button type='button' class='btn ghost sm' data-sfl='" + a.i + "'>Plana uygula</button>") +
          "<a class='btn ghost sm icon-only' href='" + gflights(tr.dep, tr.ret, a.al.split(" / ")[0], a.direct) + "' target='_blank' rel='noopener' aria-label='" + esc(a.al) + " uçuşunu Google Uçuşlar'da aç'>" + EXT + "</a>" +
        "</div></div>";
    }).join("");
    searchLinks(ctx);
  }
  function searchLinks(ctx) {
    const dep = ctx.flight.depDate, ret = ctx.flight.retDate;
    $("searchDates").textContent = fmtDL(dep) + " → " + fmtDL(ret);
    $("searchLinks").innerHTML =
      extLink("btn", gflights(dep, ret, "", true), "Yalnızca aktarmasız") +
      extLink("btn ghost", gflights(dep, ret, ""), "Tüm havayolları") +
      SEARCH_AIRLINES.map(al => extLink("btn ghost sm", gflights(dep, ret, al), esc(al))).join("") +
      extLink("btn ghost sm", skyscanner(dep, ret), "Skyscanner (4 kişi)");
  }

  function renderDecFlights(ctx) {
    const ref = ALTS[1].price;
    const onIdx = state.alt !== null ? state.alt
      : (deps[state.di] === REF_DEP && rets[state.ri] === REF_RET ? ALTS.findIndex(a => a.qr === state.t) : -1);
    const inBudget = ALTS.filter(a => a.price <= BUDGET);
    const fastestIn = inBudget.slice().sort((a, b) => durMin(a.dur) - durMin(b.dur))[0];
    const cd = ALTS.filter(a => a.direct).sort((a, b) => a.price - b.price)[0];
    $("altInsights").innerHTML =
      "<div class='callout info'>" + ic("check-circle") + "<span><b>Bütçe içinde en hızlı:</b> " + esc(fastestIn.al) + ", " + fastestIn.dur + ", " + tl(fastestIn.price) + ". Qatar'dan " + tl(fastestIn.price - ref) + " pahalı, varış " + fastestIn.arr + ".</span></div>" +
      "<div class='callout info'>" + ic("plane") + "<span><b>Aktarmasız en ucuz:</b> " + esc(cd.al) + ", " + tl(cd.price) + ". Qatar'a göre kişi başı " + tl(cd.price - ref) + ", 4 kişi " + tl((cd.price - ref) * PEOPLE) + " fazla; gidiş yaklaşık " + Math.round((durMin(ALTS[1].dur) - durMin(cd.dur)) / 60) + " saat kısa.</span></div>";
    $("alts").innerHTML = ALTS.map((a, i) => {
      const dlt = a.price - ref;
      return "<div class='frow" + (i === onIdx ? " on" : "") + "'>" +
        "<div class='airline'><span class='al-av' aria-hidden='true'>" + (AL_CODE[a.al] || "") + "</span><span><b>" + esc(a.al) + "</b>" + (a.note ? "<span class='det'>" + esc(a.note) + "</span>" : "") + "</span></div>" +
        "<div class='times'>" + a.dep + " → " + a.arr + (a.off ? "<sup>+1</sup>" : "") + "<span class='det'>" + a.dur + "</span></div>" +
        "<div class='dur sub'>" + (dlt === 0 ? "referans" : (dlt > 0 ? "+" : "−") + n0(Math.abs(dlt)) + " TL") + "</div>" +
        "<div class='via'>" + (a.direct ? "<span class='tag good'>" + ic("check") + "Aktarmasız</span>" : "<span class='sub'>" + esc(a.via) + "</span>") + "</div>" +
        "<div class='price'><b class='" + tier(a.price) + "'>" + n0(a.price) + " TL</b><span class='det'>4 kişi " + n0(a.price * PEOPLE) + "</span></div>" +
        "<div class='actions'>" +
          (i === onIdx ? "<span class='tag blue'>" + ic("check") + "Planda</span>" : "<button type='button' class='btn ghost sm' data-alt='" + i + "'>Plana uygula</button>") +
          "<a class='btn ghost sm icon-only' href='" + gflights(REF_DEP, REF_RET, a.al, a.direct) + "' target='_blank' rel='noopener' aria-label='" + esc(a.al) + " uçuşunu Google Uçuşlar'da aç'>" + EXT + "</a>" +
        "</div></div>";
    }).join("");
    searchLinks(ctx);
  }

  function renderStays(ctx) {
    const ci = ctx.arrDate, co = ctx.retDate;
    $("areaDates").textContent = fmtD(ci) + "–" + fmtD(co) + " · " + ctx.nights + " gece";
    $("areas").innerHTML = AREAS.map(a =>
      "<div class='area" + (a.key === ctx.stay.area ? " here" : "") + "'>" +
        "<div class='card-head'><h3>" + esc(a.name) + "</h3>" + (a.key === ctx.stay.area ? "<span class='tag blue'>" + ic("pin") + "Seçili konaklama</span>" : "") + "</div>" +
        "<p class='pc plus'>" + ic("check-circle") + "<span>" + esc(a.good) + "</span></p>" +
        "<p class='pc minus'>" + ic("minus-circle") + "<span>" + esc(a.bad) + "</span></p>" +
        "<p class='pc air'>" + ic("plane") + "<span>" + esc(a.airport) + "</span></p>" +
        "<div class='actions'>" + extLink("btn ghost sm", airbnbArea(a.air, ci, co), "Airbnb'de ara") + extLink("btn ghost sm", bookingArea(a.bk, ci, co), "Booking'de ara") + "</div>" +
      "</div>").join("");
    document.querySelectorAll("#stayFilter button").forEach(b => b.setAttribute("aria-pressed", b.dataset.k === state.stayFilter ? "true" : "false"));
    const sp = x => stayPrice(x, ctx.season);
    const list = STAYS.filter(s => state.stayFilter === "all" || s.kind === state.stayFilter).slice()
      .sort((a, b) => (sp(a).na - sp(b).na) || sp(a).nightly - sp(b).nightly);
    $("homes").innerHTML = list.map(x => {
      const p = sp(x);
      const cost = p.nightly * ctx.nights;
      const on = x.id === state.stay;
      const area = AREAS.find(a => a.key === x.area);
      return "<div class='home' role='button' tabindex='0' data-stay='" + esc(x.id) + "' aria-pressed='" + on + "'>" +
        (on ? "<span class='selb'>" + ic("check") + "Seçili</span>" : "") +
        "<div class='top'><h3>" + esc(x.name) + "</h3><span class='rating'>" + ic("star") + x.rating + (x.kind === "otel" ? "/10" : "") + " <span class='muted' style='font-weight:400'>(" + x.reviews + ")</span></span></div>" +
        "<p class='sub'>" + esc(x.where) + "<br>" + esc(x.beds) + "</p>" +
        "<div class='chips'><span class='chip kind'>" + ic(x.kind === "ev" ? "home" : "building") + (x.kind === "ev" ? "Airbnb · tüm ev" : "Otel · 2 oda") + "</span><span class='chip'>" + ic("pin") + esc(area.name.split(" · ")[0]) + "</span>" +
          x.chips.map(c => "<span class='chip " + c[0] + "'>" + esc(c[1]) + "</span>").join("") + "</div>" +
        (x.early && ctx.homeH < 15 ? "<p class='sub' style='color:var(--good)'>" + ic("check-circle") + " " + esc(x.early) + "</p>" : "") +
        (p.na ? "<p class='callout'>" + ic("alert") + "<span>" + esc(ctx.S.label) + " tarihlerinde (" + fmtD(ctx.S.stayRange[0]) + "–" + fmtD(ctx.S.stayRange[1]) + ") müsait görünmedi; fiyat Aralık'tan tahmin. Linkten kontrol edin.</span></p>" : "") +
        "<div class='cost'><span class='sub'>" + ctx.nights + " gece · gecelik ~" + n0(p.nightly) + " TL" + (p.na ? " (tahmin)" : "") + "<br>aile başı ~" + n0(cost / 2) + " TL · kişi başı ~" + n0(cost / 4) + " TL</span><strong class='num'>~" + tl(cost) + "</strong></div>" +
        extLink("btn ghost", stayUrl(x, ci, co), fmtD(ci) + "–" + fmtD(co) + " için " + (x.kind === "ev" ? "Airbnb" : "Booking") + "'de aç") +
      "</div>";
    }).join("");
  }

  // ---------- REHBER ----------
  function storeButtons(a) {
    const ios = extLink("btn store sm", iosStore(a.ios), ic("smartphone") + "App Store");
    const play = extLink("btn store sm", playStore(a.android), ic("download") + "Google Play");
    if (IS_IOS) return ios;
    if (IS_ANDROID) return play;
    return ios + play;
  }
  function renderApps() {
    const got = APPS.filter(a => state.apps[a.id]).length;
    const must = APPS.filter(a => a.must);
    const mustGot = must.filter(a => state.apps[a.id]).length;
    $("appProgress").textContent = "Zorunlular: " + mustGot + "/" + must.length + " · toplam " + got + "/" + APPS.length;
    $("platformHint").textContent = IS_IOS ? "iPhone algılandı: butonlar doğrudan App Store sayfasını açar."
      : IS_ANDROID ? "Android algılandı: butonlar doğrudan Google Play sayfasını açar."
      : "Bilgisayardasınız: mağaza sayfaları açılır; uygulamayı telefona yüklemek için bu sayfayı telefonda açın.";
    const groups = [...new Set(APPS.map(a => a.group))];
    $("apps").innerHTML = groups.map(g =>
      "<div class='appgroup'><h3>" + esc(g) + "</h3><div class='applist'>" + APPS.filter(a => a.group === g).map(a =>
        "<div class='app-card" + (state.apps[a.id] ? " done" : "") + "'>" +
          "<span class='app-icon' style='background:" + a.color + ";color:" + a.ink + "' aria-hidden='true'>" + a.mono + "</span>" +
          "<div class='app-meta'><h4>" + esc(a.name) + (a.must ? "<span class='tag'>Mutlaka</span>" : "<span class='tag blue'>Faydalı</span>") + "</h4><p class='sub'>" + esc(a.why) + "</p></div>" +
          "<div class='actions'>" + storeButtons(a) +
            (a.web ? extLink("btn ghost sm", a.web, "Web sitesi") : "") +
            (a.scheme && IS_MOBILE ? "<button type='button' class='btn ghost sm' data-openapp='" + a.id + "'>" + ic("external") + "Aç</button>" : "") +
            "<label class='got'><input type='checkbox' data-appgot='" + a.id + "'" + (state.apps[a.id] ? " checked" : "") + ">Yükledim</label>" +
          "</div></div>").join("") + "</div></div>").join("");
  }

  function renderPhrases() {
    const cats = [...new Set(PHRASES.map(p => p.cat))];
    if (!$("phraseCats").childElementCount) $("phraseCats").innerHTML = cats.map(c => "<button type='button' data-pcat='" + c + "'>" + c + "</button>").join("");
    document.querySelectorAll("#phraseCats button").forEach(b => b.setAttribute("aria-pressed", b.dataset.pcat === state.phraseCat ? "true" : "false"));
    $("phrases").innerHTML = PHRASES.map((p, i) => ({ p, i })).filter(x => x.p.cat === state.phraseCat).map(({ p, i }) =>
      "<div class='phrase'><span class='tr'>" + esc(p.tr) + "</span><span class='k' lang='ko'>" + esc(p.ko) + "</span><span class='ro'>" + esc(p.ro) + "</span>" +
      "<div class='actions'><button type='button' class='btn ghost sm' data-speak='" + i + "'>" + ic("volume") + "Dinle</button>" +
      "<button type='button' class='btn ghost sm' data-show='" + i + "'>" + ic("maximize") + "Göster</button></div></div>").join("");
  }

  const SOS = [
    ["112", "Polis", "Yabancı dil desteği var", "tel:112"],
    ["119", "Ambulans ve itfaiye", "Acil sağlık", "tel:119"],
    ["1330", "Turist danışma hattı", "Çok dilli, 7/24 · yabancı hattan +82 2 1330", "tel:+8221330"]
  ];
  function renderGuide(ctx, costs) {
    renderApps();
    renderPhrases();
    const area = AREAS.find(a => a.key === ctx.stay.area);
    $("airportRoute").innerHTML = ic("pin") + "<div style='display:grid;gap:8px'><p><b>" + esc(ctx.stay.name) + "</b> · " + esc(area.name) + "</p><p class='sub'>" + esc(area.airport) + "</p>" +
      "<div class='go actions'>" + navButtons("home", ctx, ICN.q, "pill") + "</div></div>";
    const t = costs.t;
    $("transportCalc").innerHTML = ic("wallet") + "<div><b>Kişi başı tahmini ulaşım (" + ctx.days + " gün): " + won(t.krw) + " ≈ " + tl(t.krw * KRW_TRY) + "</b>" +
      "<span class='det'>AREX genel tren gidiş-dönüş " + won(t.arex) + " · varış/dönüş günü 4 yolculuk " + won(t.rides) + " · kartlar " + won(t.cards) +
      (t.passDays ? " · " + t.passDays + " günlük İklim Kartı paketi " + won(t.pass) : "") + ". Günübirlik gezilerin tren ücretleri dahil değil.</span></div>";
    $("sosList").innerHTML = sosHtml();
    const S = ctx.S;
    $("seasonGuide").innerHTML = (S.guide || []).map(g =>
      "<section class='card'><h2><span class='h-ic" + (g.tone ? " " + g.tone : "") + "'>" + ic(g.icon) + "</span>" + esc(g.title) + "</h2>" +
      "<ul class='clean'>" + g.items.map(x => "<li>" + esc(x) + "</li>").join("") + "</ul>" +
      (g.icon === "flower" && S.bloom ? bloomTable(ctx) : "") + "</section>").join("");
  }
  function bloomTable(ctx) {
    const min = 85, max = 104; // 26 Mart .. 14 Nisan gün sırası (yılın günü)
    const doy = mmdd => { const [m, dd] = mmdd.split("-").map(Number); return (m === 3 ? 59 : 90) + dd; };
    const pos = v => ((v - min) / (max - min) * 100).toFixed(1) + "%";
    const a = doy(ctx.arrDate.slice(5)), r = doy(ctx.retDate.slice(5));
    const band = "<span class='bl-stay' style='left:" + pos(Math.max(min, a)) + ";width:" + ((Math.min(max, r) - Math.max(min, a)) / (max - min) * 100).toFixed(1) + "%'></span>";
    const tick = (v, l) => "<span style='left:" + pos(v) + "'>" + l + "</span>";
    return "<div class='bloom' role='img' aria-label='Yeouido çiçeklenme tarihleri 2017–2026 ve seçili tarihleriniz'>" +
      "<div class='bl-row'><span></span><span class='bl-axis'>" + tick(85, "26 Mar") + tick(91, "1 Nis") + tick(98, "8 Nis") + tick(104, "14 Nis") + "</span></div>" +
      ctx.S.bloom.slice().reverse().map(([y, o, f]) => { const s0 = Math.max(min, doy(o)), e0 = Math.min(max, doy(f) + 4);
        return "<div class='bl-row'><span class='y'>" + y + "</span><span class='bl-track'>" + band + "<span class='bl-bar' style='left:" + pos(s0) + ";width:" + ((e0 - s0) / (max - min) * 100).toFixed(1) + "%'></span><span class='bl-full' style='left:" + pos(doy(f)) + "'></span></span></div>"; }).join("") +
      "<p class='sub'>Mavi alan: " + fmtD(ctx.arrDate) + "–" + fmtD(ctx.retDate) + " Seul'de olduğunuz günler. Çubuk: açmadan tam çiçeklenmenin ~4 gün sonrasına; nokta: tam çiçeklenme (KMA, Yeouido Yunjung-ro).</p></div>";
  }
  const sosHtml = () => SOS.map(s => "<a href='" + s[3] + "'><b>" + s[0] + "</b><span>" + s[1] + "<small>" + s[2] + "</small></span></a>").join("") +
    "<a href='https://seul.be.mfa.gov.tr' target='_blank' rel='noopener'><b>" + ic("landmark") + "</b><span>T.C. Seul Büyükelçiliği<small>seul.be.mfa.gov.tr</small></span></a>";

  // ---------- Alt sayfa (sheet) ----------
  const sheet = $("sheet");
  let sheetReturn = null;
  function openSheet(html) {
    sheetReturn = document.activeElement;
    $("sheetBody").innerHTML = html;
    if (!sheet.open) sheet.showModal();
    $("sheetBody").scrollTop = 0;
  }
  function closeSheet() { if (sheet.open) sheet.close(); }
  sheet.addEventListener("close", () => { if (sheetReturn && sheetReturn.focus) sheetReturn.focus(); });
  sheet.addEventListener("click", e => { if (e.target === sheet) closeSheet(); });
  $("sheetClose").addEventListener("click", closeSheet);

  function openTaxi(key) {
    const ctx = context();
    const dst = destOf(key, ctx);
    const isHome = key === "home";
    openSheet(
      "<h2 id='sheetTitle'><span class='h-ic'>" + ic("car") + "</span>Taksi kartı</h2>" +
      "<div class='taxi'><p class='sub'>Bu ekranı şoföre gösterin</p>" +
        "<div class='big' lang='ko'>" + esc(dst.ko) + "</div>" +
        (isHome && ctx.home.custom ? "<div class='say'>" + esc(ctx.home.custom) + "</div>" : "") +
        "<div class='say' lang='ko'>이 곳으로 가 주세요</div>" +
        "<p class='tr'>“Lütfen buraya götürün” · " + esc(dst.name) + "</p>" +
        (isHome && !ctx.home.custom ? "<p class='callout'>" + ic("alert") + "<span>Konaklamanın tam adresi henüz girilmedi; şoföre rezervasyondaki Korece adresi gösterin. Tur sekmesinden adresi kaydedebilirsiniz.</span></p>" : "") +
      "</div>" +
      "<div class='actions'>" +
        "<button type='button' class='btn ghost sm' data-speak-text='이 곳으로 가 주세요'>" + ic("volume") + "Korece seslendir</button>" +
        extLink("btn ghost sm", IS_ANDROID ? playStore(APP.kakaot.android) : iosStore(APP.kakaot.ios), "Kakao T") +
      "</div>" +
      "<p class='sub'>Gece 23:00–02:00 arası %40 zamlı. 4 kişi + bavul için Kakao T'de büyük araç (Venti) seçin.</p>");
  }
  function openPhrase(i) {
    const p = PHRASES[i];
    openSheet("<h2 id='sheetTitle'><span class='h-ic'>" + ic("message") + "</span>" + esc(p.tr) + "</h2>" +
      "<div class='taxi'><div class='big' lang='ko'>" + esc(p.ko) + "</div><p class='tr'>" + esc(p.ro) + "</p></div>" +
      "<div class='actions'><button type='button' class='btn' data-speak='" + i + "'>" + ic("volume") + "Dinle</button></div>");
  }
  function openEmergency() {
    openSheet("<h2 id='sheetTitle'><span class='h-ic red'>" + ic("phone") + "</span>Acil durum</h2><div class='sos'>" + sosHtml() + "</div>" +
      "<div class='taxi'><div class='say' lang='ko'>도와주세요! · 길을 잃었어요</div><p class='tr'>“Yardım edin! · Kayboldum”</p></div>" +
      "<a class='btn ghost sm' href='#rehber/sozluk' data-close>Tüm acil cümleler</a>");
  }
  function openInstallHelp() {
    openSheet("<h2 id='sheetTitle'><span class='h-ic green'>" + ic("download") + "</span>Ana ekrana ekle</h2>" +
      (IS_IOS
        ? "<ol class='steps'><li>Safari'de alttaki <b>Paylaş</b> düğmesine dokunun.</li><li><b>Ana Ekrana Ekle</b>'yi seçin.</li><li>Uygulama simgesiyle açın; plan internetsiz de çalışır.</li></ol>"
        : "<ol class='steps'><li>Tarayıcı menüsünü açın (⋮).</li><li><b>Uygulamayı yükle</b> veya <b>Ana ekrana ekle</b>'yi seçin.</li></ol>") +
      (!location.protocol.startsWith("http") ? "<p class='callout'>" + ic("alert") + "<span>Dosya doğrudan açıldığı için yükleme ve çevrimdışı mod çalışmaz; sayfayı bir web adresinden (ör. GitHub Pages veya Netlify) açın.</span></p>" : ""));
  }

  // ---------- Toast ----------
  let toastT = null;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ---------- Sesli okuma ----------
  function speak(text) {
    if (!("speechSynthesis" in window)) { toast("Bu cihaz sesli okumayı desteklemiyor"); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ko-KR"; u.rate = 0.85;
    const v = speechSynthesis.getVoices().find(x => x.lang && x.lang.toLowerCase().startsWith("ko"));
    if (v) u.voice = v; else toast("Cihazda Korece ses yok; varsayılan ses kullanılıyor");
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
  }

  // ---------- Takvim (.ics) ve paylaşım ----------
  function icsEsc(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function icsTime(date, h) {
    const [y, m, dd] = date.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, dd, 0, Math.round(h * 60) - 9 * 60)); // Seul UTC+9
    return dt.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }
  function exportICS() {
    const ctx = context(), tour = buildTour(ctx);
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Seul 2026//Planlayici//TR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Seul 2026"];
    const ev = (uid, date, h, dur, sum, loc, desc) => L.push("BEGIN:VEVENT", "UID:" + uid + "@seul2026", "DTSTAMP:" + stamp,
      "DTSTART:" + icsTime(date, h), "DTEND:" + icsTime(date, h + dur), "SUMMARY:" + icsEsc(sum), "LOCATION:" + icsEsc(loc), "DESCRIPTION:" + icsEsc(desc), "END:VEVENT");
    const [fy, fm, fd] = ctx.flight.depDate.split("-").map(Number);
    const fh = hNum(ctx.flight.dep);
    const depUtc = new Date(Date.UTC(fy, fm - 1, fd, 0, Math.round(fh * 60) - 3 * 60)).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    L.push("BEGIN:VEVENT", "UID:flight-" + ctx.flight.depDate + "@seul2026", "DTSTAMP:" + stamp, "DTSTART:" + depUtc, "DTEND:" + icsTime(ctx.arrDate, ctx.arrH),
      "SUMMARY:" + icsEsc("Uçuş İstanbul → Seul (" + ctx.flight.airline + ")"), "LOCATION:" + icsEsc("İstanbul Havalimanı"), "DESCRIPTION:" + icsEsc(ctx.flight.via), "END:VEVENT");
    tour.days.forEach(day => schedule(day, ctx).forEach(s => {
      const p = s.p;
      ev(p.id + "-" + day.date, day.date, s.h, p.trip ? 8 : p.hours, p.name, p.ko + " · " + p.station,
        p.tip + "\nNaver Map: https://map.naver.com/p/search/" + enc(p.ko));
    }));
    L.push("END:VCALENDAR");
    const blob = new Blob([L.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "seul-2026-tur.ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Takvim dosyası indirildi; açınca tüm duraklar takviminize eklenir");
  }
  async function sharePlan() {
    const ctx = context(), tour = buildTour(ctx);
    const text = "Seul 2026 planımız (" + fmtD(ctx.arrDate) + "–" + fmtD(ctx.retDate) + ")\n" + tour.days.map((day, i) => {
      const names = schedule(day, ctx).map(s => s.p.name);
      return (i + 1) + ". gün " + fmtDL(day.date) + ": " + (names.length ? names.join(" → ") : day.kind === "arrival" ? "Varış" : day.kind === "departure" ? "Dönüş" : "Serbest");
    }).join("\n");
    try {
      if (navigator.share) { await navigator.share({ title: "Seul 2026 planı", text, url: location.protocol.startsWith("http") ? location.href.split("#")[0] : undefined }); return; }
      await navigator.clipboard.writeText(text);
      toast("Plan panoya kopyalandı");
    } catch (e) { if (e && e.name !== "AbortError") toast("Paylaşılamadı"); }
  }

  // ---------- Yükleme (PWA) ve tema ----------
  let installEvt = null;
  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; $("installBtn").hidden = false; });
  window.addEventListener("appinstalled", () => { $("installBtn").hidden = true; state.checks.pwa = true; save(); render(); toast("Uygulama yüklendi"); });
  if (IS_IOS && !IS_STANDALONE) $("installBtn").hidden = false;
  async function install() {
    if (installEvt) { installEvt.prompt(); await installEvt.userChoice; installEvt = null; $("installBtn").hidden = true; return; }
    openInstallHelp();
  }
  const THEMES = ["system", "light", "dark"], THEME_LBL = { system: "sistem", light: "açık", dark: "koyu" };
  function applyTheme(t) {
    if (t === "system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
    $("themeBtn").setAttribute("aria-label", "Tema: " + THEME_LBL[t] + " (değiştirmek için dokunun)");
    $("themeBtn").innerHTML = ic(t === "dark" ? "moon" : t === "light" ? "sun" : "contrast");
  }
  let theme = (() => { try { return localStorage.getItem(THEME_KEY) || "system"; } catch (e) { return "system"; } })();
  applyTheme(theme);
  $("themeBtn").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { if (theme === "system") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, theme); } catch (e) { /* yok */ }
    applyTheme(theme);
    toast("Tema: " + THEME_LBL[theme]);
  });

  // ---------- Yönlendirme ----------
  let pendingDay = null;
  function parseHash() {
    let h = decodeURIComponent(location.hash.slice(1));
    if (LEGACY[h]) h = LEGACY[h];
    const [v, s] = h.split("/");
    state.view = VIEWS.includes(v) ? v : "ana";
    if (s && SUBS[state.view] && SUBS[state.view].includes(s)) state.sub[state.view] = s;
    pendingDay = state.view === "tur" && s && s.startsWith("gun-") ? s : null;
  }
  function renderRoute() {
    VIEWS.forEach(v => { $("v-" + v).hidden = v !== state.view; });
    document.querySelectorAll("[data-nav]").forEach(a => { if (a.dataset.nav === state.view) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    Object.keys(SUBS).forEach(v => {
      document.querySelectorAll("#v-" + v + " [data-subview]").forEach(el => { el.hidden = el.dataset.subview !== state.sub[v]; });
      document.querySelectorAll("#v-" + v + " [data-sub]").forEach(a => a.setAttribute("aria-current", a.dataset.sub === state.sub[v] ? "true" : "false"));
    });
  }

  // ---------- Ana render ----------
  function render() {
    const ctx = context();
    const tour = buildTour(ctx);
    const costs = computeCosts(ctx, tour);
    renderRoute();
    renderHome(ctx, tour, costs);
    renderTour(ctx, tour, costs);
    renderExplore(ctx, tour);
    renderBudget(ctx, costs);
    renderFlights(ctx);
    renderStays(ctx);
    renderGuide(ctx, costs);
    save();
  }

  // ---------- Olaylar ----------
  window.addEventListener("hashchange", () => {
    parseHash();
    renderRoute();
    if (pendingDay) {
      const el = $(pendingDay);
      if (el) el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    } else {
      window.scrollTo(0, 0);
      $("main").focus({ preventScroll: true });
    }
  });

  document.addEventListener("click", e => {
    const t = e.target;
    const launch = t.closest("[data-launch]");
    if (launch && IS_MOBILE) {
      e.preventDefault();
      const dst = destOf(launch.dataset.dest, context());
      const L = NAV[launch.dataset.launch](dst);
      launchScheme(L.scheme, L.app);
      return;
    }
    const taxi = t.closest("[data-taxi]");
    if (taxi) { openTaxi(taxi.dataset.taxi); return; }
    if (t.closest("[data-close]")) { closeSheet(); return; }
    const act = t.closest("[data-action]");
    if (act) {
      const a = act.dataset.action;
      if (act.tagName === "A") e.preventDefault();
      if (a === "taxi-home") openTaxi("home");
      else if (a === "emergency") openEmergency();
      else if (a === "ics") exportICS();
      else if (a === "share") sharePlan();
      else if (a === "print") window.print();
      else if (a === "install") install();
      else if (a === "toggle-checks") { state.allChecks = !state.allChecks; render(); }
      return;
    }
    const pick = t.closest("[data-pick]");
    if (pick) {
      const id = pick.dataset.pick, adding = !state.picks[id];
      if (adding) state.picks[id] = true; else delete state.picks[id];
      render();
      const again = document.querySelector("#places [data-pick='" + id + "']");
      if (again) again.focus();
      toast(PLACE[id].name + (adding ? " tura eklendi" : " turdan çıkarıldı"));
      return;
    }
    const alt = t.closest("[data-alt]");
    if (alt) {
      const a = ALTS[+alt.dataset.alt];
      if (a.qr) { state.alt = null; state.t = a.qr; state.di = deps.indexOf(REF_DEP); state.ri = rets.indexOf(REF_RET); }
      else state.alt = +alt.dataset.alt;
      render(); toast(a.al + " plana uygulandı");
      return;
    }
    const sea = t.closest("[data-season]");
    if (sea) { state.season = sea.dataset.season; render(); toast(SEASON[state.season].label + " planı · " + SEASON[state.season].sub); return; }
    const trp = t.closest("[data-trip]");
    if (trp) { state.trip[state.season] = trp.dataset.trip; state.fl[state.season] = 0; render(); toast(fmtD(tripOf(state.season).dep) + " → " + fmtD(tripOf(state.season).ret) + " seçildi"); return; }
    const sfl = t.closest("[data-sfl]");
    if (sfl) { state.fl[state.season] = +sfl.dataset.sfl; render(); toast(tripOf(state.season).flights[+sfl.dataset.sfl].al + " plana uygulandı"); return; }
    const st = t.closest("[data-stay]");
    if (st && !t.closest("a")) { state.stay = st.dataset.stay; render(); toast(STAYS.find(s => s.id === state.stay).name + " seçildi"); return; }
    const cat = t.closest("[data-cat]");
    const rf = t.closest("[data-rf]");
    if (rf) { state.restKind = rf.dataset.rf; render(); return; }
    if (cat) { state.cat = cat.dataset.cat; render(); return; }
    const pcat = t.closest("[data-pcat]");
    if (pcat) { state.phraseCat = pcat.dataset.pcat; renderPhrases(); return; }
    const sp = t.closest("[data-speak]");
    if (sp) { speak(PHRASES[+sp.dataset.speak].ko); return; }
    const spt = t.closest("[data-speak-text]");
    if (spt) { speak(spt.dataset.speakText); return; }
    const show = t.closest("[data-show]");
    if (show) { openPhrase(+show.dataset.show); return; }
    const fd = t.closest("[data-food]");
    if (fd) { state.food = +fd.dataset.food; render(); return; }
    const sf = t.closest("#stayFilter [data-k]");
    if (sf) { state.stayFilter = sf.dataset.k; render(); return; }
    const oa = t.closest("[data-openapp]");
    if (oa) { const app = APP[oa.dataset.openapp]; launchScheme(app.scheme + (app.id === "naver" ? enc(NAVER_APPNAME) : ""), app); return; }
    const pre = t.closest("[data-krw]");
    if (pre) { $("fxKrw").value = fmtNum(+pre.dataset.krw, 0); fxFrom("krw"); return; }
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const st = e.target.closest && e.target.closest("[data-stay]");
    if (st && e.target === st) { e.preventDefault(); state.stay = st.dataset.stay; render(); }
  });
  document.addEventListener("change", e => {
    const c = e.target.closest("[data-check]");
    if (c) { if (c.checked) state.checks[c.dataset.check] = true; else delete state.checks[c.dataset.check]; save(); setTimeout(render, 250); return; }
    const g = e.target.closest("[data-appgot]");
    if (g) { if (g.checked) state.apps[g.dataset.appgot] = true; else delete state.apps[g.dataset.appgot]; save(); renderApps(); }
  });
  ["t1", "t2"].forEach(k => $(k).addEventListener("click", () => { state.t = k; render(); }));
  $("originInput").addEventListener("change", e => { state.origin = e.target.value; render(); toast("Başlangıç adresi kaydedildi"); });
  $("originReset").addEventListener("click", () => { state.origin = ""; $("originInput").value = ""; render(); });
  $("installBtn").addEventListener("click", install);
  let searchT = null;
  $("placeSearch").addEventListener("input", e => { clearTimeout(searchT); searchT = setTimeout(() => { state.q = e.target.value; renderExplore(context(), buildTour(context())); }, 150); });
  $("fxTry").addEventListener("input", () => fxFrom("try"));
  $("fxKrw").addEventListener("input", () => fxFrom("krw"));
  $("fxSwap").addEventListener("click", () => { $("fxTry").value = "1.000"; fxFrom("try"); });
  $("fxRateLbl").textContent = String(KRW_TRY).replace(".", ",");
  $("fxPresets").innerHTML = [[1550, "Metro"], [5000, "Günlük kart"], [13000, "AREX Ekspres"], [29000, "N Seoul Tower"], [55000, "Günlük yemek"]]
    .map(([v, l]) => "<button type='button' class='chip' data-krw='" + v + "'>" + l + " · " + won(v) + "</button>").join("");
  fxFrom("try");

  // ---------- Başlat ----------
  parseHash();
  buildMatrix();
  render();
  if (pendingDay) setTimeout(() => { const el = $(pendingDay); if (el) el.scrollIntoView({ block: "start" }); }, 50);
  loadWeather();
  setInterval(() => tick(), 30000);
  if ("speechSynthesis" in window) speechSynthesis.getVoices();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => { /* çevrimdışı mod yok */ }));
  }
})();
