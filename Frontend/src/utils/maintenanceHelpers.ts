/**
 * Helper utilities for Maintenance and Service Requests
 * Handles extraction of preferred visit windows, days, and clean descriptions.
 */

export const extractPreferredVisit = (item: any): string => {
  if (!item) return '';

  // 1. Direct preferredTime field if not default placeholder
  if (item.preferredTime && item.preferredTime !== 'Morning (8AM - 12PM)' && item.preferredTime.trim() !== '') {
    return item.preferredTime.trim();
  }

  // 2. Check scheduledDate if it's text/day name (e.g. "monday", "Tuesday Morning", "Friday")
  if (item.scheduledDate && typeof item.scheduledDate === 'string') {
    const trimmed = item.scheduledDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}/.test(trimmed) && trimmed !== '') {
      return trimmed;
    }
  }

  // 3. Check notes for "Preferred Visit: ..."
  if (item.notes && typeof item.notes === 'string') {
    const match = item.notes.match(/Preferred Visit:\s*([^\]\n]+)/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  // 4. Check description for "[Preferred Visit: ...]"
  if (item.description && typeof item.description === 'string') {
    const match = item.description.match(/\[Preferred Visit:\s*([^\]]+)\]/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  // 5. Check issue/title for "[Preferred Visit: ...]"
  if (item.issue && typeof item.issue === 'string') {
    const match = item.issue.match(/\[Preferred Visit:\s*([^\]]+)\]/i);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  // Fallback to preferredTime if present
  return item.preferredTime || '';
};

export const cleanDescription = (desc?: string): string => {
  if (!desc) return '';
  return desc.replace(/\[Preferred Visit:\s*[^\]]+\]/gi, '').trim();
};
