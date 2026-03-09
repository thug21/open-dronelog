/**
 * Utility functions for formatting and calculations
 */

export type UnitSystem = 'metric' | 'imperial';

/** Locale-aware number formatter helper */
export function fmtNum(value: number, decimals: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format duration from seconds to human readable string */
export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '--:--';
  
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${mins}m ${secs}s`;
  }
  return `${mins}m ${secs}s`;
}

/** Format distance in meters to human readable string */
export function formatDistance(
  meters: number | null,
  unitSystem: UnitSystem = 'metric',
  locale?: string
): string {
  if (meters === null || meters === undefined) return '--';

  if (unitSystem === 'imperial') {
    const miles = meters / 1609.344;
    return `${fmtNum(miles, 2, locale)} mi`;
  }
  
  if (meters >= 1000) {
    return `${fmtNum(meters / 1000, 2, locale)} km`;
  }
  return `${fmtNum(meters, 0, locale)} m`;
}

/** Format speed from m/s to km/h or mph */
export function formatSpeed(
  ms: number | null,
  unitSystem: UnitSystem = 'metric',
  locale?: string
): string {
  if (ms === null || ms === undefined) return '--';
  if (unitSystem === 'imperial') {
    const mph = ms * 2.236936;
    return `${fmtNum(mph, 1, locale)} mph`;
  }
  const kmh = ms * 3.6;
  return `${fmtNum(kmh, 1, locale)} km/h`;
}

/** Format altitude in meters */
export function formatAltitude(
  meters: number | null,
  unitSystem: UnitSystem = 'metric',
  locale?: string
): string {
  if (meters === null || meters === undefined) return '--';
  if (unitSystem === 'imperial') {
    const feet = meters * 3.28084;
    return `${fmtNum(feet, 1, locale)} ft`;
  }
  return `${fmtNum(meters, 1, locale)} m`;
}

/** Ensure AM/PM tokens are always uppercase (some locales produce lowercase) */
export function ensureAmPmUpperCase(s: string): string {
  return s.replace(/\b(am|pm)\b/gi, (m) => m.toUpperCase());
}

// ============================================================================
// Date format pattern system
// ============================================================================

/** Supported date format patterns */
export type DateFormatPattern =
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY'
  | 'DD.MM.YYYY'
  | 'DD-MM-YYYY'
  | 'YYYY-MM-DD'
  | 'YYYY/MM/DD'
  | 'YYYY/M/D'
  | 'YYYY. M. D.';

type DateOrder = 'DMY' | 'MDY' | 'YMD';

interface DateFormatConfig {
  order: DateOrder;
  separator: string;
  padded: boolean;
  trailing?: string;
}

const DATE_FORMAT_CONFIGS: Record<string, DateFormatConfig> = {
  'DD/MM/YYYY':   { order: 'DMY', separator: '/', padded: true },
  'MM/DD/YYYY':   { order: 'MDY', separator: '/', padded: true },
  'DD.MM.YYYY':   { order: 'DMY', separator: '.', padded: true },
  'DD-MM-YYYY':   { order: 'DMY', separator: '-', padded: true },
  'YYYY-MM-DD':   { order: 'YMD', separator: '-', padded: true },
  'YYYY/MM/DD':   { order: 'YMD', separator: '/', padded: true },
  'YYYY/M/D':     { order: 'YMD', separator: '/', padded: false },
  'YYYY. M. D.':  { order: 'YMD', separator: '. ', padded: false, trailing: '.' },
};

/** Mapping from legacy locale-based date format values to pattern strings. */
export const LEGACY_DATE_LOCALE_MAP: Record<string, DateFormatPattern> = {
  'en-GB': 'DD/MM/YYYY',
  'en-US': 'MM/DD/YYYY',
  'de-DE': 'DD.MM.YYYY',
  'nl-NL': 'DD-MM-YYYY',
  'sv-SE': 'YYYY-MM-DD',
  'ja-JP': 'YYYY/MM/DD',
  'zh-CN': 'YYYY/M/D',
  'ko-KR': 'YYYY. M. D.',
};

/** Resolve a dateLocale value that might be a legacy locale code or a pattern string. */
export function resolveDateFormat(dateLocale: string): string {
  return LEGACY_DATE_LOCALE_MAP[dateLocale] || dateLocale;
}

/**
 * Format a Date as a purely numeric string using a date format pattern.
 * Language-independent (only digits and separators).
 */
export function formatDateNumeric(date: Date, pattern: string): string {
  const fmt = resolveDateFormat(pattern);
  const config = DATE_FORMAT_CONFIGS[fmt];
  if (!config) return date.toLocaleDateString();

  const y = String(date.getFullYear());
  const m = config.padded ? String(date.getMonth() + 1).padStart(2, '0') : String(date.getMonth() + 1);
  const d = config.padded ? String(date.getDate()).padStart(2, '0') : String(date.getDate());

  let result: string;
  switch (config.order) {
    case 'YMD': result = [y, m, d].join(config.separator); break;
    case 'MDY': result = [m, d, y].join(config.separator); break;
    case 'DMY': result = [d, m, y].join(config.separator); break;
  }
  if (config.trailing) result += config.trailing;
  return result;
}

/**
 * Format a Date with a short month name (e.g. "10 Mar 2025") using the
 * date format pattern for ORDER and the app language for month names.
 */
export function formatDateDisplay(date: Date, pattern: string, lang?: string): string {
  const fmt = resolveDateFormat(pattern);
  const config = DATE_FORMAT_CONFIGS[fmt];
  if (!config) return date.toLocaleDateString(lang);

  const monthName = date.toLocaleDateString(lang || 'en', { month: 'short' });
  const y = String(date.getFullYear());
  const d = String(date.getDate());

  switch (config.order) {
    case 'DMY': return `${d} ${monthName} ${y}`;
    case 'MDY': return `${monthName} ${d}, ${y}`;
    case 'YMD': return `${y} ${monthName} ${d}`;
  }
}

/**
 * Format a date + time string using the date format pattern for date ORDER,
 * the app language for month names, and locale-appropriate time formatting.
 * Replaces the old locale-based formatDateTime.
 */
export function formatDateTime(dateStr: string | null, dateFormat?: string, lang?: string, hour12?: boolean): string {
  if (!dateStr) return 'Unknown date';

  try {
    const date = new Date(dateStr);

    // Date portion — pattern-based with app-language month name
    const datePart = dateFormat
      ? formatDateDisplay(date, dateFormat, lang)
      : date.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: 'numeric' });

    // Time portion — always use app language locale
    const timePart = date.toLocaleTimeString(lang || 'en', {
      hour: '2-digit',
      minute: '2-digit',
      ...(hour12 !== undefined ? { hour12 } : {}),
    });

    return ensureAmPmUpperCase(`${datePart}, ${timePart}`);
  } catch {
    return dateStr;
  }
}

/**
 * Format a Date with weekday + short month + year using the date format pattern
 * for day/month/year ORDER and the app language for text.
 * Used for report day headers (e.g. "Monday, 10 Mar 2025").
 */
export function formatDateHeader(date: Date, pattern: string, lang?: string): string {
  const fmt = resolveDateFormat(pattern);
  const config = DATE_FORMAT_CONFIGS[fmt];
  if (!config) {
    return date.toLocaleDateString(lang, { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' });
  }

  const weekday = date.toLocaleDateString(lang || 'en', { weekday: 'long' });
  const datePart = formatDateDisplay(date, fmt, lang);
  return `${weekday}, ${datePart}`;
}

/**
 * Format a full date+time string with seconds and timezone,
 * using pattern-based date ORDER and app language.
 * Used for HTML reports.
 */
export function formatDateTimeFull(dateStr: string | null, dateFormat?: string, lang?: string, hour12?: boolean): string {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    const datePart = dateFormat
      ? formatDateDisplay(date, dateFormat, lang)
      : date.toLocaleDateString(lang, { year: 'numeric', month: 'short', day: '2-digit' });

    const timePart = date.toLocaleTimeString(lang || 'en', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: hour12 !== undefined ? hour12 : true,
      timeZoneName: 'short',
    });

    return ensureAmPmUpperCase(`${datePart}, ${timePart}`);
  } catch {
    return dateStr;
  }
}

/** Format file size in bytes to human readable */
export function formatFileSize(bytes: number, locale?: string): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${fmtNum(bytes / 1024, 1, locale)} KB`;
  return `${fmtNum(bytes / (1024 * 1024), 2, locale)} MB`;
}

/** Calculate bounds for a GPS track */
export function calculateBounds(
  track: [number, number, number][]
): [[number, number], [number, number]] | null {
  if (track.length === 0) return null;

  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [lng, lat] of track) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Add padding
  const lngPad = (maxLng - minLng) * 0.1 || 0.001;
  const latPad = (maxLat - minLat) * 0.1 || 0.001;

  return [
    [minLng - lngPad, minLat - latPad],
    [maxLng + lngPad, maxLat + latPad],
  ];
}

/** Get center of a GPS track */
export function getTrackCenter(
  track: [number, number, number][]
): [number, number] {
  if (track.length === 0) return [0, 0];

  let sumLng = 0;
  let sumLat = 0;

  for (const [lng, lat] of track) {
    sumLng += lng;
    sumLat += lat;
  }

  return [sumLng / track.length, sumLat / track.length];
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Normalize a serial number (trim whitespace and convert to uppercase) */
export function normalizeSerial(serial: string | null | undefined): string {
  if (!serial) return '';
  return serial.trim().toUpperCase();
}

/** Check if a display name indicates a decommissioned item (contains "[X]") */
export function isDecommissioned(displayName: string): boolean {
  return displayName.includes('[X]');
}
