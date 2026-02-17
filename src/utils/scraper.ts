import axios, { AxiosError } from "axios";
import * as cheerio from "cheerio";
import { convert } from "html-to-text";
import { PlaywrightWebBaseLoader } from "@langchain/community/document_loaders/web/playwright";

/**
 * Interface para conteúdo extraído de uma URL
 */
export interface ScrapedContent {
  content: string;
  title: string | null;
  ogImage: string | null;
  url: string;
  scrapedAt: string;
}

/**
 * Interface base para scrapers
 */
export interface IScraper {
  scrape(url: string): Promise<ScrapedContent>;
}

/**
 * Tipo de scraper engine disponível
 */
export type ScraperEngine = "cheerio" | "playwright";

// ===== CONFIGURAÇÕES =====

/**
 * Configurações do Axios para scraping
 */
const SCRAPER_CONFIG = {
  timeout: 20000, // 20 segundos
  maxContentLength: 10 * 1024 * 1024, // 10MB
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  },
};

/**
 * Elementos HTML a serem removidos durante o scraping
 */
const UNWANTED_SELECTORS = [
  "script",
  "style",
  "nav",
  "footer",
  "header",
  "aside",
  ".ad",
  ".advertisement",
  ".sidebar",
  ".social-share",
  ".comments",
  ".related-posts",
  "#comments",
  "[role='complementary']",
  "[aria-label='advertisement']",
];

/**
 * Seletores para encontrar conteúdo principal (em ordem de prioridade)
 */
const CONTENT_SELECTORS = [
  "article",
  "main",
  '[role="main"]',
  ".content",
  ".post-content",
  ".article-content",
  ".entry-content",
  "#content",
  "body",
];

/**
 * Domínios conhecidos que requerem Playwright (JavaScript pesado)
 */
const PLAYWRIGHT_REQUIRED_DOMAINS = [
  "twitter.com",
  "x.com",
  "instagram.com",
  "linkedin.com",
  "facebook.com",
  "medium.com", // Algumas páginas do Medium
];

// ===== CHEERIO SCRAPER =====

/**
 * Scraper usando Cheerio (rápido, leve, sites estáticos)
 */
