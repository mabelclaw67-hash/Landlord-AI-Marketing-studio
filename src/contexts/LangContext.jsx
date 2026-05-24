import { createContext, useContext } from "react";

export const LangContext = createContext("en");

/** Returns current lang ("en" | "zh"). Works in any component inside the app tree. */
export function useLang() {
  return useContext(LangContext) || "en";
}
