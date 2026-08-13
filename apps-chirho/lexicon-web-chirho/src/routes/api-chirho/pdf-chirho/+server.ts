// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { RequestHandler } from "./$types";

const PDF_KEYS_CHIRHO: Record<string, string> = {
  eng: "lexicon-chirho.pdf",
  spa: "lexicon-chirho-spa.pdf",
};

export const GET: RequestHandler = async ({ platform, url }) => {
  const bucketChirho = platform?.env?.ASSETS_R2_CHIRHO;
  if (!bucketChirho) {
    return new Response("Storage not configured", { status: 503 });
  }

  const langParamChirho = url.searchParams.get("lang");
  const langChirho = langParamChirho === "spa" ? "spa" : "eng";
  const objectKeyChirho = PDF_KEYS_CHIRHO[langChirho];

  const objectChirho = await bucketChirho.get(objectKeyChirho);
  if (!objectChirho) {
    return new Response("PDF not found", { status: 404 });
  }

  return new Response(objectChirho.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${objectKeyChirho}"`,
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(objectChirho.size),
    },
  });
};
