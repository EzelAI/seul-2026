/* Seul Yılbaşı — veri katmanı. Fiyatlar 7 Kasım 2026'da toplandı; koordinatlar OpenStreetMap (Nominatim). */
window.SEOUL = (() => {
  "use strict";

  const KRW_TRY = 0.0375;
  const PEOPLE = 4;
  const BUDGET = 40000;
  const REF_DEP = "2026-12-25", REF_RET = "2027-01-01";
  const KETA_KRW = 10000;

  // Qatar Airways: kalkış (satır) × dönüş (sütun), kişi başı TL. null = fiyat yok.
  const deps = ["2026-12-20","2026-12-21","2026-12-22","2026-12-23","2026-12-24","2026-12-25","2026-12-26","2026-12-27","2026-12-28","2026-12-29","2026-12-30"];
  const rets = ["2026-12-29","2026-12-30","2026-12-31","2027-01-01","2027-01-02","2027-01-03","2027-01-04"];
  const P = [
    [35040,32483,32563,32433,35572,35572,43614],
    [40556,37999,38079,37948,41087,41087,49130],
    [35090,32533,32613,32483,35622,35622,43665],
    [35090,32533,32613,32483,35622,35622,43665],
    [33035,30477,30558,30427,33566,33566,41609],
    [36494,31480,31560,31430,34569,34569,42612],
    [42662,31611,31560,31430,34569,34569,42612],
    [46725,35622,30558,30427,33566,33566,41609],
    [null, 41268,35522,35391,33566,33566,41609],
    [null, null, 41268,41659,33616,33616,41659],
    [null, null, null, 54104,38239,33616,41659]
  ];
  const QR = {
    t1: { dep: "13:50", arr: "10:30", off: 1, via: "Doha (DOH) · 1 sa 50 dk aktarma", dur: "14 sa 40 dk" },
    t2: { dep: "20:10", arr: "17:15", off: 1, via: "Doha (DOH) · 2 sa 15 dk aktarma", dur: "15 sa 05 dk" }
  };

  // 25 Ara → 1 Oca, tüm havayolları (Google Uçuşlar, 7 Kas 2026)
  const ALTS = [
    { al: "China Southern", dep: "14:25", arr: "15:15", off: 1, dur: "18 sa 50 dk", direct: false, via: "Guangzhou (CAN) · 5 sa 30 dk", price: 29361, note: "En ucuz; uzun aktarma." },
    { al: "Qatar Airways", dep: "20:10", arr: "17:15", off: 1, dur: "15 sa 05 dk", direct: false, via: "Doha (DOH) · 2 sa 15 dk", price: 31430, qr: "t2", note: "Matristeki sefer." },
    { al: "Air China", dep: "14:55", arr: "11:40", off: 1, dur: "14 sa 45 dk", direct: false, via: "Pekin (PEK) · 3 sa 15 dk", price: 34856, note: "Bütçe içinde, öğlen varış." },
    { al: "Korean Air", dep: "21:55", arr: "13:55", off: 1, dur: "10 sa", direct: true, via: "Aktarmasız", price: 47680, note: "Aktarmasızların en ucuzu." },
    { al: "Air Astana", dep: "10:30", arr: "06:50", off: 1, dur: "14 sa 20 dk", direct: false, via: "Astana (NQZ) · 2 sa 45 dk", price: 50774, note: "06:50 varış; eve girişe kadar uzun bekleme." },
    { al: "Turkish Airlines", dep: "17:05", arr: "08:55", off: 1, dur: "9 sa 50 dk", direct: true, via: "Aktarmasız", price: 54238, note: "En kısa uçuş, sabah varış." },
    { al: "Etihad", dep: "13:55", arr: "10:50", off: 1, dur: "14 sa 55 dk", direct: false, via: "Abu Dabi (AUH) · 1 sa 55 dk", price: 55738 },
    { al: "Turkish Airlines", dep: "02:20", arr: "18:20", off: 0, dur: "10 sa", direct: true, via: "Aktarmasız", price: 56741, note: "24'ü 25'e bağlayan gece kalkış, aynı gün varış: +1 gece konaklama." },
    { al: "Emirates", dep: "20:05", arr: "16:55", off: 1, dur: "14 sa 50 dk", direct: false, via: "Dubai (DXB) · 2 sa 10 dk", price: 86289 }
  ];
  const SEARCH_AIRLINES = ["Turkish Airlines", "Korean Air", "Qatar Airways", "Emirates", "Etihad", "China Southern", "Air China"];
  const AL_CODE = { "China Southern": "CZ", "Qatar Airways": "QR", "Air China": "CA", "Korean Air": "KE", "Air Astana": "KC", "Turkish Airlines": "TK", "Etihad": "EY", "Emirates": "EK" };

  const AREAS = [
    { key: "myeongdong", name: "Myeongdong · Jung-gu", air: "Myeongdong, Seoul", bk: "Myeongdong, Seoul",
      good: "En merkezî bölge: alışveriş, sokak yemeği, Namsan yürüme mesafesinde; saraylara ve Bosingak'a metroyla birkaç durak.",
      bad: "Kalabalık; 2 yatak odalı ev az, oteller pahalı.",
      airport: "Limuzin otobüs 6015 doğrudan Myeongdong'a (₩17.000) veya AREX → Seul İstasyonu → Hat 4 ile 2 durak." },
    { key: "hongdae", name: "Hongdae · Yeonnam · Hapjeong (Mapo)", air: "Hongdae, Seoul", bk: "Hongdae, Seoul",
      good: "Canlı; kafeler, restoranlar, gece hayatı. Havalimanından AREX genel trenle aktarmasız (Hongik Univ., ₩4.650).",
      bad: "Saraylara ve Myeongdong'a metroyla aktarmalı; hafta sonu geceleri gürültülü olabilir.",
      airport: "AREX genel tren → Hongik Univ. istasyonu, aktarmasız (₩4.650, yaklaşık 50 dk)." },
    { key: "seoulstn", name: "Seul İstasyonu · Yongsan · Gongdeok · Haebangchon", air: "Yongsan-gu, Seoul", bk: "Seoul Station, Seoul",
      good: "Havalimanı ekspresinin son durağı (43 dk); Hat 1 ve 4 ile merkeze hızlı. Haebangchon sakin, Namsan eteğinde, Itaewon'a yakın.",
      bad: "Haebangchon yokuşlu ve metroya yürüme mesafesi uzun olabilir.",
      airport: "AREX Ekspres → Seul İstasyonu (₩13.000, 43 dk) veya genel tren (₩4.750; Gongdeok'ta da durur, ₩4.650). Haebangchon için Seul İstasyonu'ndan kısa taksi." },
    { key: "east", name: "Dongdaemun · Seongbuk (kuzeydoğu)", air: "Dongdaemun-gu, Seoul", bk: "Dongdaemun, Seoul",
      good: "Fiyat/performans; Gwangjang Pazarı, Ikseon-dong ve DDP'ye yakın, Seongsu'ya kolay.",
      bad: "Hongdae ve Gangnam'a uzak; evin konumuna göre aktarmalı.",
      airport: "AREX → Seul İstasyonu, oradan Hat 1 veya 4; ya da eve en yakın limuzin otobüs durağı." }
  ];

  // Konaklama: total6 = 26 Ara–1 Oca 6 gece toplamı. lat/lng: Airbnb tam adresi paylaşılmadığı için semt/istasyon noktası (approx).
  const STAYS = [
    { id: "1609196513678801566", kind: "ev", name: "Haebangchon evi", ko: "해방촌", area: "seoulstn", where: "Yongsan · Namsan eteği, Myeongdong ve Itaewon'a yakın",
      rating: "4,96", reviews: "50", total6: 49452, beds: "2 yatak odası · 3 yatak · 1 banyo",
      chips: [["ok","Erken giriş ve geç çıkış"],["","Havalimanına kolay erişim"],["","Misafirlerin favorisi"]],
      early: "Erken giriş sunuyor: sabah varışında doğrudan eve geçebilirsiniz.", origin: "Haebangchon, Yongsan-gu, Seoul", lat: 37.54354, lng: 126.98559, approx: true },
    { id: "1049670250878875939", kind: "ev", name: "Yeonnam dairesi", ko: "연남동", area: "hongdae", where: "Mapo · Hongdae ve Yeonnam kafe sokakları",
      rating: "4,93", reviews: "123", total6: 60625, beds: "2 yatak odası · 4 yatak · 1 banyo",
      chips: [["ok","Ücretsiz bagaj bırakma"],["","Asansör, market"],["","Misafirlerin favorisi"]],
      early: "Giriş saatinden önce bavulları bırakıp gezmeye çıkabilirsiniz.", origin: "Yeonnam-dong, Mapo-gu, Seoul", lat: 37.56266, lng: 126.92261, approx: true },
    { id: "1384249110909704228", kind: "ev", name: "Gongdeok dairesi (3 oda)", ko: "공덕역", area: "seoulstn", where: "Mapo · Gongdeok; AREX ve Hat 5/6 kavşağı",
      rating: "4,98", reviews: "66", total6: 41569, beds: "3 yatak odası · 4 yatak · 1 banyo",
      chips: [["ok","Ücretsiz iptal"],["","İlanda ücretsiz havalimanı transferi"],["","Misafirlerin favorisi"]],
      origin: "Gongdeok Station, Seoul", lat: 37.5435, lng: 126.95081, approx: true },
    { id: "1382960643056240467", kind: "ev", name: "Dongdaemun dairesi", ko: "동대문구", area: "east", where: "Dongdaemun-gu · Myeongdong, Jongno ve Seongsu'ya ulaşım",
      rating: "5,0", reviews: "107", total6: 47464, beds: "2 yatak odası · 3 yatak · 1 banyo",
      chips: [["ok","Ücretsiz iptal"],["","Klima, ısıtma"]],
      origin: "Dongdaemun-gu, Seoul", lat: 37.57431, lng: 127.04004, approx: true },
    { id: "51675962", kind: "ev", name: "Hongdae istasyonu yanı", ko: "홍대입구역", area: "hongdae", where: "Mapo · Hongik Univ. istasyonuna 1 dk",
      rating: "4,89", reviews: "110", total6: 48632, beds: "2 yatak odası · 4 yatak · 1 banyo",
      chips: [["","AREX ile aktarmasız"],["","Misafirlerin favorisi"]],
      origin: "Hongik University Station, Seoul", lat: 37.55737, lng: 126.92445, approx: true },
    { id: "1339106802824892099", kind: "ev", name: "Seongbuk aile evi", ko: "성북구", area: "east", where: "Seongbuk · havalimanı otobüsüne 1 dk, metroya 2 dk",
      rating: "4,91", reviews: "76", total6: 50635, beds: "2 yatak odası · 3 yatak · 1 banyo",
      chips: [["ok","Ücretsiz iptal"],["","Süper Ev Sahibi"],["","Havalimanı otobüsü yakın"]],
      origin: "Seongbuk-gu, Seoul", lat: 37.58944, lng: 127.01673, approx: true },
    { id: "1081781456973510644", kind: "ev", name: "Seul İstasyonu evi", ko: "서울역", area: "seoulstn", where: "Yongsan · Seul İstasyonu'na 5 dk yürüme",
      rating: "4,94", reviews: "115", total6: 54246, beds: "2 yatak odası · 3 yatak · 1 banyo",
      chips: [["","AREX Ekspres'e yürüme"],["","Süper Ev Sahibi"]],
      origin: "Seoul Station, Seoul", lat: 37.55482, lng: 126.97222, approx: true },
    { id: "1648290505111026329", kind: "ev", name: "Hapjeong sıra evi", ko: "합정역", area: "hongdae", where: "Mapo · Hapjeong istasyonuna 5 dk",
      rating: "4,97", reviews: "37", total6: 64118, beds: "2 yatak odası · 3 queen yatak · 1 banyo",
      chips: [["ok","Ücretsiz bagaj bırakma"],["ok","Ücretsiz iptal"],["","Asansör"],["note","İndirimli fiyat (normali 74.056 TL)"]],
      early: "Ücretsiz bagaj bırakma var: erken varışta bavulları bırakıp çıkabilirsiniz.", origin: "Hapjeong Station, Seoul", lat: 37.549, lng: 126.91299, approx: true },
    { id: "melrouseutei-hongdae-mellow-stay-hongdae", kind: "otel", name: "Mellow Stay Hongdae", ko: "멜로우스테이 홍대", area: "hongdae", where: "Hongdae · metroya yakın",
      rating: "8,9", reviews: "124", total6: 102398, beds: "2 oda · tek kişilik yataklar",
      chips: [["ok","Kahvaltı dahil"],["ok","Ücretsiz iptal"]], origin: "Mellow Stay Hongdae, Seoul", lat: 37.55737, lng: 126.92445, approx: true },
    { id: "holiday-inn-express-seoul-hongdae", kind: "otel", name: "Holiday Inn Express Hongdae", ko: "홀리데이 인 익스프레스 서울 홍대", area: "hongdae", where: "Hongdae · metroya yakın",
      rating: "8,7", reviews: "2.025", total6: 146859, beds: "2 standart oda",
      chips: [["ok","Kahvaltı dahil"]], origin: "Holiday Inn Express Seoul Hongdae", lat: 37.55737, lng: 126.92445, approx: true },
    { id: "l7-hongdae", kind: "otel", name: "L7 Hongdae by Lotte", ko: "롯데호텔 L7홍대", area: "hongdae", where: "Hongdae · Hongik Univ. istasyonu",
      rating: "8,7", reviews: "4.004", total6: 189794, beds: "2 standart çift kişilik oda",
      chips: [["ok","Ücretsiz iptal"],["","Tesiste ödeme"]], origin: "L7 Hongdae by Lotte Hotels, Seoul", lat: 37.55574, lng: 126.92163 },
    { id: "lotte-city-seoul-myeongdong", kind: "otel", name: "Lotte City Hotel Myeongdong", ko: "롯데시티호텔 명동", area: "myeongdong", where: "Jung-gu · Myeongdong istasyonuna 0,7 km",
      rating: "8,5", reviews: "6.048", total6: 201599, beds: "2 standart çift kişilik oda",
      chips: [["ok","Ücretsiz iptal"]], origin: "Lotte City Hotel Myeongdong, Seoul", lat: 37.56694, lng: 126.988 },
    { id: "fraser-place-namdaemun", kind: "otel", name: "Fraser Place Namdaemun", ko: "프레이저 플레이스 남대문", area: "myeongdong", where: "Jung-gu · Namdaemun, Seul İstasyonu ile Myeongdong arası",
      rating: "8,9", reviews: "3.512", total6: 219527, beds: "2 superior çift kişilik oda",
      chips: [["ok","Ücretsiz iptal"]], origin: "Fraser Place Namdaemun Seoul", lat: 37.559, lng: 126.978, approx: true },
    { id: "l7-myeongdong-by-lotte", kind: "otel", name: "L7 Myeongdong by Lotte", ko: "L7 명동", area: "myeongdong", where: "Jung-gu · Myeongdong istasyonuna 50 m",
      rating: "8,8", reviews: "3.292", total6: 224000, beds: "2 standart çift kişilik oda",
      chips: [["ok","Ücretsiz iptal"],["","Tesiste ödeme"]], origin: "L7 Myeongdong by Lotte Hotels, Seoul", lat: 37.56123, lng: 126.98689 }
  ];
  STAYS.forEach(s => { s.nightly = s.total6 / 6; });

  const CATS = [["all","Tümü"],["tarih","Tarih"],["sehir","Manzara"],["alisveris","Mahalle"],["yemek","Yemek"],["muze","Müze"],["kis","Kış"],["bahar","Sakura"],["bayram","Bayram"],["gunubirlik","Günübirlik"]];
  const CAT_META = {
    tarih: { icon: "landmark", label: "Tarih ve saray" }, sehir: { icon: "mountain", label: "Manzara" }, alisveris: { icon: "bag", label: "Mahalle ve alışveriş" },
    yemek: { icon: "utensils", label: "Yemek ve pazar" }, muze: { icon: "image", label: "Müze" }, kis: { icon: "snow", label: "Kış ve yılbaşı" },
    bahar: { icon: "flower", label: "Sakura ve bahar" }, bayram: { icon: "moon", label: "Bayram" }, gunubirlik: { icon: "bus", label: "Günübirlik" }
  };

  // when: day = gündüz, flex = gündüz veya akşam, evening = akşam. closed: kapalı hafta günleri (0 = Pazar).
  const PLACES = [
    { id: "gyeongbok", name: "Gyeongbokgung Sarayı", ko: "경복궁", q: "Gyeongbokgung Palace, Seoul", lat: 37.57975, lng: 126.97668, cats: ["tarih"], cluster: "palace", hours: 2.5, when: "day", order: 1, closed: [2],
      fee: 3000, feeNote: "Hanbok giyenlere ücretsiz", station: "Gyeongbokgung · Hat 3 · Çıkış 5",
      desc: "Joseon hanedanının ana sarayı; içinde Ulusal Halk Müzesi (ücretsiz).", tip: "Kışın 09:00–17:00 (son giriş 16:00), salı kapalı. Muhafız değişimi 10:00 ve 14:00'te Gwanghwamun kapısında.",
      tipSpring: "Mart–Mayıs 09:00–18:00 (son giriş 17:00), salı kapalı. Muhafız değişimi 10:00 ve 14:00'te Gwanghwamun kapısında. Sarayın arka bahçelerinde de kiraz ağaçları var.", def: true },
    { id: "bukchon", name: "Bukchon Hanok Köyü", ko: "북촌한옥마을", q: "Bukchon Hanok Village, Seoul", lat: 37.58239, lng: 126.98586, cats: ["tarih","alisveris"], cluster: "palace", hours: 1, when: "day", order: 2,
      fee: 0, station: "Anguk · Hat 3 · Çıkış 2",
      desc: "Geleneksel hanok evleriyle yokuşlu sokaklar; insanların yaşadığı bir mahalle.", tip: "Kırmızı bölge turistlere yalnızca 10:00–17:00 arası açık; dışında 100.000 won ceza. Sessiz olun.", def: true },
    { id: "changdeok", name: "Changdeokgung ve Huwon bahçesi", ko: "창덕궁", q: "Changdeokgung Palace, Seoul", lat: 37.58239, lng: 126.9917, cats: ["tarih"], cluster: "palace", hours: 2, when: "day", order: 3, closed: [1],
      fee: 8000, feeNote: "Saray ₩3.000 + Huwon turu ~₩5.000 (saatli, kontenjanlı)", station: "Anguk · Hat 3 · Çıkış 3",
      desc: "UNESCO listesindeki saray; arkasındaki Huwon (Gizli Bahçe) rehberli turla gezilir.", tip: "Pazartesi kapalı. Huwon turunu birkaç gün önce online ayırtın.", def: false },
    { id: "insadong", name: "Insadong ve Ssamziegil", ko: "인사동 쌈지길", q: "Insadong, Seoul", lat: 37.57426, lng: 126.98482, cats: ["alisveris","yemek"], cluster: "palace", hours: 1.5, when: "flex", order: 4,
      fee: 0, station: "Anguk · Hat 3 · Çıkış 6",
      desc: "El sanatları, geleneksel çay evleri, hediyelik eşya.", tip: "Soğuk günde geleneksel çay evinde yuja-cha deneyin.", def: true },
    { id: "gwanghwamun", name: "Seoul Light Gwanghwamun ve Cheonggyecheon", ko: "광화문광장", q: "Gwanghwamun Square, Seoul", lat: 37.57278, lng: 126.97686, cats: ["kis","sehir"], seasons: ["yilbasi"], cluster: "palace", hours: 1.5, when: "evening", order: 5,
      window: ["2026-12-11","2027-01-03"], fee: 0, station: "Gwanghwamun · Hat 5 · Çıkış 2",
      desc: "Meydanda kış ışık gösterisi; hemen yanından başlayan Cheonggyecheon dere yürüyüşü.", tip: "11 Aralık 2026–3 Ocak 2027 ilan edildi; saatler açıklanmadı (geçen yıl 17:30–21:30).", def: true },
    { id: "ikseon", name: "Ikseon-dong hanok sokakları", ko: "익선동", q: "Ikseon-dong, Seoul", lat: 37.57436, lng: 126.98978, cats: ["alisveris","yemek"], cluster: "eastjongno", hours: 1, when: "flex", order: 1,
      fee: 0, station: "Jongno 3-ga · Hat 1/3/5 · Çıkış 4",
      desc: "Eski hanoklara sığmış kafe ve restoranlar; dar, fotojenik sokaklar.", tip: "Hafta sonu öğleden sonra çok kalabalık.", def: true },
    { id: "gwangjang", name: "Gwangjang Pazarı", ko: "광장시장", q: "Gwangjang Market, Seoul", lat: 37.56978, lng: 127.00065, cats: ["yemek"], cluster: "eastjongno", hours: 1.5, when: "flex", order: 2,
      fee: 0, station: "Jongno 5-ga · Hat 1 · Çıkış 8",
      desc: "Seul'ün en eski pazarlarından; bindaetteok, mayak gimbap, kalguksu tezgâhları.", tip: "Yemekler yemek bütçesinden; bazı tezgâhlar pazar günü kapalı.", def: true },
    { id: "ddp", name: "DDP ve Dongdaemun", ko: "동대문디자인플라자", q: "Dongdaemun Design Plaza, Seoul", lat: 37.56707, lng: 127.0099, cats: ["sehir","alisveris"], cluster: "eastjongno", hours: 1.5, when: "flex", order: 3,
      fee: 0, feeNote: "Sergiler ayrıca ücretli", station: "Dongdaemun History & Culture Park · Hat 2/4/5 · Çıkış 1",
      desc: "Zaha Hadid tasarımı yapı; çevresinde geç saate kadar açık moda merkezleri.", tip: "Akşam ışıklandırmasıyla daha etkileyici.", def: false },
    { id: "namsan", name: "N Seoul Tower ve Namsan", ko: "N서울타워", q: "N Seoul Tower", lat: 37.55127, lng: 126.98828, cats: ["sehir"], cluster: "namsan", hours: 2, when: "evening", order: 1,
      fee: 29000, feeNote: "Seyir terası ₩29.000; teleferik gidiş-dönüş ₩15.000 ayrı", station: "Myeongdong · Hat 4 · Çıkış 3 → teleferiğe ~10 dk yürüme",
      desc: "Şehrin en bilinen seyir noktası; gece manzarası ve sevgi kilitleri.", tip: "Teleferik 10:00–23:00; rüzgârda durabilir. Zirve ücretsiz, terasa çıkmak isteğe bağlı.", def: true },
    { id: "myeongdong", name: "Myeongdong", ko: "명동", q: "Myeongdong, Seoul", lat: 37.56105, lng: 126.98542, cats: ["alisveris","yemek"], cluster: "namsan", hours: 2, when: "flex", order: 2,
      fee: 0, station: "Myeongdong · Hat 4 · Çıkış 6",
      desc: "Kozmetik mağazaları, akşamları sokak yemeği tezgâhları, Myeongdong Katedrali.", tip: "Tezgâhlar akşamüstü açılır; kalguksu için Myeongdong Kyoja.", def: true },
    { id: "namsangol", name: "Namsangol Hanok Köyü", ko: "남산골한옥마을", q: "Namsangol Hanok Village, Seoul", lat: 37.55835, lng: 126.99375, cats: ["tarih"], cluster: "namsan", hours: 1, when: "day", order: 0, closed: [1],
      fee: 0, station: "Chungmuro · Hat 3/4 · Çıkış 4",
      desc: "Taşınmış Joseon evleri ve geleneksel bahçe; Bukchon'a sakin alternatif.", tip: "Pazartesi kapalı.", def: false },
    { id: "nmk", name: "Kore Ulusal Müzesi", ko: "국립중앙박물관", q: "National Museum of Korea", lat: 37.52395, lng: 126.98032, cats: ["muze","tarih"], cluster: "yongsan", hours: 2.5, when: "day", order: 1, closedDates: ["2027-01-01"],
      fee: 0, feeNote: "Kalıcı sergiler ücretsiz", station: "Ichon · Hat 4 / Gyeongui-Jungang · Çıkış 2",
      desc: "Kore tarihinin en kapsamlı koleksiyonu; soğuk veya karlı gün için ideal.", tip: "1 Ocak'ta kapalı.", def: true },
    { id: "itaewon", name: "Itaewon ve Seul Merkez Camii", ko: "서울중앙성원", q: "Seoul Central Mosque", lat: 37.53343, lng: 126.99752, cats: ["yemek","sehir"], cluster: "yongsan", hours: 1.5, when: "flex", order: 2,
      fee: 0, station: "Itaewon · Hat 6 · Çıkış 3",
      desc: "Uluslararası restoranlar; caminin çevresinde helal lokantalar, Türk ve Orta Doğu mutfağı.", tip: "Haebangchon'dan yürüme veya kısa taksi mesafesinde.", def: false },
    { id: "hongdae", name: "Hongdae ve Yeonnam-dong", ko: "홍대입구역", q: "Hongik University Station, Seoul", lat: 37.55737, lng: 126.92445, cats: ["alisveris","yemek"], cluster: "west", hours: 2.5, when: "flex", order: 1,
      fee: 0, station: "Hongik Univ. · Hat 2 / AREX · Çıkış 9 (Hongdae), Çıkış 3 (Yeonnam)",
      desc: "Sokak müzisyenleri, butikler, kafeler; Gyeongui Line Orman Parkı boyunca Yeonnam.", tip: "Akşamları en canlı hali; Kore barbekü için iyi bölge.", def: true },
    { id: "seongsu", name: "Seongsu-dong", ko: "성수역", q: "Seongsu Station, Seoul", lat: 37.54541, lng: 127.05359, cats: ["alisveris","yemek"], cluster: "seongsu", hours: 2, when: "flex", order: 1,
      fee: 0, station: "Seongsu · Hat 2 · Çıkış 3",
      desc: "Eski fabrikalardan dönüştürülmüş kafeler ve pop-up mağazalar.", tip: "Hafta içi daha rahat; Seoul Forest parkı yakında.", def: true },
    { id: "coex", name: "Starfield Kütüphanesi ve Bongeunsa", ko: "별마당도서관", q: "Starfield Library COEX", lat: 37.51017, lng: 127.06009, cats: ["alisveris","tarih"], cluster: "gangnam", hours: 2, when: "flex", order: 1,
      fee: 0, station: "Samseong · Hat 2 · Çıkış 5–6 / Bongeunsa · Hat 9 · Çıkış 7",
      desc: "COEX Mall içinde dev kitap duvarlı kütüphane; karşısında Budist Bongeunsa tapınağı.", tip: "Kapalı alan; soğuk gün planı.", def: true },
    { id: "seoulsky", name: "Lotte World Tower · Seoul Sky", ko: "롯데월드타워 서울스카이", q: "Seoul Sky, Lotte World Tower", lat: 37.51255, lng: 127.10268, cats: ["sehir"], cluster: "gangnam", hours: 1.5, when: "evening", order: 2,
      fee: 33000, station: "Jamsil · Hat 2/8 · Çıkış 1–2",
      desc: "500 m'deki seyir terası; Kore'nin en yüksek binası.", tip: "10:30'da açılır; gün batımına (≈17:20) denk getirin. Altında Lotte World Mall ve Seokchon Gölü.", def: false },
    { id: "bosingak", name: "Bosingak yılbaşı çan töreni", ko: "보신각", q: "Bosingak, Seoul", lat: 37.56985, lng: 126.98361, cats: ["kis"], seasons: ["yilbasi"], cluster: "palace", hours: 2, when: "evening", pin: "2026-12-31", at: 22.5,
      fee: 0, station: "Jonggak · Hat 1 · Çıkış 4 (o gece tren durmayabilir; Jongno 3-ga veya Gwanghwamun'dan yürüyün)",
      desc: "Gece yarısı çan 33 kez çalınır; on binlerce kişi toplanır.", tip: "Erken gidin, sıcak giyinin. 2026 programı henüz açıklanmadı.", def: true },
    { id: "rink", name: "Seoul Plaza buz pateni", ko: "서울광장 스케이트장", q: "Seoul Plaza", lat: 37.56564, lng: 126.97799, cats: ["kis"], seasons: ["yilbasi"], cluster: "palace", hours: 1, when: "flex", order: 6,
      fee: 1000, unconfirmed: true, station: "City Hall · Hat 1/2 · Çıkış 5–6",
      desc: "Belediye binası önünde açık hava pisti; paten ve kask dahil.", tip: "Geçen sezon 19 Ara–8 Şub, saati ₩1.000'di. 2026 tarihleri henüz açıklanmadı.", def: false },
    { id: "nami", name: "Nami Adası", ko: "남이섬", q: "Nami Island", lat: 37.80384, lng: 127.52531, cats: ["gunubirlik"], cluster: "trip", hours: 8, when: "day", trip: true,
      fee: 19000, feeNote: "Giriş + feribot ₩19.000; ITX treni ayrıca", station: "ITX-Cheongchun: Yongsan veya Cheongnyangni → Gapyeong; taksi/otobüsle iskele, 5 dk feribot",
      desc: "Ağaçlı yollarıyla bilinen nehir adası; karlı günlerde çok güzel.", tip: "Yöresel yemek: Chuncheon usulü dakgalbi.", def: false },
    { id: "suwon", name: "Suwon Hwaseong Kalesi", ko: "수원 팔달문", q: "Hwaseong Fortress, Suwon", lat: 37.27758, lng: 127.01676, cats: ["gunubirlik","tarih"], cluster: "trip", hours: 7, when: "day", trip: true,
      fee: 1000, feeNote: "Surlar ₩1.000; Hwaseong Haenggung ayrı biletli", station: "Hat 1 veya Suin-Bundang → Suwon İstasyonu, oradan otobüsle Paldalmun",
      desc: "UNESCO listesindeki 18. yüzyıl surları; sur üstü yürüyüş ve Haenggung sarayı.", tip: "Surlar açık alanda; rüzgârlı günde soğuk.", def: false },
    { id: "dmz", name: "DMZ turu", ko: "임진각", q: "Imjingak", lat: 37.8923, lng: 126.744, cats: ["gunubirlik","tarih"], cluster: "trip", hours: 8, when: "day", trip: true,
      fee: null, feeNote: "Tur fiyatı şirkete göre değişir; toplama eklenmedi", station: "Yalnızca organize turla; Seul merkezinden toplama",
      desc: "İki Kore arasındaki askerî bölge; gözlem noktaları ve tüneller.", tip: "Pasaport zorunlu. Program güvenlik durumuna göre son anda değişebilir; iptal koşullarına bakın.", def: false },

    // ---- Bahar (sakura) ve Bayram dönemine özel yerler ----
    { id: "yeouido", name: "Yeouido Yunjung-ro kiraz yolu", ko: "여의서로 벚꽃길", q: "Yeouiseo-ro cherry blossom road, Seoul", lat: 37.52517, lng: 126.91481, cats: ["bahar","sehir"], seasons: ["sakura"], cluster: "yeouido", hours: 2, when: "flex", order: 1,
      fee: 0, station: "Kuk-hoe-uisadang (Ulusal Meclis) · Hat 9 · Çıkış 1 veya 6 (~400 m) / Yeouinaru · Hat 5",
      desc: "Han Nehri kıyısında 1,7 km boyunca ~1.886 kiraz ağacı; Seul'ün en ünlü sakura yolu.", tip: "2026'da festival 3–7 Nisan 11:30–21:30'du, yol 8 gün araçlara kapalıydı; 5 günde 3,6 milyon ziyaretçi. Hafta içi sabah gidin; festival cumartesileri trenler istasyonu atlayabiliyor, bir durak önce inin.", def: true },
    { id: "seokchon", name: "Seokchon Gölü kiraz festivali", ko: "석촌호수", q: "Seokchon Lake, Seoul", lat: 37.51009, lng: 127.10408, cats: ["bahar","sehir"], seasons: ["sakura"], cluster: "gangnam", hours: 1.5, when: "flex", order: 0,
      fee: 0, station: "Jamsil · Hat 2/8 · Çıkış 2–3",
      desc: "Göl çevresinde ~1.000 kiraz ağacı ve 2,5 km yol; arka planda Lotte World Tower.", tip: "2026'da festival 3–11 Nisan'dı; göl boyunca gece ışıklandırması resmî olarak var. 27 Mart–12 Nisan'da 9 milyon ziyaret: hafta içi 09:00'dan önce ya da akşam gidin.", def: true },
    { id: "yangjae", name: "Yangjaecheon kiraz ve fener festivali", ko: "양재천 영동1교", q: "Yangjaecheon Yeongdong 1-gyo, Seoul", lat: 37.47456, lng: 127.03866, cats: ["bahar"], seasons: ["sakura"], cluster: "gangnam", hours: 1.5, when: "evening", order: 3,
      fee: 0, station: "Maebong · Hat 3 · Çıkış 4 (~10 dk yürüme)",
      desc: "Dere boyunca kiraz ağaçları ve fenerler; Seul'ün en uzun süren sakura etkinliği.", tip: "2026'da 30 Mart–19 Nisan, 21 gün sürdü. Çiçeklenmeyi tam tutturamazsanız en güvenli seçenek; kalabalık orta düzeyde.", def: false },
    { id: "naksan", name: "Naksan Parkı ve şehir surları", ko: "낙산공원", q: "Naksan Park, Seoul", lat: 37.58053, lng: 127.00761, cats: ["sehir","tarih"], cluster: "eastjongno", hours: 1.5, when: "flex", order: 4,
      fee: 0, station: "Hyehwa · Hat 4 · Çıkış 2 (yokuş, ~15 dk)",
      desc: "Joseon dönemi sur duvarı boyunca yürüyüş; gün batımında şehir manzarası, hemen altında Ihwa duvar resimleri köyü.", tip: "Mart sonunda yamaçlar sarı forsythia ile kaplanır. Ihwa'da insanlar yaşıyor; sessiz olun.", def: false },
    { id: "everland", name: "Everland lale festivali", ko: "에버랜드", q: "Everland, Yongin", lat: 37.29355, lng: 127.20704, cats: ["gunubirlik","bahar"], seasons: ["sakura"], cluster: "trip", hours: 8, when: "day", trip: true,
      fee: null, feeNote: "Bilet fiyatı tarihe göre değişir; toplama eklenmedi", station: "Seul'den otobüs veya metro + Everland hattıyla 1–1,5 saat; güncel güzergâhı Naver Map'te kontrol edin",
      desc: "Kore'nin en büyük tema parkı; bahar festivalinde 100'den fazla lale çeşidi ve ~1,2 milyon çiçek, akşam geçit töreni.", tip: "2026'da lale festivali 20 Mart–30 Nisan'dı (VisitKorea); 2027 tarihleri açıklanmadı.", def: false },
    { id: "bayram", name: "Bayram namazı · Seul Merkez Camii", ko: "서울중앙성원", q: "Seoul Central Mosque", lat: 37.53343, lng: 126.99752, cats: ["bayram"], seasons: ["bayram"], cluster: "yongsan", hours: 2, when: "day", pin: "2027-03-09", at: 7.5,
      fee: 0, station: "Itaewon · Hat 6 · Çıkış 3, ~10 dk yokuş",
      desc: "Kore'nin ilk camisinde (1976) bayram namazı; ardından Usadan-ro'da helal kahvaltı ve bayramlaşma.", tip: "Kore'de bayram günü ve namaz saati Kore Müslüman Federasyonu (KMF) tarafından duyurulur; Türkiye ile aynı gün olmayabilir. Kadınlar için ayrı bölüm var, başörtüsü gerekli; ödünç örtü verilir.", def: true }
  ];

  const ICN = { name: "Incheon Havalimanı T1", ko: "인천국제공항 제1여객터미널", q: "Incheon International Airport", lat: 37.44957, lng: 126.45212 };

  const NEIGH = { palace: ["eastjongno","namsan"], eastjongno: ["palace","namsan","seongsu"], namsan: ["yongsan","palace","eastjongno"], yongsan: ["namsan","west","yeouido"], west: ["yongsan","yeouido"], yeouido: ["west","yongsan"], seongsu: ["eastjongno","gangnam"], gangnam: ["seongsu"] };
  const HOMECL = { myeongdong: "namsan", hongdae: "west", seoulstn: "yongsan", east: "eastjongno" };
  const LUNCH = {
    palace: "Öğle: Gyeongbokgung yakınında samgyetang (Tosokchon) veya Insadong'da geleneksel lokanta.",
    eastjongno: "Öğle: Gwangjang Pazarı'nda bindaetteok ve kalguksu.",
    namsan: "Öğle: Myeongdong Kyoja'da kalguksu veya sokak tezgâhları.",
    yongsan: "Öğle: Itaewon'da helal restoranlar veya müze içindeki yemek alanı.",
    west: "Öğle: Yeonnam-dong kafeleri; akşam Hongdae'de Kore barbekü.",
    seongsu: "Öğle: Seongsu'nun kafe ve fırınları.",
    gangnam: "Öğle: COEX Mall veya Lotte World Mall yemek katları.",
    yeouido: "Öğle: Yeouido Hangang Parkı'nda piknik veya IFC Mall / The Hyundai Seoul yemek katları.",
    trip: "Öğle: gidilen yerde yerel lokanta."
  };

  const FOOD = [
    { label: "Ekonomik", krw: 35000, desc: "kahvaltı marketten, öğlen gimbap/çorba, akşam yerel lokanta" },
    { label: "Orta", krw: 55000, desc: "kafe kahvaltısı, öğlen bibimbap/jjigae, akşam Kore barbekü" },
    { label: "Rahat", krw: 80000, desc: "her akşam barbekü veya restoran, kafe ve tatlı molaları" }
  ];

  // Mağaza kimlikleri 8 Kasım 2026'da App Store / Google Play sayfalarından doğrulandı.
  const APPS = [
    { id: "naver", name: "NAVER Map", group: "Harita ve ulaşım", must: true, color: "#03C75A", ink: "#fff", mono: "N",
      ios: "id311867728", android: "com.nhn.android.nmap", scheme: "nmap://map?appname=",
      why: "Kore'de en doğru toplu taşıma ve yürüme tarifi; İngilizce arayüzü var. Bu uygulamadaki \"Naver\" butonları rotayı doğrudan burada açar." },
    { id: "kakaomap", name: "KakaoMap", group: "Harita ve ulaşım", must: true, color: "#FFCD00", ink: "#191919", mono: "K",
      ios: "id304608425", android: "net.daum.android.map", scheme: "kakaomap://open",
      why: "Naver'e yedek harita; otobüs gerçek zamanlı konumu ve sokak görünümü güçlü. \"Kakao\" butonları buraya rota gönderir." },
    { id: "subway", name: "Subway Korea", group: "Harita ve ulaşım", must: false, color: "#2563EB", ink: "#fff", mono: "S",
      ios: "id325924444", android: "com.imagedrome.jihachul",
      why: "Çevrimdışı metro haritası, son tren saatleri ve hangi vagonun aktarmaya en yakın olduğu." },
    { id: "kakaot", name: "Kakao T", group: "Taksi", must: true, color: "#FEE500", ink: "#191919", mono: "T",
      ios: "id981110422", android: "com.kakao.taxi",
      why: "Kore'nin taksi uygulaması. 4 kişi + bavul için büyük taksi (Venti/jumbo) çağırmak ve adres anlatma derdi olmadan gitmek için." },
    { id: "papago", name: "Papago", group: "Çeviri", must: true, color: "#1DC078", ink: "#fff", mono: "P",
      ios: "id1147874819", android: "com.naver.labs.translator",
      why: "Korece için en iyi çevirmen: menü ve tabelaları kamerayla çevirir, sesli konuşma modu var." },
    { id: "wowpass", name: "WOWPASS", group: "Ödeme", must: false, color: "#6D28D9", ink: "#fff", mono: "W",
      ios: "id1626691440", android: "com.wow.wowpass",
      why: "Turistlere ön ödemeli kart: döviz bozdurma, kartla ödeme ve T-money tek kartta. Uygulamadan bakiye ve harcama takibi." },
    { id: "keta", name: "K-ETA", group: "Giriş belgeleri", must: true, color: "#0F3B8C", ink: "#fff", mono: "ETA",
      ios: "id1562976724", android: "kr.go.keta", web: "https://www.k-eta.go.kr",
      why: "Resmî elektronik seyahat izni başvurusu (₩10.000). Türk vatandaşları için zorunlu; aracı sitelere para vermeyin." },
    { id: "klook", name: "Klook", group: "Tur ve bilet", must: false, color: "#FF5B00", ink: "#fff", mono: "KL",
      ios: "id961850126", android: "com.klook",
      why: "DMZ turu, Nami Adası servisleri, Seoul Sky ve kayak paketleri için indirimli bilet." },
    { id: "kakaotalk", name: "KakaoTalk", group: "İletişim", must: false, color: "#FEE500", ink: "#191919", mono: "KT",
      ios: "id362057947", android: "com.kakao.talk",
      why: "Kore'de herkesin kullandığı mesajlaşma; ev sahipleri, restoranlar ve tur şirketleri buradan yazışır." },
    { id: "airbnb", name: "Airbnb", group: "Rezervasyon", must: false, color: "#FF385C", ink: "#fff", mono: "A",
      ios: "id401626263", android: "com.airbnb.android",
      why: "Ev rezervasyonu, giriş talimatları ve ev sahibiyle yazışma." },
    { id: "booking", name: "Booking.com", group: "Rezervasyon", must: false, color: "#003B95", ink: "#fff", mono: "B",
      ios: "id367003839", android: "com.booking",
      why: "Otel rezervasyonu ve iptal yönetimi." }
  ];

  const PHRASES = [
    { cat: "Temel", tr: "Merhaba", ko: "안녕하세요", ro: "annyeong-haseyo" },
    { cat: "Temel", tr: "Teşekkür ederim", ko: "감사합니다", ro: "gamsa-hamnida" },
    { cat: "Temel", tr: "Evet / Hayır", ko: "네 / 아니요", ro: "ne / aniyo" },
    { cat: "Temel", tr: "Afedersiniz, özür dilerim", ko: "죄송합니다", ro: "joesong-hamnida" },
    { cat: "Temel", tr: "Anlamadım", ko: "잘 모르겠어요", ro: "jal moreugesseoyo" },
    { cat: "Temel", tr: "İngilizce biliyor musunuz?", ko: "영어 할 줄 아세요?", ro: "yeong-eo hal jul aseyo?" },
    { cat: "Temel", tr: "Bu ne kadar?", ko: "이거 얼마예요?", ro: "igeo eolmayeyo?" },
    { cat: "Temel", tr: "Kartla ödeyebilir miyim?", ko: "카드 돼요?", ro: "kadeu dwaeyo?" },
    { cat: "Yemek", tr: "Dört kişiyiz", ko: "네 명이에요", ro: "ne myeong-ieyo" },
    { cat: "Yemek", tr: "İçinde domuz eti var mı?", ko: "돼지고기 들어가요?", ro: "dwaeji-gogi deureogayo?" },
    { cat: "Yemek", tr: "Domuz eti olmasın lütfen", ko: "돼지고기 빼 주세요", ro: "dwaeji-gogi ppae juseyo" },
    { cat: "Yemek", tr: "Helal yemek var mı?", ko: "할랄 음식 있어요?", ro: "hallal eumsik isseoyo?" },
    { cat: "Yemek", tr: "Acı olmasın lütfen", ko: "안 맵게 해 주세요", ro: "an maepge hae juseyo" },
    { cat: "Yemek", tr: "Su lütfen", ko: "물 주세요", ro: "mul juseyo" },
    { cat: "Yemek", tr: "Hesap lütfen", ko: "계산해 주세요", ro: "gyesan-hae juseyo" },
    { cat: "Yemek", tr: "Çok lezzetli", ko: "정말 맛있어요", ro: "jeongmal masisseoyo" },
    { cat: "Ulaşım", tr: "Bu adrese gidelim lütfen", ko: "이 주소로 가 주세요", ro: "i jusoro ga juseyo" },
    { cat: "Ulaşım", tr: "Burada durun lütfen", ko: "여기서 세워 주세요", ro: "yeogiseo sewo juseyo" },
    { cat: "Ulaşım", tr: "Metro istasyonu nerede?", ko: "지하철역 어디예요?", ro: "jihacheol-yeok eodiyeyo?" },
    { cat: "Ulaşım", tr: "Tuvalet nerede?", ko: "화장실 어디예요?", ro: "hwajangsil eodiyeyo?" },
    { cat: "Acil", tr: "Yardım edin!", ko: "도와주세요!", ro: "dowajuseyo!" },
    { cat: "Acil", tr: "Hastaneye gitmem gerekiyor", ko: "병원에 가야 해요", ro: "byeongwone gaya haeyo" },
    { cat: "Acil", tr: "Kayboldum", ko: "길을 잃었어요", ro: "gireul ireosseoyo" },
    { cat: "Acil", tr: "Polis çağırın lütfen", ko: "경찰 불러 주세요", ro: "gyeongchal bulleo juseyo" },
    { cat: "Yılbaşı", tr: "Mutlu yıllar", ko: "새해 복 많이 받으세요", ro: "saehae bok mani badeuseyo" },
    { cat: "Yılbaşı", tr: "Şerefe", ko: "건배", ro: "geonbae" }
  ];

  const CHECKLIST = [
    { id: "keta", text: "K-ETA başvurusu (4 kişi, uçuştan en az 3 gün önce)", href: "https://www.k-eta.go.kr", ext: true },
    { id: "pasaport", text: "Pasaport geçerliliği: dönüşten sonra en az 6 ay" },
    { id: "ucak", text: "Uçak biletleri (bagajlı tarife)", href: "#planla/ucus" },
    { id: "konak", text: "Konaklama rezervasyonu", href: "#planla/konaklama" },
    { id: "sigorta", text: "Seyahat sağlık sigortası" },
    { id: "apps", text: "Naver Map, KakaoMap, Papago, Kakao T'yi indir", href: "#rehber/uygulamalar" },
    { id: "pwa", text: "Bu uygulamayı telefona yükle (çevrimdışı çalışır)", action: "install" },
    { id: "internet", text: "İnternet: eSIM, Kore SIM'i veya pocket Wi-Fi" },
    { id: "won", text: "Pazar ve T-money için biraz nakit won" },
    { id: "giyim", text: "Kışlık mont, bere, eldiven, termal içlik", seasons: ["yilbasi"] },
    { id: "giyim2", text: "Katmanlı giyim: mont, kazak, atkı (sabahlar soğuk)", seasons: ["bayram"] },
    { id: "giyim3", text: "İnce mont, kazak, rahat yürüyüş ayakkabısı", seasons: ["sakura"] },
    { id: "huwon", text: "Huwon bahçe turu rezervasyonu (gidecekseniz)" },
    { id: "nye", text: "31 Aralık akşam yemeği rezervasyonu", seasons: ["yilbasi"] },
    { id: "kmf", text: "Kore'deki bayram günü ve namaz saatini KMF duyurusundan kontrol et", seasons: ["bayram"], href: "https://www.koreaislam.org/en/mainpage/", ext: true },
    { id: "mask", text: "KF94 maske (Mart–Nisan sarı toz ve ince toz)", seasons: ["bayram", "sakura"] },
    { id: "bloom", text: "Şubat sonu çıkan çiçeklenme tahminine göre tarihleri kesinleştir", seasons: ["sakura"] },
    { id: "freecancel", text: "Ücretsiz iptalli konaklama seç (çiçeklenme kayabilir)", seasons: ["sakura"] }
  ];

  // ---------- Dönemler ----------
  // Mart ve Nisan fiyatları 8 Kasım 2026'da Google Uçuşlar (1 yetişkin, ekonomi) ve Airbnb/Booking'den alındı.
  // Konaklama: stay = örnek tarih aralığı için toplam TL; null = o tarihte müsait görünmedi veya fiyat doğrulanamadı.
  const SEASONS = [
    { id: "yilbasi", label: "Yılbaşı", sub: "Aralık 2026", icon: "snow", color: "var(--c-kis)", eyebrow: "Yılbaşı 2026 → 2027",
      leaveNote: "Türkiye'de 1 Ocak dışında resmî tatil yok; tarihe göre 4–6 gün izin.",
      weather: { hi: 4, lo: -3, rain: 23, note: "Kuru ve soğuk; gece −3,4 °C. Kalın mont, bere, eldiven." },
      highlight: "31 Aralık gecesi Bosingak çan töreni, Gwanghwamun ışık gösterisi, buz pateni.",
      guide: [
        { title: "Yılbaşı gecesi (31 Aralık)", icon: "sparkles", tone: "red", items: [
          "Bosingak çan töreni gece yarısı; çan 33 kez çalınır. 2025'te program 22:50–00:20 arasıydı.",
          "2025'te Jonggak istasyonunda 23:00–01:00 arası tren durmadı, çevre yollar 18:00'den kapatıldı, metro son seferleri 02:00'ye uzatıldı.",
          "2026 programı henüz açıklanmadı; Seul Belediyesi genelde 30 Aralık civarı duyurur.",
          "31 Aralık ve 25 Aralık (resmî tatil) akşam yemeği için önceden rezervasyon yapın." ] },
        { title: "Hava ve giyim", icon: "snow", tone: "", items: [
          "Aralık ortalaması 0,2 °C (gece −3,4 °C, gündüz 4,2 °C); Ocak daha soğuk, yaklaşık −6 ile 2 °C arası.",
          "Kalın mont, bere, eldiven, kaymayan ayakkabı. Metro ve AVM'ler sıcak; katmanlı giyinin.",
          "İnce toz günlerinde AirKorea'ya bakın; KF94 maske marketlerde satılır." ] }
      ] },
    { id: "bayram", label: "Ramazan Bayramı", sub: "Mart 2027", icon: "moon", color: "var(--c-gunubirlik)", eyebrow: "Ramazan Bayramı 2027",
      leaveNote: "Türkiye'de arife 8 Mart (yarım gün), bayram 9–11 Mart. 12 Mart Cuma izinle 6–14 Mart 9 gün.",
      weather: { hi: 11, lo: 2, rain: 37, note: "Günler arası büyük fark; sabahları don olabilir. Sarı tozun en yoğun olduğu ay: KF94 maske." },
      highlight: "Seul Merkez Camii'nde bayram namazı; saraylar kalabalıksız, kiraz henüz açmamış.",
      stayRange: ["2027-03-09", "2027-03-15"],
      stay: { "1609196513678801566": 43911, "1049670250878875939": null, "1384249110909704228": 44500, "1382960643056240467": 37174, "51675962": 40684,
        "1339106802824892099": 50615, "1081781456973510644": null, "1648290505111026329": 60410, "melrouseutei-hongdae-mellow-stay-hongdae": 83892,
        "holiday-inn-express-seoul-hongdae": 116073, "l7-hongdae": null, "lotte-city-seoul-myeongdong": 130814, "fraser-place-namdaemun": 141739, "l7-myeongdong-by-lotte": 150620 },
      trips: [
        { id: "b3", dep: "2027-03-08", ret: "2027-03-15", leave: "Arife öğlene kadar + 12 ve 15 Mart (2,5 gün izin)", flights: [
          { al: "Qatar Airways", dep: "20:10", arr: "17:15", off: 1, dur: "15 sa 05 dk", direct: false, via: "Doha (DOH) · 2 sa 15 dk", price: 39733, note: "En ucuz makul seçenek; ama bayramın ilk günü akşam varış, Kore'de bayram 9 Mart'sa namazı kaçırırsınız." },
          { al: "Korean Air", dep: "21:55", arr: "13:55", off: 1, dur: "10 sa", direct: true, via: "Aktarmasız", price: 43518, note: "Aktarmasızların en ucuzu." },
          { al: "Turkmenistan", dep: "22:50", arr: "04:30", off: 2, dur: "23 sa 40 dk", direct: false, via: "Aşkabat (ASB) · 12 sa 20 dk", price: 33288, note: "En ucuz ama 10 Mart sabahı varış; bayram namazını kaçırırsınız." },
          { al: "THAI", dep: "16:30", arr: "15:25", off: 1, dur: "16 sa 55 dk", direct: false, via: "Bangkok (BKK) · 2 sa 40 dk", price: 47511 },
          { al: "Turkish Airlines", dep: "02:20", arr: "18:20", off: 0, dur: "10 sa", direct: true, via: "Aktarmasız", price: 54238, note: "7'yi 8'e bağlayan gece kalkış; 8 Mart akşamı Seul'desiniz (+1 gece)." }
        ] },
        { id: "b2", dep: "2027-03-07", ret: "2027-03-14", leave: "Arife yarım gün + 12 Mart (1,5 gün izin)", flights: [
          { al: "Qatar Airways", dep: "20:10", arr: "17:15", off: 1, dur: "15 sa 05 dk", direct: false, via: "Doha (DOH) · 2 sa 15 dk", price: 49782 },
          { al: "MIAT / Korean Air", dep: "16:20", arr: "12:05", off: 1, dur: "13 sa 45 dk", direct: false, via: "Ulanbatur (UBN) · 2 sa 15 dk", price: 55126 },
          { al: "Korean Air", dep: "21:55", arr: "13:55", off: 1, dur: "10 sa", direct: true, via: "Aktarmasız", price: 55351 },
          { al: "LOT", dep: "15:00", arr: "10:30", off: 2, dur: "37 sa 30 dk", direct: false, via: "Varşova (WAW) · 23 sa 40 dk", price: 43597, note: "Ucuz ama Varşova'da gece geçiren 37 saatlik yolculuk." }
        ] },
        { id: "b1", dep: "2027-03-06", ret: "2027-03-14", leave: "Arife yarım gün + 12 Mart (1,5 gün izin), 9 günün tamamı", flights: [
          { al: "Qatar Airways", dep: "20:10", arr: "17:15", off: 1, dur: "15 sa 05 dk", direct: false, via: "Doha (DOH) · 2 sa 15 dk", price: 53643 },
          { al: "Air Astana", dep: "12:20", arr: "09:55", off: 1, dur: "15 sa 35 dk", direct: false, via: "Almatı (ALA) · 4 sa 10 dk", price: 56193 },
          { al: "Asiana Airlines", dep: "21:55", arr: "13:55", off: 1, dur: "10 sa", direct: true, via: "Aktarmasız", price: 59907 },
          { al: "LOT", dep: "15:00", arr: "10:30", off: 2, dur: "37 sa 30 dk", direct: false, via: "Varşova (WAW) · 23 sa 40 dk", price: 43597, note: "Ucuz ama 37 saatlik yolculuk." }
        ] }
      ],
      guide: [
        { title: "Kore'de bayram", icon: "moon", tone: "green", items: [
          "Bayram namazı Seul Merkez Camii'nde (Itaewon) kılınır. Kore'deki bayram günü ve saati Kore Müslüman Federasyonu (KMF) tarafından duyurulur; Türkiye ile aynı gün olmayabilir.",
          "Ramazan boyunca camide her akşam ücretsiz iftar veriliyor; 8 Mart'ta varırsanız son iftara yetişebilirsiniz.",
          "Kadınlar için ayrı namaz bölümü var; başörtüsü gerekli, ödünç örtü veriliyor. Caminin hemen yanında helal kasap ve lokantalar var.",
          "Kore'de bayram tatil değil: her yer açık, hafta içi saraylar ve müzeler sakin." ] },
        { title: "Mart'ta Seul", icon: "cloud-sun", tone: "", items: [
          "Ortalama en yüksek 11 °C, en düşük 2 °C, ~37 mm yağış (KMA 1991–2020). Gün içinde 18 °C'den sabah dona kadar dalgalanabilir.",
          "Sarı toz (hwangsa) ve ince tozun en yoğun olduğu ay. KF94 maske marketlerde satılır; AirKorea veya Misemise'den günlük durumu kontrol edin.",
          "Kiraz henüz açmamış olur; Mart sonuna doğru sarı forsythia ve azaleler başlar. Saraylar Mart'tan itibaren 18:00'e kadar açık.",
          "Katmanlı giyinin: mont, kazak, atkı; akşamları kış gibi." ] },
        { title: "Tatil ve izin", icon: "calendar", tone: "amber", items: [
          "Türkiye: 8 Mart arife (yarım gün), 9–11 Mart Ramazan Bayramı (Salı–Perşembe).",
          "12 Mart Cuma izin alınırsa 6–14 Mart 9 günlük tatil olur; 8–15 Mart seçeneği en ucuz uçuşları veriyor.",
          "Bayram dönemi bilet talebi yüksek; fiyatlar yaklaştıkça artabilir." ] }
      ] },
    { id: "sakura", label: "Sakura", sub: "Nisan 2027", icon: "flower", color: "var(--c-bahar)", eyebrow: "Sakura · Bahar 2027",
      leaveNote: "Türkiye'de resmî tatil yok; 6–7 iş günü izin.",
      weather: { hi: 18, lo: 8, rain: 73, note: "Gündüz ılık, sabah-akşam serin. İnce mont ve kazak; ince toz günlerinde maske." },
      highlight: "Yeouido ve Seokchon kiraz festivalleri, Han Nehri'nde piknik, Everland lale festivali.",
      stayRange: ["2027-04-02", "2027-04-09"],
      stay: { "1609196513678801566": null, "1049670250878875939": null, "1384249110909704228": 49716, "1382960643056240467": null, "51675962": 44634,
        "1339106802824892099": 54030, "1081781456973510644": null, "1648290505111026329": 67830, "melrouseutei-hongdae-mellow-stay-hongdae": null,
        "holiday-inn-express-seoul-hongdae": 203904, "l7-hongdae": 256854, "lotte-city-seoul-myeongdong": 239041, "fraser-place-namdaemun": 215926, "l7-myeongdong-by-lotte": 263433 },
      // Yeouido Yunjung-ro: KMA çiçeklenme (açma) ve tam çiçeklenme tarihleri (Seoul Window derlemesi, KMA kayıtları).
      bloom: [["2017","04-06","04-10"],["2018","04-02","04-05"],["2019","04-04","04-08"],["2020","03-30","04-03"],["2021","03-25","03-30"],
        ["2022","04-04","04-08"],["2023","03-26","03-30"],["2024","03-31","04-03"],["2025","04-03","04-07"],["2026","03-29","04-03"]],
      trips: [
        { id: "s2", dep: "2027-04-01", ret: "2027-04-09", leave: "7 iş günü izin (1–9 Nisan, Perşembe–Cuma)", flights: [
          { al: "Qatar Airways", dep: "13:45", arr: "10:30", off: 1, dur: "14 sa 45 dk", direct: false, via: "Doha (DOH) · 2 sa", price: 33536, note: "En iyi fiyat/süre; sabah varış." },
          { al: "Qatar Airways", dep: "20:05", arr: "17:05", off: 1, dur: "15 sa", direct: false, via: "Doha (DOH) · 2 sa 15 dk", price: 42583 },
          { al: "Asiana Airlines", dep: "17:20", arr: "09:35", off: 1, dur: "10 sa 15 dk", direct: true, via: "Aktarmasız", price: 54152, note: "Aktarmasız, sabah varış." },
          { al: "Etihad", dep: "13:50", arr: "10:50", off: 1, dur: "15 sa", direct: false, via: "Abu Dabi (AUH) · 1 sa 45 dk", price: 55738 },
          { al: "Turkish Airlines", dep: "16:50", arr: "08:30", off: 1, dur: "9 sa 40 dk", direct: true, via: "Aktarmasız", price: 59243 }
        ] },
        { id: "s3", dep: "2027-04-02", ret: "2027-04-10", leave: "6 iş günü izin (2–10 Nisan, Cuma–Cumartesi)", flights: [
          { al: "THAI", dep: "16:30", arr: "15:25", off: 1, dur: "16 sa 55 dk", direct: false, via: "Bangkok (BKK) · 2 sa 20 dk", price: 43433 },
          { al: "Korean Air", dep: "21:20", arr: "13:25", off: 1, dur: "10 sa 05 dk", direct: true, via: "Aktarmasız", price: 47429, note: "Aktarmasızların en ucuzu." },
          { al: "Qatar Airways", dep: "20:05", arr: "17:05", off: 1, dur: "15 sa", direct: false, via: "Doha (DOH) · 2 sa 15 dk", price: 48589 },
          { al: "Turkish Airlines", dep: "01:45", arr: "17:40", off: 0, dur: "9 sa 55 dk", direct: true, via: "Aktarmasız", price: 51736, note: "1'i 2'ye bağlayan gece kalkış, aynı gün varış." },
          { al: "Turkish Airlines", dep: "16:50", arr: "08:30", off: 1, dur: "9 sa 40 dk", direct: true, via: "Aktarmasız", price: 62997 }
        ] },
        { id: "s1", dep: "2027-03-31", ret: "2027-04-08", leave: "7 iş günü izin (31 Mart–8 Nisan, Çarşamba–Perşembe)", flights: [
          { al: "Qatar Airways", dep: "13:45", arr: "10:30", off: 2, dur: "38 sa 45 dk", direct: false, via: "Doha (DOH) · 26 sa", price: 42642, note: "Ucuz ama Doha'da 26 saat bekleme; 2 Nisan varış." },
          { al: "Turkish Airlines", dep: "01:45", arr: "17:40", off: 0, dur: "9 sa 55 dk", direct: true, via: "Aktarmasız", price: 54238, note: "30'u 31'e bağlayan gece kalkış, aynı gün varış." },
          { al: "Etihad", dep: "13:50", arr: "10:50", off: 1, dur: "15 sa", direct: false, via: "Abu Dabi (AUH) · 1 sa 45 dk", price: 55738 },
          { al: "Qatar Airways", dep: "20:05", arr: "17:05", off: 1, dur: "15 sa", direct: false, via: "Doha (DOH) · 2 sa 15 dk", price: 56647 }
        ] }
      ],
      guide: [
        { title: "Çiçeklenme ne zaman?", icon: "flower", tone: "red", items: [
          "Kore Meteoroloji İdaresi (KMA) 2016'dan beri tahmin yapmıyor, yalnızca açtığını duyuruyor. Özel tahminler (Weatheri, Kweather) Şubat sonunda çıkar; 2026'da 5 gün yanıldılar.",
          "Seul'de 30 yıllık ortalama açma 8 Nisan, ama son 10 yılın 6'sında 4 Nisan'dan önce açtı. Tam çiçeklenme açmadan 2–6 gün sonra; korular yaklaşık 1 hafta sonra en güzel hâlinde.",
          "Mart ortasından itibaren KMA Weather Nuri 'bahar çiçeği durumu' sayfası günlük durumu gösterir.",
          "Kaçırırsanız: Namsan gibi yüksek yerler 2–3 gün geç açar; Yangjaecheon festivali 3 hafta sürer." ] },
        { title: "Festivaller ve kalabalık", icon: "users", tone: "", items: [
          "2026 tarihleri (2027 için Mart ortasında açıklanır): Yeouido 3–7 Nisan, Seokchon Gölü 3–11 Nisan, Yangjaecheon 30 Mart–19 Nisan.",
          "2026'da Yeouido 5 günde 3,6 milyon, Seokchon 17 günde 9 milyon ziyaret gördü. Hafta sonu hafta içinin iki katı kalabalık.",
          "Festival cumartesileri Yeouido ve Jamsil'de trenler kalabalık istasyonu atlayabiliyor; bir durak önce inip yürüyün. Taksi Yeouido kiraz yoluna giremiyor.",
          "Seokchon'da göl boyunca gece ışıklandırması var; akşam ikinci bir ziyaret farklı bir manzara verir." ] },
        { title: "Nisan'da Seul", icon: "cloud-sun", tone: "amber", items: [
          "Ortalama en yüksek 18 °C, en düşük 8 °C, ~73 mm yağış (KMA 1991–2020). Yağmur ve rüzgâr bir gecede çiçekleri dökebilir.",
          "İnce toz kiraz zamanına denk gelebilir; KF94 maske bulundurun.",
          "Otel fiyatları yükselir ve hızlı dolar; ücretsiz iptalli rezervasyonla tarihleri esnek tutun." ] }
      ] }
  ];

  // Fiyat takibi. Rezervasyon penceresi: Google Uçuş Arama 2021–2025 verisi; ABD çıkışlı 4–16 günlük gidiş-dönüşler
  // (Noel: kalkıştan 32–73 gün önce, en düşük ortalama 51. gün; Mart–Nisan: 28–61, en düşük 43). Türkiye çıkışı için yön gösterir, kesin değildir.
  // Kara Cuma: 2025'te Qatar Airways Avrupa çıkışlı kampanyası 21 Kas–2 Ara satış, taban ücrette %20'ye varan indirim (vergiler hariç),
  // seyahat satıştan sonraki 365 gün; bazı şehirlerde Noel–Yılbaşı ve Paskalya kapsam dışıydı. 2026 Kara Cuma 27 Kasım; hatırlatıcılar 2025 takvimine göre.
  const PRICE_WATCH = {
    window: {
      yilbasi: { min: 32, best: 51, max: 73, label: "Noel–yılbaşı uçuşlarında" },
      bahar: { min: 28, best: 43, max: 61, label: "Mart–Nisan uçuşlarında" }
    },
    saleDays: [["2026-11-20", "Kara Cuma kampanyaları başladı mı?"], ["2026-11-27", "Kara Cuma"], ["2026-12-01", "Kara Cuma kampanyalarında son günler"]],
    src: {
      window: "https://blog.google/products-and-platforms/products/search/holiday-travel-trends-2025/",
      sale: "https://travelfree.info/5-qatar-airways-black-friday/",
      google: "https://support.google.com/travel/answer/6235879?hl=tr",
      skyscanner: "https://help.skyscanner.net/hc/en-gb/articles/115002499829-How-do-I-set-up-or-cancel-email-price-alerts"
    }
  };

  return { KRW_TRY, PEOPLE, BUDGET, REF_DEP, REF_RET, KETA_KRW, deps, rets, P, QR, ALTS, SEARCH_AIRLINES, AL_CODE,
    AREAS, STAYS, CATS, CAT_META, PLACES, ICN, NEIGH, HOMECL, LUNCH, FOOD, APPS, PHRASES, CHECKLIST, SEASONS, PRICE_WATCH };
})();
