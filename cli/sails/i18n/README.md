# Internationalization (i18n) Sail

Adds multi-language support to your keel application using i18next, react-i18next, and automatic browser language detection.

## Features

- i18next translation framework
- react-i18next for seamless React integration
- Automatic browser language detection (via `i18next-browser-languagedetector`)
- Language switcher dropdown component (dark Keel theme)
- Translation files for English, German, French, and Spanish
- Language preference persisted in localStorage

## Installation

```bash
npx tsx sails/i18n/install.ts
```

The installer will prompt you to select which languages to include and will configure everything automatically.

## Usage

### Using Translations in Components

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("nav.home")}</h1>
      <p>{t("common.loading")}</p>
      <button>{t("common.save")}</button>
    </div>
  );
}
```

### Using the Language Hook

```tsx
import { useLanguage } from "@/hooks/useLanguage";

function SettingsPage() {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();

  return (
    <select
      value={currentLanguage}
      onChange={(e) => changeLanguage(e.target.value)}
    >
      {availableLanguages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
```

### Translation Keys with Interpolation

```json
{
  "greeting": "Hello, {{name}}!"
}
```

```tsx
t("greeting", { name: user.name })
```

### Pluralization

```json
{
  "items_one": "{{count}} item",
  "items_other": "{{count}} items"
}
```

```tsx
t("items", { count: 5 })  // "5 items"
t("items", { count: 1 })  // "1 item"
```

## Adding a New Language

1. Create the locale file:

```bash
mkdir -p packages/frontend/src/locales/ja
```

2. Create `packages/frontend/src/locales/ja/common.json` with all translation keys (copy from `en/common.json` as a template).

3. Update `packages/frontend/src/lib/i18n.ts`:

```ts
import jaCommon from "@/locales/ja/common.json";

const resources = {
  en: { common: enCommon },
  de: { common: deCommon },
  ja: { common: jaCommon },  // Add this
};
```

4. Update `packages/frontend/src/hooks/useLanguage.ts`:

```ts
const availableLanguages: Language[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "ja", label: "Japanese" },  // Add this
];
```

## Adding New Translation Namespaces

For larger applications, split translations into namespaces (e.g., per page):

1. Create `packages/frontend/src/locales/en/dashboard.json`
2. Import in `i18n.ts` and add to resources:

```ts
import enDashboard from "@/locales/en/dashboard.json";

const resources = {
  en: { common: enCommon, dashboard: enDashboard },
  // ...
};
```

3. Update the `ns` array in `i18n.init()`:

```ts
ns: ["common", "dashboard"],
```

4. Use in components:

```tsx
const { t } = useTranslation("dashboard");
return <h1>{t("title")}</h1>;
```

## Language Detection

The language detector checks in this order:

1. `localStorage` key `i18nextLng`
2. Browser navigator language
3. HTML `lang` attribute

The selected language is automatically persisted to `localStorage`.

## Architecture

| File | Purpose |
|------|---------|
| `src/lib/i18n.ts` | i18next initialization and configuration |
| `src/locales/<lang>/common.json` | Translation strings per language |
| `src/hooks/useLanguage.ts` | Hook for language switching |
| `src/components/LanguageSwitcher.tsx` | Dropdown UI component |

## Configuration

### Changing the Default Language

Edit `src/lib/i18n.ts`:

```ts
fallbackLng: "de",  // Change from "en" to desired default
```

### Disabling Language Detection

Remove the `LanguageDetector` plugin from `i18n.ts`:

```ts
i18n
  // .use(LanguageDetector)  // Remove this line
  .use(initReactI18next)
  .init({
    lng: "en",  // Set a fixed language
    // ...
  });
```
