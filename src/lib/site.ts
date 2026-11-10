/**
 * Where Quackle Scrapbook lives once published: on the studio site, under /scrapbook. The GitHub Pages
 * build sets NEXT_PUBLIC_SITE_URL to the real address, so links and QR codes always match it.
 */
export const PUBLIC_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://quacklebit.com/scrapbook")
  .replace(/\/$/, "")
  .replace(/^http:\/\//, "https://"); // GitHub reports http; the site is served over https
/** The same address without the protocol, for text on images and pages. */
export const PUBLIC_URL_LABEL = PUBLIC_URL.replace(/^https?:\/\//, "");

/**
 * The path the app is served under (e.g. "/scrapbook" on quacklebit.com). Empty in local dev.
 * Set NEXT_PUBLIC_BASE_PATH (and Next's basePath) when building for the studio site.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** The site URL for metadata and the sitemap: NEXT_PUBLIC_SITE_URL, else the public address in production. */
export const SITE_URL =
  process.env.NODE_ENV === "production" ? PUBLIC_URL : "http://localhost:3000";

/**
 * The base for page metadata (link previews). Next.js adds the base path itself, so this is the
 * origin only; using the full address doubled the path (…/quackle.scrapbook/quackle.scrapbook/…).
 */
export const METADATA_BASE = new URL(SITE_URL).origin;
