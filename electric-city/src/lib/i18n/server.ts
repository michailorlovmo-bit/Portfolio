import { cookies } from "next/headers";
import { dictionaries, type Locale } from "./dictionary";
import { LOCALE_COOKIE } from "./constants";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "el" ? "el" : "en";
}

export async function getDictionary() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
