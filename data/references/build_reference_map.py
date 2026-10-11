"""يستخرج الإحالات من نصوص المواد كاملةً (الدستور 180 فصلاً، ومدونة الأسرة 399 مادة)
ويكتب src/data/reference-map.auto.json.

القواعد (لا يُخترع شيء):
  1) إحالة صريحة (explicit): جملة تسمّي فصلاً أو مادة برقمها، والرقم موجود فعلاً
     في النص المُحال إليه. تُعتبر داخلية إن لم تذكر الجملة نصاً آخر، أو ذكرت
     «من هذا الدستور / من هذه المدونة»، وتُعتبر «الدستور» إن قالت «من الدستور»
     في مدونة الأسرة. أي إحالة إلى قانون آخر غير معروف تُترك.
  2) تخويل تشريعي (delegation): جملة فيها «يحدد القانون/قانون تنظيمي …» دون
     تسمية نص منفّذ. يُؤخذ موضوع التخويل حرفياً من الجملة.
  3) الاقتباس (excerpt) هو الجملة نفسها كما وردت في النص المصدر، ويُتحقق منه.
  4) مفتاح التفرد مطابق للمجموعة المنسّقة: fromArticle|toArticle|type.
     الإحالة المكررة لا تُضاف مرتين، والمنسّقة يدوياً لها الأولوية.
"""
import json, os, re, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(REPO, "src", "data", "reference-map.auto.json")
CURATED = os.path.join(REPO, "src", "data", "reference-map.json")

CONST_TEXT = "الدستور المغربي (2011)"
FC_TEXT = "مدونة الأسرة (القانون 70.03)"
CONST_URL = json.load(open(CURATED, encoding="utf-8"))["meta"]["sourceUrl"]
FC_URL = ("https://adala.justice.gov.ma/api/uploads/2024/07/22/"
          "%D9%85%D8%AF%D9%88%D9%86%D8%A9%20%D8%A7%D9%84%D8%A3%D8%B3%D8%B1%D8%A9-1721646687560.pdf")
REVIEWED_BY = "استخراج آلي من النص المعتمد في المستودع، بانتظار مراجعة تحريرية"
REVIEWED_ON = "2026-10-10"

laws = {
    "constitution": {
        "text": CONST_TEXT, "word": "الفصل", "dual": "الفصلين", "plural": "الفصول", "other_law": "الدستور",
        "file": os.path.join(REPO, "data", "laws", "constitution-2011.articles.json"),
        "markdown": os.path.join(REPO, "data", "laws", "constitution-2011.ar.md"),
        "source_url": CONST_URL,
    },
    "family": {
        "text": FC_TEXT, "word": "المادة", "dual": "المادتين", "plural": "المواد", "other_law": "المدونة",
        "file": os.path.join(REPO, "data", "laws", "mudawana-70-03.articles.json"),
        "markdown": os.path.join(REPO, "data", "laws", "mudawana-70-03.ar.md"),
        "source_url": FC_URL,
    },
}

HEADING = re.compile(r"^\s*(الباب|القسم|الكتاب|الفرع)\b")
# كلمة نص الإحالة: مادة/فصل، مفرد أو مثنى أو جمع، ثم أرقام مفصولة بـ و أو، أو مدى بـ إلى
REF = re.compile(
    r"(المادتين|الفصلين|المادة|المواد|الفصل|الفصول)\s+((?:من\s+)?\d+(?:\s*(?:و|،|,|إلى|حتى|-)\s*(?:من\s+)?\d+)*)"
)
# تخويل بصيغة «يحدد القانون/قانون تنظيمي <موضوع>»: الموضوع بعد الفعل
DELEG_OBJ = re.compile(r"(?:يحدد|تحدد)\s+(قانون تنظيمي|القانون التنظيمي|القانون|قانون)(?:\s*[،,]\s*|\s+)")
# تخويل بصيغة «… التي ينص عليها القانون» أو «… يحددها قانون تنظيمي»: الموضوع قبل الفعل
DELEG_SUBJ = re.compile(
    r"(?:يحدده|يحددها|يحددهما|تحدده|تحددها|ينص\s+(?:عليه|عليها|عليهما|عليهم))\s+(قانون تنظيمي|القانون التنظيمي|القانون|قانون)(?!\s+رقم)"
)
STRONG_MARKERS = ("وفق ", "وفقا ", "وفقاً ", "حسب ", "طبقا ", "طبقاً ", "بمقتضى ", "في حدود ", "ضمن ")
CONTEXT_MARKERS = ("التي ", "الذي ", "وفق ", "وفقا ", "وفقاً ", "حسب ", "ضمن ", "طبقا ", "طبقاً ", "بمقتضى ", "في حدود ")


