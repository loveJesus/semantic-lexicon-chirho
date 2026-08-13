// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ url }) => {
  const langParamChirho = url.searchParams.get("lang");
  const langChirho = langParamChirho === "spa" ? "spa" : "eng";
  return { langChirho };
};
