import type { NewsItem } from "./types.ts";

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

interface RSSSource {
  name: string;
  url: string;
  timeout: number;
  filterKeywords?: string[];
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i").exec(xml);
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
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
}

function stripHTML(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function parseRSSItems(xml: string): Partial<NewsItem>[] {
  const items: Partial<NewsItem>[] = [];
  const itemPattern = /<item>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemPattern.exec(xml)) !== null) {
    const content = match[1];
    const title = decodeHTMLEntities(extractTag(content, "title"));
    const link = extractTag(content, "link") || extractTag(content, "guid");
    const pubDate = extractTag(content, "pubDate");
    const rawDescription = extractTag(content, "description");
    const description = stripHTML(decodeHTMLEntities(rawDescription)).slice(0, 220);
    const source = extractTag(content, "source") || extractTag(content, "dc:creator") || "";

    if (!title || !link) continue;

    let isoDate = "";
    try {
      isoDate = pubDate ? new Date(pubDate).toISOString() : new Date().toISOString();
    } catch {
      isoDate = new Date().toISOString();
    }

    items.push({ title, link, pubDate, description, source, isoDate });
  }

  return items;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ReformaTributariaBot/1.0)",
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

function filterRelevant(items: Partial<NewsItem>[], keywords?: string[]): NewsItem[] {
  const kw = keywords?.map((k) => k.toLowerCase());
  return items.filter((item): item is NewsItem => {
    if (!item.title || !item.link) return false;
    if (!kw || kw.length === 0) return true;
    const combined = `${item.title} ${item.description || ""}`.toLowerCase();
    return kw.some((k) => combined.includes(k));
  });
}

function dedup(items: NewsItem[]): NewsItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

function sortByDate(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => {
    const da = new Date(a.isoDate).getTime();
    const db = new Date(b.isoDate).getTime();
    return db - da;
  });
}

export async function fetchRSSItems(
  sources: RSSSource[] = RSS_SOURCES,
  maxItems = 18
): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];

  for (const source of sources) {
    try {
      const xml = await fetchWithTimeout(source.url, source.timeout);
      if (!xml) continue;

      const raw = parseRSSItems(xml);
      const filtered = filterRelevant(raw, source.filterKeywords);
      allItems.push(...filtered);
    } catch {
      // skip failed sources
    }
  }

  return dedup(sortByDate(allItems)).slice(0, maxItems);
}