import { useTranslation } from "react-i18next";
import { useCallback } from "react";

export interface Language {
  code: string;
  label: string;
}

const availableLanguages: Language[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
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
