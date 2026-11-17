import apiClient from '../api/client';

/**
 * Sends a non-blocking soft-delete snapshot to the MySQL restore_bin table.
 * If anything fails or times out, it logs a warning and does NOT block the main deletion.
 */
export const softDeleteToBin = async ({
  entityType,
  entityId,
  title,
  subtitle = '',
  data = {},
  logout,
  refreshAccessToken,
}) => {
  if (!entityType || !entityId) return;
  try {
    await apiClient.post(
      '/restore-bin',
      {
        entityType,
        entityId: String(entityId),
        title: title || `${entityType} #${String(entityId).substring(0, 8)}`,
        subtitle: subtitle || '',
        data: data || { id: entityId },
      },
      logout,
      refreshAccessToken
    );
  } catch (e) {
    console.warn('Soft-delete snapshot warning (non-blocking):', e?.message);
  }
};

