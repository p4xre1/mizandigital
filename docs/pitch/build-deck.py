"""Génère docs/pitch/MIZAN-PITCH-FR.pptx (deck investisseur, 13 slides)."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pathlib import Path

NAVY = RGBColor(0x0B, 0x12, 0x20)
GOLD = RGBColor(0xC9, 0xA2, 0x27)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
GREY = RGBColor(0xB8, 0xC0, 0xCC)
DARK = RGBColor(0x1A, 0x1F, 0x2B)

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
BLANK = prs.slide_layouts[6]


def bg(slide, color=NAVY):
    f = slide.background.fill
    f.solid()
    f.fore_color.rgb = color


def text(slide, x, y, w, h, s, size=18, bold=False, color=WHITE, align=PP_ALIGN.LEFT):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    lines = s if isinstance(s, list) else [s]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        r = p.add_run()
        r.text = line
        r.font.size = Pt(size)
        r.font.bold = bold
        r.font.color.rgb = color
        p.space_after = Pt(6)
    return tb


def header(slide, title, num):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.12))
    bar.fill.solid(); bar.fill.fore_color.rgb = GOLD; bar.line.fill.background()
    text(slide, 0.6, 0.35, 11, 0.9, title, 32, True, WHITE)
    text(slide, 12.0, 6.9, 1.0, 0.4, f"{num:02d}", 12, False, GREY, PP_ALIGN.RIGHT)
    text(slide, 0.6, 6.9, 4, 0.4, "Mizan Digital · mizan.page · confidentiel", 11, False, GREY)


def bullets(slide, items, x=0.7, y=1.5, w=12, size=20):
    text(slide, x, y, w, 5, [f"•  {i}" for i in items], size)


def card(slide, x, y, w, h, title, body, tsize=16, bsize=13):
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb = DARK; sh.line.color.rgb = GOLD
    text(slide, x + 0.2, y + 0.15, w - 0.4, 0.5, title, tsize, True, GOLD)
    text(slide, x + 0.2, y + 0.65, w - 0.4, h - 0.8, body, bsize, False, WHITE)


def table(slide, rows, x, y, w, col_w=None, size=13):
    nrows, ncols = len(rows), len(rows[0])
    t = slide.shapes.add_table(nrows, ncols, Inches(x), Inches(y), Inches(w), Inches(0.4 * nrows)).table
    if col_w:
        for i, cw in enumerate(col_w):
            t.columns[i].width = Inches(cw)
    for r, row in enumerate(rows):
        for c, val in enumerate(row):
            cell = t.cell(r, c)
            cell.text = str(val)
            cell.fill.solid()
            cell.fill.fore_color.rgb = GOLD if r == 0 else DARK
            for p in cell.text_frame.paragraphs:
                for run in p.runs:
                    run.font.size = Pt(size)
                    run.font.bold = r == 0
                    run.font.color.rgb = NAVY if r == 0 else WHITE


# 1 — Couverture
s = prs.slides.add_slide(BLANK); bg(s)
text(s, 0.8, 2.0, 11.5, 1.2, "ميزان  ·  Mizan Digital", 54, True, GOLD)
text(s, 0.8, 3.2, 11.5, 1.0, "La plateforme bilingue qui aide les étudiants en droit marocains\nà réviser, réussir leurs examens et lancer leur carrière.", 24)
text(s, 0.8, 5.0, 11.5, 0.6, "LegalTech / EdTech  ·  Pré-amorçage  ·  www.mizan.page", 16, False, GREY)
text(s, 0.8, 5.5, 11.5, 0.6, "Octobre 2026", 14, False, GREY)

# 2 — Problème
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Le problème", 2)
bullets(s, [
    "~120 000 étudiants en droit au Maroc, 21 facultés publiques — et un taux d'échec en S1–S2 souvent supérieur à 50 %.",
    "Contenu de révision éparpillé : PDF WhatsApp, polycopiés non datés, résumés de qualité inégale.",
    "Un droit bilingue (cours en arabe, textes et jurisprudence en français) sans outil qui fasse le pont.",
    "Aucun parcours complet : cours → examens → concours (magistrature, DGSN, notariat, avocat) → emploi.",
    "Réformes en cours (Moudawana, procédure pénale) : les étudiants révisent sur des versions obsolètes.",
])

# 3 — Solution
s = prs.slides.add_slide(BLANK); bg(s); header(s, "La solution : Mizan", 3)
card(s, 0.6, 1.5, 3.9, 2.3, "Réviser", "Résumés S1→S6, archive de lois et Bulletin officiel, articles pédagogiques.")
card(s, 4.7, 1.5, 3.9, 2.3, "Comprendre", "Lexique juridique arabe/français : 250 termes avec définition, exemples et sources.")
card(s, 8.8, 1.5, 3.9, 2.3, "S'entraîner", "QCM à 4 parcours (université, culture, concours chronométrés, entretiens) + XP, rangs, badges.")
card(s, 0.6, 4.0, 3.9, 2.3, "S'orienter", "Annuaire des 21 facultés et 14 fiches carrières détaillées (concours, salaires, étapes).")
card(s, 4.7, 4.0, 8.0, 2.3, "Pratiquer — outils Pro (abonnement)", "Comparateur de versions de textes · carte des renvois juridiques · cas pratiques corrigés · calculateur de délais · alertes d'amendements · espace de recherche privé.")

# 4 — Produit
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Le produit est déjà construit et en production", 4)
bullets(s, [
    "Site en ligne, ~35 pages publiques, pré-rendu statique, PWA, mode sombre/clair.",
    "224 QCM éditorialisés · 250 termes de lexique · 21 facultés · 14 carrières · archive de lois synchronisée.",
    "Comptes utilisateurs, profils publics partageables (mizan.page/u/…), back-office CMS complet.",
    "Paiement Stripe intégré, page tarifs, 6 outils Pro avec gating abonnement.",
    "Couche IA/SEO : schema.org, llms.txt, endpoint MCP → Mizan comme source citée par les moteurs et assistants IA.",
    "Infra Cloudflare + Supabase : coût marginal par utilisateur ≈ 0, marge brute > 85 %.",
])

# 5 — Traction
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Traction et objectifs", 5)
card(s, 0.6, 1.5, 3.9, 2.0, "Aujourd'hui", "~443 visites / mois\n100 % organique, 0 MAD de marketing\navant la 1re saison d'examens")
card(s, 4.7, 1.5, 3.9, 2.0, "6 mois", "5 000 visites / mois\n1 000 comptes\n100 abonnés Pro")
card(s, 8.8, 1.5, 3.9, 2.0, "12 mois", "25 000 visites / mois\n6 000 comptes\n600 abonnés Pro")
bullets(s, [
    "Levier principal : SEO arabe long-tail déjà en place ; pics de recherche en déc.–janv. et mai–juin.",
    "Nouvelle cohorte d'étudiants chaque année = marché récurrent.",
], y=4.0, size=18)

# 6 — Marché
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Marché", 6)
table(s, [
    ["", "Taille", "Hypothèse"],
    ["TAM", "~120 000 étudiants en droit + ~40 000 candidats concours / an + praticiens", "Maroc"],
    ["SAM", "~60 000 étudiants actifs en révision numérique", "Arabophones / francophones"],
    ["SOM (3 ans)", "6 000 abonnés × 200 MAD/an ≈ 1,2 M MAD ARR", "10 % du SAM"],
], 0.6, 1.6, 12.1, [2.0, 7.1, 3.0], 15)
bullets(s, [
    "Extension naturelle : Algérie, Tunisie, Mauritanie (droit civiliste bilingue).",
    "Segments B2B : facultés, centres de préparation aux concours, cabinets qui recrutent.",
], y=4.2)

# 7 — Modèle économique
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Modèle économique : freemium + Pro", 7)
table(s, [
    ["Plan", "Prix cible", "Cible"],
    ["Mensuel", "39 MAD", "Essai / période d'examens"],
    ["Semestriel", "129 MAD", "Plan principal, aligné sur S1/S2"],
    ["Annuel", "229 MAD", "Étudiants réguliers, candidats concours"],
], 0.6, 1.6, 7.0, [2.0, 2.0, 3.0], 15)
card(s, 8.0, 1.6, 4.7, 3.6, "Revenus complémentaires", "• Packs concours (DGSN, magistrature)\n• Licences B2B facultés / centres\n• Partenariats éditeurs juridiques\n• Offres cabinets recruteurs")
bullets(s, ["Contenu de révision gratuit = moteur d'acquisition ; outils Pro = conversion.",
            "Paiement : Stripe + CMI / paiement local + activation manuelle (virement, Wafacash)."], y=4.6, size=17)

# 8 — Go-to-market
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Go-to-market", 8)
bullets(s, [
    "SEO arabe long-tail : un article / QCM par module avant chaque session d'examens.",
    "Communautés : groupes WhatsApp / Facebook / Telegram par faculté, ambassadeurs étudiants (Pro offert).",
    "Viralité produit : partage des scores QCM et du profil public sur WhatsApp, Instagram, TikTok.",
    "Partenariats : bureaux des étudiants, enseignants, centres de préparation, cliniques juridiques.",
    "Calendrier : campagnes concentrées sur déc.–janv. et mai–juin.",
])

# 9 — Concurrence
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Concurrence", 9)
table(s, [
    ["Acteur", "Limite"],
    ["Groupes WhatsApp / Facebook, PDF partagés", "Non structurés, non vérifiés, non datés"],
    ["Sites de cours généralistes", "Pas d'outils, pas de QCM, peu de contenu marocain à jour"],
    ["Portails officiels (SGG, Adala)", "Référence mais non pédagogiques, pas d'entraînement"],
    ["Doctrine / Lexis / Dalloz", "Prix prohibitif, droit français, pour praticiens"],
], 0.6, 1.6, 12.1, [5.0, 7.1], 15)
text(s, 0.7, 4.5, 12, 1.5, "Avantage Mizan : seul acteur combinant contenu marocain bilingue vérifié + entraînement gamifié + outils Pro, sur une base technique déjà prête à l'échelle.", 20, True, GOLD)

# 10 — Pourquoi maintenant
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Pourquoi maintenant", 10)
bullets(s, [
    "Réformes législatives majeures (Moudawana, procédure pénale, code du travail) → besoin de textes à jour et de comparateurs.",
    "Digitalisation de l'enseignement supérieur et pénétration mobile > 90 % chez les étudiants.",
    "Moteurs de recherche et assistants IA cherchent des sources arabes structurées : la place de référence se prend maintenant.",
])

# 11 — Équipe
s = prs.slides.add_slide(BLANK); bg(s); header(s, "Équipe", 11)
card(s, 0.6, 1.6, 6.0, 3.2, "Fondateur", "Conception et développement complet de la plateforme : frontend, back-office, paiement, SEO/AEO, production éditoriale.\n\nExécution prouvée : produit complet livré seul.")
card(s, 6.9, 1.6, 5.8, 3.2, "Recrutements prioritaires", "• Responsable contenu juridique (doctorant / avocat)\n• Community manager étudiant\n• Comité de relecture d'enseignants")

# 12 — La levée
s = prs.slides.add_slide(BLANK); bg(s); header(s, "La levée : 600 000 MAD en pré-amorçage", 12)
table(s, [
    ["Poste", "Part", "Détail"],
    ["Contenu & pédagogie", "40 %", "Rédacteurs juridiques, relecture, 2 000 QCM, résumés S1–S6, packs concours"],
    ["Croissance", "30 %", "Ambassadeurs campus, vidéo courte, campagnes d'examens, partenariats"],
    ["Produit & tech", "20 %", "Paiement local, app mobile, assistant IA de révision, Pro v2"],
    ["Juridique & opérations", "10 %", "SARL, CGV, comptabilité, infra"],
], 0.6, 1.5, 12.1, [3.0, 1.2, 7.9], 14)
text(s, 0.7, 4.3, 12, 2, [
    "Instrument : BSA-AIR / SAFE ou equity ~10–15 %  ·  Runway : 18 mois",
    "Jalons à 18 mois : 25 000 visites/mois · 6 000 comptes · 600 Pro payants · ≈ 120 000 MAD ARR · 2 partenariats B2B",
    "→ conditions réunies pour une levée seed de 3–5 M MAD.",
], 17, False, WHITE)

# 13 — Clôture
s = prs.slides.add_slide(BLANK); bg(s)
text(s, 0.8, 1.6, 11.5, 1.0, "Devenir la référence numérique du droit marocain —\npour les étudiants d'abord, puis pour les praticiens.", 30, True, GOLD)
bullets(s, [
    "Marché mal servi, récurrent (nouvelle cohorte chaque année), extensible au Maghreb.",
    "Produit déjà construit : le capital va à la croissance, pas au développement initial.",
    "Coûts quasi nuls, marge logicielle > 85 %.",
], y=3.4, size=20)
text(s, 0.8, 5.8, 11.5, 0.8, "contact@mizan.page  ·  www.mizan.page", 18, False, GREY)

out = Path(__file__).with_name("MIZAN-PITCH-FR.pptx")
prs.save(out)
print("saved", out)
