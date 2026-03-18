/**
 * Internationalization (i18n) Sail Installer
 *
 * Adds multi-language support with i18next, react-i18next,
 * and automatic browser language detection.
 *
 * Usage:
 *   npx tsx sails/i18n/install.ts
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { confirm, checkbox } from "@inquirer/prompts";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SAIL_DIR = dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = resolve(SAIL_DIR, "../..");
const FRONTEND_ROOT = join(PROJECT_ROOT, "packages/frontend");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SailManifest {
  name: string;
  displayName: string;
  version: string;
  requiredEnvVars: { key: string; description: string }[];
  dependencies: { backend: Record<string, string>; frontend: Record<string, string> };
}

function loadManifest(): SailManifest {
  return JSON.parse(readFileSync(join(SAIL_DIR, "addon.json"), "utf-8"));
}

function copyFile(src: string, dest: string, label: string): void {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`  Copied -> ${label}`);
}

function installDeps(deps: Record<string, string>, workspace: string): void {
  const entries = Object.entries(deps);
  if (entries.length === 0) return;
  const packages = entries.map(([n, v]) => `${n}@${v}`).join(" ");
  const cmd = `npm install ${packages} --workspace=${workspace}`;
  console.log(`  Running: ${cmd}`);
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: "inherit" });
}

// ---------------------------------------------------------------------------
// Language definitions
// ---------------------------------------------------------------------------

interface LanguageDef {
  code: string;
  label: string;
  nativeLabel: string;
  hasBuiltinLocale: boolean;
}

const AVAILABLE_LANGUAGES: LanguageDef[] = [
  { code: "en", label: "English", nativeLabel: "English", hasBuiltinLocale: true },
  { code: "de", label: "German", nativeLabel: "Deutsch", hasBuiltinLocale: true },
  { code: "fr", label: "French", nativeLabel: "Francais", hasBuiltinLocale: false },
  { code: "es", label: "Spanish", nativeLabel: "Espanol", hasBuiltinLocale: false },
];

// Stub translations for French
const FR_COMMON = {
  nav: { home: "Accueil", profile: "Profil", settings: "Parametres", login: "Se connecter", signup: "S'inscrire", logout: "Se deconnecter" },
  auth: { loginTitle: "Bon retour", signupTitle: "Creer un compte", email: "E-mail", password: "Mot de passe", confirmPassword: "Confirmer le mot de passe", name: "Nom", forgotPassword: "Mot de passe oublie?", noAccount: "Pas encore de compte?", hasAccount: "Deja un compte?", resetPassword: "Reinitialiser le mot de passe", loginButton: "Se connecter", signupButton: "S'inscrire", resetButton: "Envoyer le lien" },
  profile: { title: "Profil", editProfile: "Modifier le profil", name: "Nom", email: "E-mail", memberSince: "Membre depuis" },
  common: { save: "Enregistrer", cancel: "Annuler", delete: "Supprimer", loading: "Chargement...", error: "Une erreur est survenue", success: "Succes", confirm: "Confirmer", back: "Retour", search: "Rechercher", noResults: "Aucun resultat" },
};

// Stub translations for Spanish
const ES_COMMON = {
  nav: { home: "Inicio", profile: "Perfil", settings: "Configuracion", login: "Iniciar sesion", signup: "Registrarse", logout: "Cerrar sesion" },
  auth: { loginTitle: "Bienvenido de nuevo", signupTitle: "Crear cuenta", email: "Correo electronico", password: "Contrasena", confirmPassword: "Confirmar contrasena", name: "Nombre", forgotPassword: "Olvidaste tu contrasena?", noAccount: "No tienes cuenta?", hasAccount: "Ya tienes cuenta?", resetPassword: "Restablecer contrasena", loginButton: "Iniciar sesion", signupButton: "Registrarse", resetButton: "Enviar enlace" },
  profile: { title: "Perfil", editProfile: "Editar perfil", name: "Nombre", email: "Correo electronico", memberSince: "Miembro desde" },
  common: { save: "Guardar", cancel: "Cancelar", delete: "Eliminar", loading: "Cargando...", error: "Algo salio mal", success: "Exito", confirm: "Confirmar", back: "Volver", search: "Buscar", noResults: "Sin resultados" },
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const manifest = loadManifest();

  // -- Step 1: Welcome --------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  Internationalization Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail adds multi-language support to your project:");
  console.log("    - i18next for translation management");
  console.log("    - react-i18next for React integration");
  console.log("    - Automatic browser language detection");
  console.log("    - Language switcher component");
  console.log("    - Translation files for selected languages");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: Select languages -----------------------------------------------
  const selectedCodes = await checkbox({
    message: "Which languages would you like to include?",
    choices: AVAILABLE_LANGUAGES.map((lang) => ({
      name: `${lang.label} (${lang.nativeLabel})`,
      value: lang.code,
      checked: lang.code === "en" || lang.code === "de",
    })),
    validate: (values) => {
      if (!values.includes("en")) {
        return "English must be selected as the fallback language.";
      }
      if (values.length < 2) {
        return "Please select at least two languages.";
      }
      return true;
    },
  });

  const selectedLanguages = AVAILABLE_LANGUAGES.filter((l) =>
    selectedCodes.includes(l.code),
  );

  console.log();
  console.log(
    `  Selected languages: ${selectedLanguages.map((l) => l.label).join(", ")}`,
  );
  console.log();

  // -- Step 3: Summary --------------------------------------------------------
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to create:");
  console.log("    + packages/frontend/src/lib/i18n.ts");
  console.log("    + packages/frontend/src/hooks/useLanguage.ts");
  console.log("    + packages/frontend/src/components/LanguageSwitcher.tsx");
  for (const lang of selectedLanguages) {
    console.log(`    + packages/frontend/src/locales/${lang.code}/common.json`);
  }
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/frontend/src/main.tsx (import i18n)");
  console.log("    ~ packages/frontend/src/components/layout/Header.tsx (add LanguageSwitcher)");
  console.log();
  console.log("  Dependencies to install:");
  console.log("    i18next, react-i18next, i18next-browser-languagedetector");
  console.log();

  // -- Step 4: Confirm --------------------------------------------------------
  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) {
    console.log("\n  Installation cancelled.\n");
    process.exit(0);
  }

  console.log();
  console.log("  Installing...");
  console.log();

  // -- Step 5: Copy locale files ----------------------------------------------
  console.log("  Copying translation files...");

  // English and German have built-in files
  for (const lang of selectedLanguages) {
    const localeDestDir = join(FRONTEND_ROOT, `src/locales/${lang.code}`);
    mkdirSync(localeDestDir, { recursive: true });

    if (lang.hasBuiltinLocale) {
      copyFile(
        join(SAIL_DIR, `files/frontend/locales/${lang.code}/common.json`),
        join(localeDestDir, "common.json"),
        `src/locales/${lang.code}/common.json`,
      );
    } else {
      // Generate locale file from inline data
      let data: Record<string, unknown>;
      switch (lang.code) {
        case "fr":
          data = FR_COMMON;
          break;
        case "es":
          data = ES_COMMON;
          break;
        default:
          data = {};
      }
      const destPath = join(localeDestDir, "common.json");
      writeFileSync(destPath, JSON.stringify(data, null, 2) + "\n", "utf-8");
      console.log(`  Created -> src/locales/${lang.code}/common.json`);
    }
  }

  console.log();
  console.log("  Copying source files...");

  // Copy core files
  copyFile(
    join(SAIL_DIR, "files/frontend/hooks/useLanguage.ts"),
    join(FRONTEND_ROOT, "src/hooks/useLanguage.ts"),
    "src/hooks/useLanguage.ts",
  );
  copyFile(
    join(SAIL_DIR, "files/frontend/components/LanguageSwitcher.tsx"),
    join(FRONTEND_ROOT, "src/components/LanguageSwitcher.tsx"),
    "src/components/LanguageSwitcher.tsx",
  );

  // -- Step 6: Generate i18n.ts with selected languages -----------------------
  console.log();
  console.log("  Generating i18n configuration...");

  const importLines = selectedLanguages
    .map((l) => `import ${l.code}Common from "@/locales/${l.code}/common.json";`)
    .join("\n");

  const resourceLines = selectedLanguages
    .map((l) => `  ${l.code}: { common: ${l.code}Common },`)
    .join("\n");

  const i18nContent = `import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import locale files
${importLines}

const resources = {
${resourceLines}
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    defaultNS: "common",
    ns: ["common"],
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  });

export default i18n;
`;

  const i18nDest = join(FRONTEND_ROOT, "src/lib/i18n.ts");
  mkdirSync(dirname(i18nDest), { recursive: true });
  writeFileSync(i18nDest, i18nContent, "utf-8");
  console.log("  Created -> src/lib/i18n.ts");

  // Update useLanguage.ts with the selected languages
  const languageEntries = selectedLanguages
    .map((l) => `  { code: "${l.code}", label: "${l.nativeLabel}" },`)
    .join("\n");

  const useLanguageContent = `import { useTranslation } from "react-i18next";
import { useCallback } from "react";

export interface Language {
  code: string;
  label: string;
}

const availableLanguages: Language[] = [
${languageEntries}
];

export function useLanguage() {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.language?.split("-")[0] ?? "en";

  const changeLanguage = useCallback(
    async (code: string) => {
      await i18n.changeLanguage(code);
    },
    [i18n],
  );

  return {
    currentLanguage,
    changeLanguage,
    availableLanguages,
  };
}
`;

  writeFileSync(join(FRONTEND_ROOT, "src/hooks/useLanguage.ts"), useLanguageContent, "utf-8");
  console.log("  Updated -> src/hooks/useLanguage.ts");

  // -- Step 7: Modify main.tsx — import i18n ----------------------------------
  console.log();
  console.log("  Modifying frontend files...");

  const mainPath = join(FRONTEND_ROOT, "src/main.tsx");
  if (existsSync(mainPath)) {
    let mainContent = readFileSync(mainPath, "utf-8");

    if (!mainContent.includes("./lib/i18n")) {
      // Add i18n import at the top (after existing imports)
      mainContent = `import "./lib/i18n.js";\n${mainContent}`;
      writeFileSync(mainPath, mainContent, "utf-8");
      console.log("  Modified -> src/main.tsx (added i18n import)");
    } else {
      console.log("  Skipped (already present) -> src/main.tsx");
    }
  }

  // -- Step 8: Add LanguageSwitcher to Header ---------------------------------
  const headerPath = join(FRONTEND_ROOT, "src/components/layout/Header.tsx");
  if (existsSync(headerPath)) {
    let headerContent = readFileSync(headerPath, "utf-8");

    if (!headerContent.includes("LanguageSwitcher")) {
      // Add import
      headerContent = headerContent.replace(
        'import { useAuth } from "@/hooks/useAuth";',
        'import { useAuth } from "@/hooks/useAuth";\nimport LanguageSwitcher from "@/components/LanguageSwitcher";',
      );

      // Add LanguageSwitcher in the desktop nav, before the user section
      headerContent = headerContent.replace(
        "{/* Desktop Nav */}\n        <nav className=\"hidden items-center gap-6 md:flex\">",
        "{/* Desktop Nav */}\n        <nav className=\"hidden items-center gap-6 md:flex\">\n          <LanguageSwitcher />",
      );

      writeFileSync(headerPath, headerContent, "utf-8");
      console.log("  Modified -> src/components/layout/Header.tsx (added LanguageSwitcher)");
    } else {
      console.log("  Skipped (already present) -> Header.tsx");
    }
  }

  // -- Step 9: Install dependencies -------------------------------------------
  console.log();
  console.log("  Installing dependencies...");
  installDeps(manifest.dependencies.frontend, "packages/frontend");

  // -- Step 10: Next steps ----------------------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  Internationalization installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  2. Use the language switcher in the header to change languages");
  console.log();
  console.log("  3. Use translations in your components:");
  console.log();
  console.log('       import { useTranslation } from "react-i18next";');
  console.log();
  console.log("       function MyComponent() {");
  console.log('         const { t } = useTranslation();');
  console.log('         return <h1>{t("nav.home")}</h1>;');
  console.log("       }");
  console.log();
  console.log("  4. To add a new language:");
  console.log("     a. Create src/locales/<code>/common.json");
  console.log("     b. Import it in src/lib/i18n.ts and add to resources");
  console.log("     c. Add the language to availableLanguages in src/hooks/useLanguage.ts");
  console.log();
  console.log("  5. To add new translation keys:");
  console.log("     a. Add the key to ALL locale files (en, de, etc.)");
  console.log('     b. Use t("section.key") in your components');
  console.log();
  console.log("  6. For namespaced translations (e.g., per-page):");
  console.log("     a. Create a new JSON file: src/locales/en/dashboard.json");
  console.log("     b. Import and add it in i18n.ts resources");
  console.log('     c. Use: const { t } = useTranslation("dashboard");');
  console.log();
}

main().catch((err) => {
  console.error("Installation failed:", err);
  process.exit(1);
});
