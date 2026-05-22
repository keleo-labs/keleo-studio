import type { Citation } from './types';

/**
 * Converts URLs in text to clickable hyperlinks
 */
export function linkifyUrls(text: string): string {
  const urlPattern = /(https?:\/\/[^\s<>"]+)/gi;

  return text.replace(urlPattern, (url) => {
    let cleanUrl = url;
    let trailingPunctuation = "";

    const trailingPunctuationPattern = /([.,;:!?)])+$/;
    const match = cleanUrl.match(trailingPunctuationPattern);
    if (match) {
      trailingPunctuation = match[0];
      cleanUrl = cleanUrl.slice(0, -trailingPunctuation.length);
    }

    return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--pf-v6-global--link--Color); text-decoration: underline;">${cleanUrl}</a>${trailingPunctuation}`;
  });
}

/**
 * Formats a citation in APA7 style
 * @param citation Citation object with authors, date, name (title), source
 * @returns HTML string with APA7-formatted citation
 */
export function formatAPA7Citation(citation: Citation): string {
  const { name, description, authors, date, source } = citation;

  let formatted = "";

  // Authors (joined with commas and ampersand)
  if (authors && authors.length > 0) {
    formatted += authors.join(", ");
  }

  // Date in parentheses
  if (date) {
    formatted += formatted ? ` (${date})` : `(${date})`;
  }

  // Title (name field) - italicized
  if (name) {
    formatted += formatted ? `. <em>${name}</em>` : `<em>${name}</em>`;
  }

  // Description (if present)
  if (description) {
    formatted += formatted ? `. ${description}` : description;
  }

  // Source
  if (source) {
    formatted += formatted ? `. ${source}` : source;
  }

  // Convert URLs to clickable links
  formatted = linkifyUrls(formatted);

  return formatted || "(No citation details available)";
}

/**
 * Get citations referenced by a narrative's citationNames array
 */
export function getCitationsForNarrative(
  narrative: any,
  allCitations: Citation[]
): Citation[] {
  const citationNames = narrative.citationNames ?? [];
  if (!Array.isArray(citationNames) || citationNames.length === 0) {
    return [];
  }

  return allCitations.filter(c =>
    citationNames.some(name =>
      String(c.name).toLowerCase().trim() === String(name).toLowerCase().trim()
    )
  );
}

/**
 * Formats an APA in-text citation (authors and year)
 * Examples:
 * - Single author: (Smith, 2020)
 * - Two authors: (Smith & Jones, 2020)
 * - Three+ authors: (Smith et al., 2020)
 */
export function formatInTextCitation(citation: Citation): string {
  const { authors, date } = citation;

  if (!authors || authors.length === 0) {
    return date ? `(${date})` : '';
  }

  // Extract last names from author strings (handle formats like "Smith, J." or "Smith")
  const lastNames = authors.map(author => {
    const parts = author.split(',');
    return parts[0].trim();
  });

  let authorsText = '';
  if (lastNames.length === 1) {
    authorsText = lastNames[0];
  } else if (lastNames.length === 2) {
    authorsText = `${lastNames[0]} & ${lastNames[1]}`;
  } else {
    authorsText = `${lastNames[0]} et al.`;
  }

  return date ? `(${authorsText}, ${date})` : `(${authorsText})`;
}
