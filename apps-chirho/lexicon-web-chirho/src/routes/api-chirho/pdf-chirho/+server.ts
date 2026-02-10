// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { RequestHandler } from "./$types";

const OBJECT_KEY_CHIRHO = "lexicon-chirho.pdf";

export const GET: RequestHandler = async ({ platform }) => {
  const bucketChirho = platform?.env?.ASSETS_R2_CHIRHO;
  if (!bucketChirho) {
    return new Response("Storage not configured", { status: 503 });
  }

  const objectChirho = await bucketChirho.get(OBJECT_KEY_CHIRHO);
  if (!objectChirho) {
    return new Response("PDF not found", { status: 404 });
  }

  return new Response(objectChirho.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${OBJECT_KEY_CHIRHO}"`,
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(objectChirho.size),
    },
  });
};