def cut_words(value, limit=140):
    value = value.strip()
    if len(value) > limit:
        value = value[:limit].rsplit(" ", 1)[0]
    return value.rstrip(" ،,.؛:")


def delegation_of(seg):
    """يعيد (الجهة المُنَاطة، موضوع التخويل، نمط) أو None — كله حرفياً من الجملة."""
    m = DELEG_OBJ.search(seg)
    if m:
        what = cut_words(seg[m.end():])
        if len(what) >= 4:
            label_ = "قانون تنظيمي" if "تنظيمي" in m.group(1) else "قانون"
            return label_, what, "object"
    m = DELEG_SUBJ.search(seg)
    if m:
        before = seg[:m.start()]
        # أقوى المؤشرات: «وفق/حسب/طبقا…» تبدأ منها عبارة الموضوع كاملة
        start = max(before.rfind(mk) for mk in STRONG_MARKERS)
        if start < 0:
            # وإلا فمن آخر فاصلة أو بداية الجملة، مع حذف «التي/الذي» الزائدة
            start = max(before.rfind("،"), before.rfind(","), -1) + 1
            if start == 0 and before.rfind("،") < 0:
                start = 0
        clause = seg[start:m.end()].strip()
        clause = re.sub(r"^(?:التي|الذي)\s+", "", clause)
        what = cut_words(clause)
        if len(what) >= 4:
            label_ = "قانون تنظيمي" if "تنظيمي" in m.group(1) else "قانون"
            return label_, what, "subject"
    return None
SELF_SCOPE = re.compile(r"من\s+(?:هذا|هذه)\s+(?:الدستور|المدونة|القانون)")
OTHER_LAW_WORDS = re.compile(r"قانون|ظهير|دستور|مدونة|اتفاقي|نظام|مرسوم|مدونة")
CROSS_TO_CONST = re.compile(r"من\s+الدستور")


def expand(group):
    """يحوّل «94 إلى 97» إلى [94..97] و«96 و97» إلى [96, 97]."""
    tokens = re.findall(r"\d+|إلى|حتى|-|و|،|,", group)
    out, pending_range = [], False
    for tok in tokens:
        if tok.isdigit():
            n = int(tok)
            if pending_range and out and n > out[-1] and n - out[-1] <= 12:
                out.extend(range(out[-1] + 1, n + 1))
            else:
                out.append(n)
            pending_range = False
        elif tok in ("إلى", "حتى", "-"):
            pending_range = True
    seen, uniq = set(), []
    for n in out:
        if n not in seen:
            seen.add(n)
            uniq.append(n)
    return uniq


def segments(text):
    """جمل قصيرة قابلة للاقتباس: تُفصل بالأسطر والنقطة والفاصلة المنقوطة.

    كل جملة شريحة بالفهرس من النص الأصلي، فيبقى الاقتباس مطابقاً بالحرف،
    ويُتحقق منه في نهاية السكربت.
    """
    spans = []
    prev = 0
    for m in list(re.finditer(r"\n+|(?<=[.؛;])\s+", text)) + [None]:
        end = m.start() if m else len(text)
        chunk = text[prev:end]
        stripped = chunk.strip()
        if stripped:
            lead = len(chunk) - len(chunk.lstrip())
            trail = len(chunk) - len(chunk.rstrip())
            spans.append((prev + lead, end - trail, bool(HEADING.match(stripped))))
        prev = m.end() if m else len(text)
    out, buf = [], None  # buf = [start, end] لجملة قيد التجميع
    for s, e, heading in spans:
        if heading:
            if buf:
                out.append(tuple(buf))
            buf = None
            continue
        if buf is None:
            buf = [s, e]
        else:
            buf[1] = e
        if buf[1] - buf[0] >= 25:
            out.append(tuple(buf))
            buf = None
    if buf:
        if out:
            out[-1] = (out[-1][0], buf[1])  # ذيل قصير يُلحق بالجملة السابقة
        else:
            out.append(tuple(buf))
    return [text[a:b] for a, b in out if text[a:b]]


