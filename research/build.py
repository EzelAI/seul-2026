"""research/*.json + assets/img/img_credits.json -> assets/research.js (window.RESEARCH).
Çalıştır: python research/build.py  (proje kökünden)"""
import json, re, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
tb = json.loads((root / "research/tr_blogs.json").read_text(encoding="utf-8"))
rt = json.loads((root / "research/ratings.json").read_text(encoding="utf-8"))
cr = json.loads((root / "assets/img/img_credits.json").read_text(encoding="utf-8"))

# Uygulamadaki yer kimliği -> Türk blog "places" kaydını bulan anahtar kelimeler (ilk eşleşen alınır).
TR_KEY = {
    "gyeongbok": "Gyeongbokgung", "bukchon": "Bukchon", "changdeok": "Changdeokgung", "insadong": "Insadong",
    "ikseon": "Ikseon", "gwangjang": "Gwangjang Pazar", "ddp": "Dongdaemun", "namsan": "N Seoul Tower",
    "myeongdong": "Myeongdong", "nmk": "Ulusal Müze", "itaewon": "Itaewon", "hongdae": "Hongdae", "seongsu": "Seongsu",
    "coex": "COEX", "seoulsky": "Lotte World Tower", "dmz": "DMZ", "suwon": "Suwon", "nami": "Nami",
}
tr_by_name = {p["name"]: p for p in tb["places"]}
trmap = {}
for pid, key in TR_KEY.items():
    hit = next((p for p in tb["places"] if key.lower() in p["name"].lower()), None)
    if hit:
        trmap[pid] = {"n": len(set(hit["mentions"])), "comment": hit.get("tr_comment"), "m": sorted(set(hit["mentions"]), key=lambda s: int(s[1:]))}

ratings = {}
for pid, it in rt["items"].items():
    g, ta = it.get("google"), it.get("tripadvisor")
    ratings[pid] = {
        "g": [g["rating"], g["count"], g["url"]] if g else None,
        "ta": [ta["rating"], ta["count"], ta["url"]] if ta else None,
        "praise": it.get("praise", []), "complaints": it.get("complaints", []),
        "verdict": it.get("verdict", ""), "sources": it.get("sources", []),
    }

linked = {p["name"] for p in tb["places"]}
mapped_names = {tr_by_name[n]["name"] for n in [next((p["name"] for p in tb["places"] if k.lower() in p["name"].lower()), None) for k in TR_KEY.values()] if n}
tr_places = []
rev = {}
for pid, v in trmap.items():
    name = next(p["name"] for p in tb["places"] if TR_KEY[pid].lower() in p["name"].lower())
    rev[name] = pid
for p in tb["places"]:
    tr_places.append({"name": p["name"], "ko": p.get("ko"), "area": p.get("area"), "n": len(set(p["mentions"])),
                      "m": sorted(set(p["mentions"]), key=lambda s: int(s[1:])), "comment": p.get("tr_comment"), "id": rev.get(p["name"])})
tr_places.sort(key=lambda x: -x["n"])

rests = []
for r in tb["restaurants"]:
    rests.append({k: r.get(k) for k in ("name", "ko", "area", "type", "order", "note", "halal", "station", "price")} |
                 {"m": sorted(set(r["mentions"]), key=lambda s: int(s[1:]))})
rests.sort(key=lambda x: -len(x["m"]))

out = {
    "asof": rt["asof"],
    "images": cr,
    "ratings": ratings,
    "trmap": trmap,
    "tr": {"sources": tb["sources"], "places": tr_places, "restaurants": rests, "tips": tb.get("tips", [])},
}
js = "/* Otomatik üretildi: python research/build.py */\nwindow.RESEARCH = " + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n"
(root / "assets/research.js").write_text(js, encoding="utf-8")
print("research.js", len(js) // 1024, "KB;", len(rests), "restoran,", len(tr_places), "yer,", len(trmap), "eşleşen yer")
