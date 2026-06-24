import type { ThemeTokens } from "@/lib/data/themeTokens";
import type { LanguagePack } from "@/lib/data/languagePackTypes";
import type { MethodBook, BookSection } from "./types";

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Render a MethodBook as HTML for PDF generation.
 *
 * @param book - Complete MethodBook structure
 * @param theme - Theme tokens for styling
 * @param t - Language pack for localization
 * @returns Complete HTML document ready for Playwright PDF rendering
 */
export function renderMethodBookHtml(
  book: MethodBook,
  theme: ThemeTokens,
  t: LanguagePack,
): string {
  const css = generateBookCSS(theme);
  const volumesHtml = book.volumes.map((vol, idx) => renderVolume(vol, idx, book.volumes.length)).join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(book.series.title)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="book-series">
    ${volumesHtml}
  </div>
</body>
</html>`;
}

/**
 * Render a single volume.
 */
function renderVolume(volume: any, volumeIndex: number, totalVolumes: number): string {
  const frontMatterHtml = volume.frontMatter.map((section: BookSection) => renderSection(section, 0)).join('\n');
  const bodyHtml = volume.body.map((section: BookSection) => renderSection(section, 0)).join('\n');
  const backMatterHtml = volume.backMatter.map((section: BookSection) => renderSection(section, 0)).join('\n');

  return `<div class="volume" data-volume="${volumeIndex + 1}">
    <div class="front-matter">
      ${frontMatterHtml}
    </div>
    ${bodyHtml ? `<div class="body">${bodyHtml}</div>` : ''}
    ${backMatterHtml ? `<div class="back-matter">${backMatterHtml}</div>` : ''}
  </div>`;
}

/**
 * Recursively render a BookSection with proper hierarchy.
 */
function renderSection(section: BookSection, depth: number): string {
  const kindClass = section.kind;
  const anchorAttr = section.anchorId ? ` id="${esc(section.anchorId)}"` : '';
  const pageBreakAttr = section.pageBreakBefore ? ' class="page-break-before"' : '';

  let html = `<div class="section ${kindClass}" ${anchorAttr}${pageBreakAttr}>`;

  // Heading
  const headingLevel = getHeadingLevel(section.kind);
  const numberPrefix = section.number ? `<span class="section-number">${esc(section.number)}.</span> ` : '';
  html += `<h${headingLevel} class="${kindClass}-heading">${numberPrefix}${esc(section.heading)}</h${headingLevel}>`;

  // Paragraphs
  if (section.paragraphs && section.paragraphs.length > 0) {
    section.paragraphs.forEach(p => {
      html += `<p>${esc(p)}</p>`;
    });
  }

  // Bullets
  if (section.bullets && section.bullets.length > 0) {
    html += '<ul class="bullet-list">';
    section.bullets.forEach(bullet => {
      const label = bullet.label ? `<strong>${esc(bullet.label)}:</strong> ` : '';
      // Don't escape bullet.text - it may contain hyperlinks
      html += `<li>${label}${bullet.text}</li>`;
    });
    html += '</ul>';
  }

  // Subsections
  if (section.subsections && section.subsections.length > 0) {
    section.subsections.forEach(sub => {
      html += renderSection(sub, depth + 1);
    });
  }

  html += '</div>';
  return html;
}

/**
 * Get heading level for section kind.
 */
function getHeadingLevel(kind: string): number {
  switch (kind) {
    case 'frontMatter':
    case 'part':
    case 'backMatter':
      return 1;
    case 'chapter':
      return 2;
    case 'section':
      return 3;
    case 'subsection':
      return 4;
    default:
      return 2;
  }
}

/**
 * Generate CSS for book layout.
 */
function generateBookCSS(theme: ThemeTokens): string {
  return `
    /* Reset and base styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      background: white;
    }

    /* Page setup for PDF */
    @page {
      size: A4;
      margin: 2.5cm 2cm;

      @top-center {
        content: string(volumeTitle);
        font-size: 9pt;
        color: #666;
      }

      @bottom-center {
        content: "Page " counter(page);
        font-size: 9pt;
        color: #666;
      }
    }

    /* Volume boundaries */
    .volume {
      page-break-before: always;
    }

    .volume:first-child {
      page-break-before: avoid;
    }

    /* Front matter */
    .front-matter {
      counter-reset: chapter;
    }

    /* Part breaks (force odd-numbered page) */
    .part {
      page-break-before: right;
      page-break-after: always;
      counter-reset: chapter;
    }

    .part-heading {
      font-size: 24pt;
      font-weight: 900;
      margin: 3cm 0 1.5cm 0;
      text-align: center;
      color: ${theme.accent};
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Chapter breaks */
    .chapter {
      page-break-before: always;
      counter-increment: chapter;
      margin-bottom: 2cm;
    }

    .chapter-heading {
      font-size: 18pt;
      font-weight: 800;
      margin: 1.5cm 0 1cm 0;
      color: ${theme.accent};
      border-bottom: 2px solid ${theme.accent};
      padding-bottom: 0.5cm;
    }

    /* Section numbering */
    .section-number {
      font-weight: 900;
      color: ${theme.accent};
    }

    /* Section styles */
    .section {
      margin-bottom: 1.5cm;
    }

    .section-heading {
      font-size: 14pt;
      font-weight: 700;
      margin: 1cm 0 0.5cm 0;
      color: #222;
    }

    .subsection {
      margin-left: 1cm;
      margin-bottom: 1cm;
    }

    .subsection-heading {
      font-size: 12pt;
      font-weight: 600;
      margin: 0.75cm 0 0.25cm 0;
      color: #444;
    }

    /* Typography */
    p {
      margin-bottom: 0.5cm;
      text-align: justify;
      hyphens: auto;
    }

    h1, h2, h3, h4 {
      page-break-after: avoid;
      orphans: 3;
      widows: 3;
    }

    /* Lists */
    .bullet-list {
      margin: 0.5cm 0 0.5cm 1.5cm;
      list-style-type: disc;
    }

    .bullet-list li {
      margin-bottom: 0.25cm;
    }

    .bullet-list li strong {
      color: ${theme.accent};
    }

    /* Table of Contents */
    .frontMatter .section:has(.frontMatter-heading:contains("Table of Contents")) ul {
      list-style: none;
      margin-left: 0;
    }

    .frontMatter .section:has(.frontMatter-heading:contains("Table of Contents")) li {
      margin-bottom: 0.15cm;
      font-size: 10pt;
    }

    a.toc-link {
      color: ${theme.text};
      text-decoration: none;
    }

    a.toc-link:hover {
      color: ${theme.accent};
      text-decoration: underline;
    }

    /* Back matter */
    .backMatter {
      page-break-before: always;
      margin-bottom: 2cm;
    }

    .backMatter-heading {
      font-size: 16pt;
      font-weight: 800;
      margin: 1.5cm 0 1cm 0;
      color: ${theme.accent};
      border-bottom: 2px solid ${theme.accent};
      padding-bottom: 0.5cm;
    }

    /* Cross-references */
    a.xref {
      color: ${theme.accent};
      text-decoration: none;
      font-weight: 600;
    }

    a.xref::before {
      content: "→ ";
      color: ${theme.accent};
    }

    /* Page break utilities */
    .page-break-before {
      page-break-before: always;
    }

    /* Print optimizations */
    @media print {
      body {
        background: white;
      }

      .volume {
        page-break-inside: avoid;
      }

      .section {
        orphans: 3;
        widows: 3;
      }
    }

    /* Avoid breaking these elements */
    .bullet-list {
      page-break-inside: avoid;
    }

    /* Title pages */
    .volume[data-volume="1"] .frontMatter .frontMatter-heading:first-of-type {
      font-size: 32pt;
      font-weight: 900;
      text-align: center;
      margin: 5cm 0 2cm 0;
      color: ${theme.accent};
    }

    .volume[data-volume="1"] .frontMatter p {
      text-align: center;
      font-size: 12pt;
      margin-bottom: 0.25cm;
    }
  `;
}
