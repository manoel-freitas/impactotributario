import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { NewsItem, NewsData } from "./types.ts";

// ─── RSS Sources ──────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  {
    name: "Google News",
    url: "https://news.google.com/rss/search?q=%22reforma+tribut%C3%A1ria%22+CBS+IBS&hl=pt-BR&gl=BR&ceid=BR:pt-419",
    timeout: 8000,
  },
  {
    name: "Contábeis",
    url: "https://www.contabeis.com.br/noticias/rss/",
    timeout: 6000,
    filterKeywords: ["reforma", "tributária", "cbs", "ibs", "tribut"],
  },
];

// ─── XML Parser (no external deps) ───────────────────────────────────────────
function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`,
    "i"
  ).exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();

  const plainMatch = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i"
  ).exec(xml);
  return plainMatch ? plainMatch[1].trim() : "";
}

function decodeHTMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&rsquo;/g, "\u2019")
    .replace(/&lsquo;/g, "\u2018")
    .replace(/&rdquo;/g, "\u201D")
    .replace(/&ldquo;/g, "\u201C")
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function stripHTML(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractImageUrl(content: string): string | undefined {
  // Try enclosure with image type
  const enclosureMatch = /<enclosure[^>]+url="([^"]+)"[^>]*type="image\/[^"]*"[^>]*\/?>/i.exec(content)
    ?? /<enclosure[^>]+type="image\/[^"]*"[^>]+url="([^"]+)"[^>]*\/?>/i.exec(content);
  if (enclosureMatch?.[1]?.startsWith("http")) return enclosureMatch[1];

  // Try media:content url attribute
  const mediaContentMatch = /<media:content[^>]+url="([^"]+)"[^>]*\/?>/i.exec(content);
  if (mediaContentMatch?.[1]?.startsWith("http")) return mediaContentMatch[1];

  // Try media:thumbnail url attribute
  const mediaThumbnailMatch = /<media:thumbnail[^>]+url="([^"]+)"[^>]*\/?>/i.exec(content);
  if (mediaThumbnailMatch?.[1]?.startsWith("http")) return mediaThumbnailMatch[1];

  return undefined;
}

function parseRSSItems(xml: string): Partial<NewsItem>[] {
  const items: Partial<NewsItem>[] = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(xml)) !== null) {
    const content = match[1];
    const title = decodeHTMLEntities(extractTag(content, "title"));
    const link =
      extractTag(content, "link") ||
      extractTag(content, "guid");
    const pubDate = extractTag(content, "pubDate");
    const rawDescription = extractTag(content, "description");
    const description = stripHTML(decodeHTMLEntities(rawDescription)).slice(
      0,
      220
    );
    const source =
      extractTag(content, "source") || extractTag(content, "dc:creator") || "";

    if (!title || !link) continue;

    // Parse date
    let isoDate = "";
    try {
      isoDate = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    } catch {
      isoDate = new Date().toISOString();
    }

    const imageUrl = extractImageUrl(content);

    items.push({ title, link, pubDate, description, source, isoDate, ...(imageUrl ? { imageUrl } : {}) });
  }

  return items;
}

// ─── Fetch with timeout ───────────────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ReformaTributariaBot/1.0; +https://simuladortributario.com.br)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// ─── De-duplicate by link ──────────────────────────────────────────────────────
function dedup(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

// ─── Sort by date desc ────────────────────────────────────────────────────────
function sortByDate(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const da = new Date(a.isoDate).getTime();
    const db = new Date(b.isoDate).getTime();
    return db - da;
  });
}

// ─── Filter by relevance keywords ────────────────────────────────────────────
function filterRelevant(items: Partial<NewsItem>[], keywords?: string[]): NewsItem[] {
  const kw = keywords?.map((k) => k.toLowerCase());
  return items.filter((item): item is NewsItem => {
    if (!item.title || !item.link) return false;
    if (!kw || kw.length === 0) return true;
    const combined = `${item.title} ${item.description || ""}`.toLowerCase();
    return kw.some((k) => combined.includes(k));
  });
}

// ─── Main fetch function ──────────────────────────────────────────────────────
export async function fetchNews(): Promise<NewsData> {
  console.log("📰 Fetching reform news from RSS sources...");

  const allItems: NewsItem[] = [];

  for (const source of RSS_SOURCES) {
    try {
      console.log(`  ↳ Fetching ${source.name}...`);
      const xml = await fetchWithTimeout(source.url, source.timeout);

      if (!xml) {
        console.warn(`  ✗ Failed to fetch ${source.name}`);
        continue;
      }

      const raw = parseRSSItems(xml);
      const filtered = filterRelevant(raw, source.filterKeywords);

      console.log(`  ✓ Got ${filtered.length} items from ${source.name}`);
      allItems.push(...filtered);
    } catch (err) {
      console.warn(`  ✗ Error fetching ${source.name}:`, err);
    }
  }

  const unique = dedup(sortByDate(allItems)).slice(0, 18);

  return {
    fetchedAt: new Date().toISOString(),
    items: unique,
  };
}

// ─── Save to generated dir ────────────────────────────────────────────────────
export async function fetchAndSaveNews(outputDir: string): Promise<void> {
  const data = await fetchNews();
  mkdirSync(outputDir, { recursive: true });
  const outPath = join(outputDir, "news.json");
  writeFileSync(outPath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`✅ News saved → ${outPath} (${data.items.length} items)`);
}
