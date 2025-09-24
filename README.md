
## Kansiot ja tärkeimmät tiedostot

```
public/
  images/
    oamk.png            # julkinen logo (viitataan src="/images/oamk.png")
src/
  components/
    Navbar.jsx          # responsiivinen yläpalkki (desktop-menu + mobiilipaneeli)
  layouts/
    AppLayout.jsx       # sovelluksen runko (header, main, footer)
  pages/
    Home.jsx            # etusivun sisältö
  styles/
    tailwind.css        # @tailwind base; @tailwind components; @tailwind utilities
  i18n.js               # i18next-konfiguraatio ja kieliresurssit
  main.jsx              # käynnistää sovelluksen, import './i18n'
index.html
tailwind.config.js
postcss.config.js       # käyttää '@tailwindcss/postcss' (Tailwind v4)
vite.config.js
```

---

## Responsiivisuus (Tailwind)

Toteutus on mobile-first ja tehty Tailwind-luokilla.

- Desktop: vaakavalikko näkyy luokalla `hidden md:flex`
- Mobiili: hamburger-nappi näkyy luokalla `md:hidden`, joka avaa pudotusvalikon headerin alle

Tyypilliset luokat:
- elementtien näkyvyys: `hidden`, `md:flex`, `md:hidden`
- header: `sticky top-0`, tausta: `bg-gray-900` (tai läpikuultava `bg-gray-900/90`)
- mobiilin pudotusvalikon paneeli: `md:hidden fixed inset-x-0 top-16`
- taustan himmennys ja blur mobiilissa: erillinen overlay `fixed inset-0 bg-gray-900/40 backdrop-blur-md`

---

## Kielituki (i18n)

Kielituki on toteutettu `i18next` + `react-i18next` -kirjastoilla.

- Konfiguraatio ja kieliresurssit ovat tiedostossa `src/i18n.js`
- Sovellus alustaa i18n:n rivillä `import './i18n'` tiedostossa `src/main.jsx`
- Tekstit haetaan komponenteissa `useTranslation()`-hookilla: `t('avain')`
- Suomi ja englanti ovat `common`-nimisessä namespacessa

Lyhyt käyttöesimerkki:
```jsx
import { useTranslation } from 'react-i18next'
const { t } = useTranslation()
<h1>{t('title')}</h1>
```

---

## Staattiset kuvat ja ikonit

- Sovelluksen kuvat (esim. OAMK-logo) sijoitetaan `src/assets/images/`-kansioon ja otetaan käyttöön importilla:
  ```jsx
  import oamkLogo from '../assets/images/oamk.png'
  <img src={oamkLogo} alt="OAMK" />
- Emoji-logon (esim. 🎥) koko skaalataan tekstikoolla (`text-2xl`, `text-3xl`) ikonin sisällä.

---

## Kehitys ja ajaminen

```bash
npm install
npm run dev

backend: 
cd backend
npm install
npm run devStart

aja testit terminaalissa:
cd backend
npm install (tämä vain kerran)
NODE_ENV=test npm run devStart

erillisessä terminaali ikkunassa:
cd backend
npm test
```