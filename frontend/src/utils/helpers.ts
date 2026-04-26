/**
 * Event ID helpers for CalDAV URLs
 */

/**
 * Extracts the filename (last part after /) from a CalDAV event URL
 * Example:
 *   input: "http://radicale:5232/admin/TestCal/abc123%40niftycaldav.ics"
 *   output: "abc123%40niftycaldav.ics"
 */
export function extractEventFilenameFromUrl(fullUrl: string | undefined): string {
  if (!fullUrl) return '';
  
  // Remove protocol prefix if present
  let cleanUrl = fullUrl.replace(/^https?:\/\//, '');
  
  // Get the last part after the last /
  const parts = cleanUrl.split('/');
  return parts[parts.length - 1];
}

/**
 * Normalizes event ID for API calls by extracting filename from full URL
 */
export function normalizeEventId(eventId: string | undefined): string {
  return extractEventFilenameFromUrl(eventId);
}

/**
 * Format event ID for display (decode URI components)
 */
export function formatEventIdForDisplay(fullUrl: string | undefined): string {
  if (!fullUrl) return '';
  const filename = extractEventFilenameFromUrl(fullUrl);
  return decodeURIComponent(filename);
}
