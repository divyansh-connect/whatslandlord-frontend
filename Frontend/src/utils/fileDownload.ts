/**
 * Utility for downloading real uploaded documents with proper extension detection.
 */

export interface DownloadResult {
  success: boolean;
  filename?: string;
  reason?: 'NO_FILE' | 'DOWNLOAD_FAILED';
}

const KNOWN_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt'];

export function getFileExtensionFromUrl(url: string): string | null {
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const parts = cleanUrl.split('.');
    if (parts.length > 1) {
      const ext = parts.pop()?.toLowerCase();
      if (ext && KNOWN_EXTENSIONS.includes(ext)) {
        return ext;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

export function resolveDownloadFilename(name?: string, fileUrl?: string): string {
  let baseName = (name || '').trim();
  const urlExt = fileUrl ? getFileExtensionFromUrl(fileUrl) : null;

  // Check if baseName already has a known extension
  const nameParts = baseName.split('.');
  const nameExt = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : null;
  const hasKnownExt = nameExt && KNOWN_EXTENSIONS.includes(nameExt);

  if (!baseName) {
    baseName = urlExt ? `document.${urlExt}` : 'document.pdf';
    return baseName;
  }

  if (hasKnownExt) {
    return baseName;
  }

  // If baseName doesn't have an extension, append urlExt if found
  if (urlExt) {
    return `${baseName}.${urlExt}`;
  }

  // Fallback to pdf if no extension known
  return `${baseName}.pdf`;
}

export async function downloadRealFile(doc?: { name?: string; fileUrl?: string | null }): Promise<DownloadResult> {
  if (!doc || !doc.fileUrl || !doc.fileUrl.trim()) {
    return { success: false, reason: 'NO_FILE' };
  }

  let downloadUrl = doc.fileUrl.trim();
  const filename = resolveDownloadFilename(doc.name, downloadUrl);

  // Cloudinary attachment parameter for forced download
  if (downloadUrl.includes('res.cloudinary.com') && downloadUrl.includes('/upload/') && !downloadUrl.includes('/upload/fl_attachment/')) {
    downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
  }

  try {
    const response = await fetch(downloadUrl);
    if (response.ok) {
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
        document.body.removeChild(a);
      }, 150);
      return { success: true, filename };
    }
  } catch (err) {
    console.warn('Direct fetch download failed, falling back to direct anchor link:', err);
  }

  // Direct anchor fallback
  try {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 150);
    return { success: true, filename };
  } catch (err) {
    console.error('All download mechanisms failed:', err);
    return { success: false, reason: 'DOWNLOAD_FAILED' };
  }
}