def article_no(a):
    """رقم المادة: ملفات المستودع تستعمل "number"، والتصديرات الأقدم "article"."""
    return int(a["number"] if "number" in a else a["article"])


def load(law):
    arts = json.load(open(law["file"], encoding="utf-8"))["articles"]
    return {article_no(a): a["text"] for a in arts}


def label(kind, n):
    return f"{laws[kind]['word']} {n}"


def topic_map(kind, arts):
    """لكل مادة: آخر عنوان كتاب/قسم/باب/فرع ظهر قبلها (يظهر في فلتر الموضوعات).

    العناوين تُقرأ من ملف ‎.ar.md‎ (سطر العنوان ثم سطر «الفصل N»/«المادة N»)، لأن نصوص
    المواد في articles.json فقرة واحدة بلا عناوين. إن غاب الملف نرجع إلى أسطر النص نفسه.
    """
    current = laws[kind]["text"]
    topics = {}
    md = laws[kind].get("markdown")
    if md and os.path.exists(md):
        marker = re.compile(r"^\s*" + laws[kind]["word"] + r"\s+(\d+)\s*$")
        for line in open(md, encoding="utf-8"):
            if HEADING.match(line):
                current = line.strip().rstrip(".:").strip()[:120]
                continue
            m = marker.match(line)
            if m and int(m.group(1)) in arts:
                topics[int(m.group(1))] = current
        fallback = laws[kind]["text"][:120]
        return {n: topics.get(n, fallback) for n in arts}
    for n in sorted(arts):
        topics[n] = current[:120]
        for line in arts[n].split("\n"):
            if HEADING.match(line):
                current = line.strip().rstrip(".:").strip()[:120]
    return topics


