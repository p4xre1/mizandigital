# تطبيق كل عمل الجلسة بأمر واحد

بدل نقل 84 ملفاً يدوياً، استعمل ملف الرقعة `mizan-session-changes.patch`.

## مُتحقَّق منه
- `git apply --check` على نسخة نظيفة من `origin/abdo` (00946b2): **نجح**
- بعد التطبيق: `tsc --noEmit` **بلا أخطاء**، و**353 اختباراً في 11 ملفاً** تنجح
- 84 ملفاً، 708 KB

## الطريقة

```bash
git clone https://github.com/p4xre1/mizandigital.git
cd mizandigital
git checkout abdo
git checkout -b feature/session-work

git apply --check ../mizan-session-changes.patch   # فحص جاف أولاً
git apply ../mizan-session-changes.patch           # التطبيق

pnpm install
pnpm typecheck
pnpm test
pnpm build

git add -A
git commit -m "Session work: payments, governance, reactions, security hardening"
git push -u origin feature/session-work
```

ثم افتح Pull Request من `feature/session-work` إلى `abdo`.

## إن فشل `git apply`

لأن المستودع **shallow clone**، لو كان فرع abdo قد تغيّر بعد 00946b2 قد تظهر
تعارضات. الحل:

```bash
git apply --3way ../mizan-session-changes.patch    # يحاول الدمج الثلاثي
# أو
git apply --reject ../mizan-session-changes.patch  # يطبّق ما يمكنه ويترك .rej
```

## ملاحظة
الرقعة **لا** تشمل تطبيق SQL على Supabase. انظر `DEPLOY-SUPABASE.md`
واستعمل `deploy/paste-1.sql` ثم `deploy/paste-2.sql`.