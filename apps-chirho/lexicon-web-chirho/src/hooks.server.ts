// For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

import type { Handle } from "@sveltejs/kit";

const customHostnameChirho = "lexicon-chirho.bible.systems";
const cacheablePrefixesChirho = [
  "/bible-chirho/",
  "/domain-chirho",
  "/lemma-chirho/",
  "/search-chirho",
  "/api-chirho/sense-chirho/",
] as const;

// Workflow: spec-chirho/workflows-chirho/lexicon-read-request-chirho.md
export function isCacheableLexiconResponseChirho(
  hostnameChirho: string,
  pathnameChirho: string,
  methodChirho: string,
  statusChirho: number,
): boolean {
  return (
    hostnameChirho === customHostnameChirho &&
    methodChirho === "GET" &&
    statusChirho === 200 &&
    cacheablePrefixesChirho.some((prefixChirho) => pathnameChirho.startsWith(prefixChirho))
  );
}

export const handle: Handle = async ({ event: eventChirho, resolve: resolveChirho }) => {
  const responseChirho = await resolveChirho(eventChirho);
  if (
    !isCacheableLexiconResponseChirho(
      eventChirho.url.hostname,
      eventChirho.url.pathname,
      eventChirho.request.method,
      responseChirho.status,
    )
  ) {
    return responseChirho;
  }

  const headersChirho = new Headers(responseChirho.headers);
  headersChirho.set(
    "Cache-Control",
    "public, max-age=300, s-maxage=86400",
  );
  return new Response(responseChirho.body, {
    status: responseChirho.status,
    statusText: responseChirho.statusText,
    headers: headersChirho,
  });
};