def main():
    curated = json.load(open(CURATED, encoding="utf-8"))["references"]
    used = {f"{r['fromArticle']}|{r['toArticle']}|{r['type']}" for r in curated}
    out = []
    stats = {"explicit": 0, "delegation": 0, "skipped_other_law": 0, "skipped_missing_target": 0}

    for kind, law in laws.items():
        arts = load(law)
        topics = topic_map(kind, arts)
        for n in sorted(arts):
            fromArticle = label(kind, n)
            counter = 0
            for seg in segments(arts[n]):
                # --- إحالات صريحة ---
                for m in REF.finditer(seg):
                    targets = [t for t in expand(m.group(2)) if t != n]
                    if not targets:
                        continue
                    if kind == "family" and CROSS_TO_CONST.search(seg):
                        to_kind = "constitution"
                    elif SELF_SCOPE.search(seg) or not OTHER_LAW_WORDS.search(seg):
                        to_kind = kind
                    else:
                        stats["skipped_other_law"] += 1
                        continue
                    # نتحقق من وجود الهدف في نص القانون المُحال إليه
                    valid = [t for t in targets if t in TARGETS[to_kind]]
                    if len(valid) != len(targets):
                        stats["skipped_missing_target"] += len(targets) - len(valid)
                    if not valid:
                        continue
                    to_text = laws[to_kind]["text"]
                    keys = [f"{fromArticle}|{label(to_kind, t)}|explicit" for t in valid]
                    free = [(t, k) for t, k in zip(valid, keys) if k not in used]
                    if not free:
                        continue
                    for _, k in free:
                        used.add(k)
                    names = [label(to_kind, t) for t, _ in free]
                    counter += 1
                    scope = "من الدستور" if to_kind == "constitution" and kind == "family" else ""
                    rel = (f"تُحيل هذه الجملة صراحةً على {' و'.join(names)}{(' ' + scope) if scope else ''}، "
                           "فيُقرأ الحكم في ضوء النص المسمّى بالرقم.")
                    source_url = laws[to_kind]["source_url"]
                    out.append({
                        "id": f"auto-{kind[:4]}-a{n:03d}-{counter:02d}",
                        "fromText": law["text"],
                        "fromArticle": fromArticle,
                        "toText": to_text,
                        "toArticle": names[0],
                        "also": names[1:] if len(names) > 1 else None,
                        "type": "explicit",
                        "topic": topics[n],
                        "relationship": rel,
                        "excerpt": seg,
                        "sourceUrl": law["source_url"],
                        "sourceLabel": law["text"],
                        "targetUrl": source_url,
                        "targetVerified": True,
                        "reviewedBy": REVIEWED_BY,
                        "reviewedOn": REVIEWED_ON,
                    })
                    stats["explicit"] += 1

                # --- تخويل تشريعي ---
                found = delegation_of(seg)
                if found:
                    to_label, what, pattern = found
                    k = f"{fromArticle}|{what}|delegation"
                    if k not in used:
                        used.add(k)
                        counter += 1
                        if pattern == "object":
                            rel = f"تُناط بـ«{to_label}» تفاصيل: {what}، ولم يسمِّ النص نصاً منفذاً بعينه."
                        else:
                            rel = f"يُحيل هذا النص على «{to_label}» في تحديد: {what}، ولم يسمِّ نصاً منفذاً بعينه."
                        out.append({
                            "id": f"auto-{kind[:4]}-a{n:03d}-{counter:02d}",
                            "fromText": law["text"],
                            "fromArticle": fromArticle,
                            "toText": to_label,
                            "toArticle": what,
                            "type": "delegation",
                            "topic": topics[n],
                            "relationship": rel,
                            "excerpt": seg,
                            "sourceUrl": law["source_url"],
                            "sourceLabel": law["text"],
                            "targetVerified": False,
                            "reviewedBy": REVIEWED_BY,
                            "reviewedOn": REVIEWED_ON,
                        })
                        stats["delegation"] += 1

    # خرج بلا حقول فارغة
    for item in out:
        if item.get("also") is None:
            item.pop("also", None)

    # تحقق نهائي: الاقتباس موجود حرفياً في نص المادة المصدر، وكل إحالة لها مصدر https
    texts = {kind: load(law) for kind, law in laws.items()}
    for item in out:
        kind = "constitution" if item["fromText"] == CONST_TEXT else "family"
        n = int(re.search(r"\d+", item["fromArticle"]).group())
        assert item["excerpt"] in texts[kind][n], item["id"]
        assert item["sourceUrl"].startswith("https://"), item["id"]
        assert len(item["excerpt"]) > 20 and len(item["relationship"]) > 20, item["id"]
    ids = [i["id"] for i in out]
    assert len(set(ids)) == len(ids), "ids"

    meta = {
        "title": "خريطة الإحالات القانونية — الإحالات المستخرجة آلياً من كامل النصين",
        "generatedAt": REVIEWED_ON,
        "corpus": f"الدستور المغربي (2011): {len(TARGETS['constitution'])} فصلاً، ومدونة الأسرة (القانون 70.03): {len(TARGETS['family'])} مادة",
        "method": "تُستخرج الإحالات من الجمل التي تسمّي فصلاً أو مادة برقمها، ومن جمل «يحدد القانون…». الاقتباس جملة حرفية من النص المصدر.",
        "limits": "المادة 383 من مدونة الأسرة غير واردة في النص المعتمد فلا تُستخرج منها إحالات. الإحالة التي لا تسمّي رقماً ولا نصاً منفِّذاً لا تُعرض، وإحالات القوانين الأخرى غير المعروفة في المستودع لا تُنسب إليها.",
        "reviewedBy": REVIEWED_BY,
        "reviewedOn": REVIEWED_ON,
        "stats": stats,
    }
    json.dump({"meta": meta, "references": out}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps({"written": len(out), "stats": stats}, ensure_ascii=False))


# أرقام المواد الموجودة فعلاً في كل نص (المادة 383 غير واردة في نص مدونة الأسرة)
TARGETS = {
    "constitution": set(article_no(a) for a in json.load(open(laws["constitution"]["file"], encoding="utf-8"))["articles"]),
    "family": set(article_no(a) for a in json.load(open(laws["family"]["file"], encoding="utf-8"))["articles"]),
}

if __name__ == "__main__":
    main()