export class CheerioScraper implements IScraper {
  async scrape(url: string): Promise<ScrapedContent> {
    try {
      // 1. Fazer HTTP request
      const response = await axios.get(url, SCRAPER_CONFIG);

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status} ao acessar URL`);
      }

      // 2. Parser HTML com Cheerio
      const $ = cheerio.load(response.data);

      // 3. Extrair metadata
      const title = this.extractTitle($);
      const ogImage = this.extractOgImage($, url);

      // 4. Remover elementos indesejados
      UNWANTED_SELECTORS.forEach((selector) => {
        $(selector).remove();
      });

      // 5. Extrair conteúdo principal
      const mainContent = this.extractMainContent($);

      // 6. Converter HTML para texto limpo
      const cleanText = this.htmlToCleanText(mainContent);

      // 7. Validar conteúdo mínimo
      if (cleanText.length < 100) {
        throw new Error(
          `Conteúdo muito curto (${cleanText.length} caracteres). URL pode estar bloqueada ou não ter conteúdo suficiente.`
        );
      }

      return {
        content: cleanText,
        title,
        ogImage,
        url,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Tratamento específico de erros
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        if (axiosError.code === "ECONNABORTED") {
          throw new Error(
            `Timeout ao acessar URL (${SCRAPER_CONFIG.timeout}ms): ${url}`
          );
        }

        if (axiosError.response) {
          throw new Error(
            `Erro HTTP ${axiosError.response.status} ao acessar URL: ${url}`
          );
        }

        if (axiosError.request) {
          throw new Error(`Falha de rede ao acessar URL: ${url}`);
        }
      }

      // Propagar erro original com contexto
      throw new Error(
        `Erro ao fazer scraping da URL: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private extractTitle($: cheerio.CheerioAPI): string | null {
    // Tentar Open Graph title
    const ogTitle = $('meta[property="og:title"]').attr("content");
    if (ogTitle) return ogTitle.trim();

    // Tentar title tag
    const titleTag = $("title").text();
    if (titleTag) return titleTag.trim();

    // Tentar primeiro h1
    const h1 = $("h1").first().text();
    if (h1) return h1.trim();

    return null;
  }

  private extractOgImage($: cheerio.CheerioAPI, baseUrl: string): string | null {
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (!ogImage) return null;

    // Se for URL relativa, converter para absoluta
    try {
      return new URL(ogImage, baseUrl).href;
    } catch {
      return ogImage; // Retornar original se falhar ao resolver
    }
  }

  private extractMainContent($: cheerio.CheerioAPI): string {
    for (const selector of CONTENT_SELECTORS) {
      const element = $(selector).first();
      if (element.length > 0) {
        const html = element.html();
        if (html && html.trim().length > 0) {
          return html;
        }
      }
    }

    // Fallback: retornar body completo
    return $("body").html() || "";
  }

  private htmlToCleanText(html: string): string {
    // Usar html-to-text para conversão inteligente
    const text = convert(html, {
      wordwrap: false,
      preserveNewlines: true,
      selectors: [
        { selector: "a", options: { ignoreHref: true } },
        { selector: "img", format: "skip" },
      ],
    });

    // Limpar espaços extras e normalizar quebras de linha
    return text
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Máximo 2 quebras de linha
      .replace(/[ \t]+/g, " ") // Normalizar espaços
      .trim();
  }
}

// ===== PLAYWRIGHT SCRAPER =====

/**
 * Scraper usando Playwright (completo, pesado, sites dinâmicos)
 */
export class PlaywrightScraper implements IScraper {
  async scrape(url: string): Promise<ScrapedContent> {
    try {
      console.log(`🎭 Usando Playwright para scraping: ${url}`);

      const loader = new PlaywrightWebBaseLoader(url, {
        launchOptions: {
          headless: true,
          timeout: 30000,
        },
        gotoOptions: {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        },
        async evaluate(page, browser) {
          try {
            // Espera adicional para JavaScript carregar
            await page.waitForTimeout(2000);

            // Remove elementos indesejados
            await page.evaluate((selectors) => {
              selectors.forEach((sel) => {
                document.querySelectorAll(sel).forEach((el) => el.remove());
              });
            }, UNWANTED_SELECTORS);

            // Extrai title
            const title = await page.title();

            // Extrai og:image
            const ogImage = await page
              .$eval('meta[property="og:image"]', (el: any) => el.content)
              .catch(() => null);

            // Extrai conteúdo principal
            const content = await page.evaluate((selectors) => {
              for (const selector of selectors) {
                const el = document.querySelector(selector);
                if (el && el.textContent && el.textContent.trim().length > 0) {
                  return el.textContent;
                }
              }
              return document.body.textContent || "";
            }, CONTENT_SELECTORS);

            await browser.close();

            return JSON.stringify({ title, ogImage, content });
          } catch (error) {
            await browser.close();
            throw error;
          }
        },
      });

      const docs = await loader.load();

      if (!docs || docs.length === 0) {
        throw new Error("Nenhum documento carregado pelo Playwright");
      }

      const data = JSON.parse(docs[0].pageContent);

      // Limpa o conteúdo
      const cleanText = this.cleanText(data.content);

      // Validar conteúdo mínimo
      if (cleanText.length < 100) {
        throw new Error(
          `Conteúdo muito curto (${cleanText.length} caracteres). Site pode não ter carregado corretamente.`
        );
      }

      return {
        content: cleanText,
        title: data.title || null,
        ogImage: data.ogImage || null,
        url,
        scrapedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(
        `Erro ao fazer scraping com Playwright: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private cleanText(text: string): string {
    return text
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Máximo 2 quebras de linha
      .replace(/[ \t]+/g, " ") // Normalizar espaços
      .trim();
  }
}

// ===== FACTORY E HELPERS =====

/**
 * Factory para criar scraper apropriado
 */
export function createScraper(engine: ScraperEngine): IScraper {
  switch (engine) {
    case "cheerio":
      return new CheerioScraper();
    case "playwright":
      return new PlaywrightScraper();
    default:
      throw new Error(`Scraper engine não suportado: ${engine}`);
  }
}

/**
 * Detecta automaticamente qual engine usar baseado na URL
 */
export function detectScraperEngine(url: string): ScraperEngine {
  const needsPlaywright = PLAYWRIGHT_REQUIRED_DOMAINS.some((domain) =>
    url.toLowerCase().includes(domain)
  );

  return needsPlaywright ? "playwright" : "cheerio";
}

/**
 * Faz scraping de uma URL usando engine apropriado
 * Função principal (facade) para scraping
 *
 * @param url - URL para fazer scraping
 * @param engine - Engine a usar (auto-detecta se não especificado)
 * @returns Conteúdo extraído com metadata
 */
export async function scrapeUrl(
  url: string,
  engine?: ScraperEngine
): Promise<ScrapedContent> {
  // Auto-detecta engine se não especificado
  const selectedEngine = engine || detectScraperEngine(url);

  console.log(`🔧 Engine selecionado: ${selectedEngine}`);

  const scraper = createScraper(selectedEngine);
  return scraper.scrape(url);
}
