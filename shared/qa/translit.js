// shared/qa/translit.js
//
// جسر محدود للمصطلحات القانونية المكتوبة بالحروف اللاتينية (دارجة/Arabizi).
// ليس محوّلاً عاماً للحروف. يحوّل فقط كلمات قائمة معروفة، ويُضيفها كرموز عربية للمطابقة.
// النص الأصلي للسؤال لا يتغير، ولا يُعرض هذا الجسر للمستخدم.
//
// القائمة مُنتقاة يدوياً من الصيغ الشائعة للمصطلحات الموجودة في المعجم. أي كلمة غير واردة فيها
// تبقى كما هي، ولا تُخمَّن. الحد: لا تغطي كل الكتابات الممكنة للدارجة.

const LATIN_LEGAL_TERMS = {
  botlan: "البطلان",
  bottlan: "البطلان",
  nafaqa: "النفقه",
  nafaka: "النفقه",
  nafqa: "النفقه",
  mra: "المراه",
  lmra: "المراه",
  hadana: "الحضانه",
  hdana: "الحضانه",
  ttlaq: "الطلاق",
  ttalaq: "الطلاق",
  talaq: "الطلاق",
  zwaj: "الزواج",
  zouaj: "الزواج",
  zawaj: "الزواج",
  wassiya: "الوصيه",
  wasiya: "الوصيه",
  hokm: "الحكم",
  hkm: "الحكم",
  rahn: "الرهن",
  jnaya: "الجنايه",
  janaya: "الجنايه",
  jnha: "الجنحه",
  janha: "الجنحه",
  jonha: "الجنحه",
  mokhalafa: "المخالفه",
  fask: "الفسخ",
  faskh: "الفسخ",
  fasakh: "الفسخ",
  taqadoum: "التقادم",
  taqadom: "التقادم",
  tqadoum: "التقادم",
  wach: "هل",
  chno: "ما",
  shno: "ما",
  chnou: "ما",
}

/**
 * يحوّل الكلمات اللاتينية المعروفة إلى صيغها العربية. يُعيد سلسلة عربية فقط (قد تكون فارغة).
 * "l" الملتصقة بالكلمة (ال التعريف في الدارجة) تُفكّ تلقائياً.
 * @param {string} text  السؤال كما كتبه المستخدم
 * @returns {string}
 */
export function transliterateLegalLatin(text) {
  const out = []
  for (const raw of String(text || "").toLowerCase().split(/[^a-z0-9]+/)) {
    if (!raw) continue
    if (LATIN_LEGAL_TERMS[raw]) {
      out.push(LATIN_LEGAL_TERMS[raw])
    } else if (raw.length > 2 && raw.startsWith("l") && LATIN_LEGAL_TERMS[raw.slice(1)]) {
      out.push(LATIN_LEGAL_TERMS[raw.slice(1)])
    }
  }
  return out.join(" ")
}

export { LATIN_LEGAL_TERMS }
