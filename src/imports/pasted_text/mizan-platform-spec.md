@import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Serif+Arabic:wght@400;600;800;900&family=Playfair+Display:ital,wght@0,500;0,700;0,900;1,400&family=Inter:wght@300;400;500;600;700&display=swap');

@layer base {
  :root {
    /* Institutional Ivy League Light Palette */
    --background: 40 20% 98%;           /* Parchment Ivory #FAF9F6 */
    --foreground: 220 40% 12%;          /* Deep Institutional Navy Black #101623 */
    --card: 0 0% 100%;                  /* Pure Academic White #FFFFFF */
    --card-foreground: 220 40% 12%;
    --primary: 218 68% 18%;             /* Institutional Navy Blue #0F2C59 */
    --primary-foreground: 43 74% 94%;  /* Gold Parchment Tint */
    --accent-gold: 43 74% 49%;          /* Academic Gold #D4AF37 */
    --accent-gold-muted: 43 40% 88%;    /* Muted Gold Overlay */
    --secondary: 220 14% 93%;           /* Muted Stone Gray */
    --secondary-foreground: 220 40% 12%;
    --muted: 220 14% 96%;
    --muted-foreground: 215 16% 45%;
    --border: 214 25% 88%;
    --ring: 218 68% 18%;

    /* Typography Variables */
    --font-serif-ar: 'Noto Serif Arabic', 'Amiri', serif;
    --font-serif-en: 'Playfair Display', 'Georgia', serif;
    --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  }

  .dark {
    /* Institutional Ivy League Dark Palette */
    --background: 224 71% 4%;           /* Midnight Velvet Black #030712 */
    --foreground: 210 20% 98%;          /* Soft Ivory White */
    --card: 222 47% 7%;                 /* Deep Chamber Blue-Black #0A0F1D */
    --card-foreground: 210 20% 98%;
    --primary: 214 95% 36%;             /* Royal Institutional Blue #0550E6 */
    --primary-foreground: 0 0% 100%;
    --accent-gold: 43 74% 55%;          /* Amber Academic Gold */
    --accent-gold-muted: 43 30% 18%;
    --secondary: 217 33% 15%;
    --secondary-foreground: 210 20% 98%;
    --muted: 217 33% 12%;
    --muted-foreground: 215 20% 65%;
    --border: 217 33% 18%;
    --ring: 43 74% 55%;
  }
}

body {
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: var(--font-sans);
  overflow-x: hidden;
}