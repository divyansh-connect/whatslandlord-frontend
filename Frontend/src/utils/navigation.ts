/**
 * Helper to get redirect path based on notification details and user role.
 */
export const getNotificationRedirectPath = (
  title: string,
  message: string,
  userRole: string,
  targetId?: string
): string | null => {
  const lowerTitle = title.toLowerCase();
  const lowerMessage = message.toLowerCase();

  // Determine notification type
  const isPayment = 
    lowerTitle.includes('payment') || 
    lowerTitle.includes('invoice') || 
    lowerMessage.includes('payment') || 
    lowerMessage.includes('paid') ||
    lowerMessage.includes('rent') ||
    lowerMessage.includes('$');

  const isMaintenance = 
    lowerTitle.includes('maintenance') || 
    lowerTitle.includes('repair') || 
    lowerTitle.includes('ac not cooling') || 
    lowerMessage.includes('maintenance') || 
    lowerMessage.includes('repair') || 
    lowerMessage.includes('cooling');

  const isLease = 
    lowerTitle.includes('lease') || 
    lowerMessage.includes('lease');

  // Tenant Portal Redirects
  if (userRole === 'Tenant') {
    if (isPayment) return '/tenant/payments';
    if (isMaintenance) return '/tenant/maintenance';
    if (isLease) return '/tenant/lease';
    return '/tenant/notifications';
  }

  // Owner Portal Redirects
  if (userRole === 'Owner') {
    if (isPayment) return '/owner/financials';
    if (isMaintenance) return '/owner/maintenance';
    if (isLease) return '/owner/properties';
    return '/owner';
  }

  // Maintenance Staff Portal Redirects
  if (userRole === 'Maintenance Staff') {
    if (targetId) {
      return `/staff/tasks/${targetId}`;
    }
    return '/staff/tasks';
  }

  // Super Admin Portal Redirects
  if (userRole === 'Super Admin') {
    if (lowerTitle.includes('company') || lowerMessage.includes('company') || lowerMessage.includes('register')) {
      return '/companies';
    }
    if (lowerTitle.includes('subscription') || lowerMessage.includes('subscription') || lowerMessage.includes('renew')) {
      return '/subscriptions';
    }
    if (lowerTitle.includes('system') || lowerTitle.includes('maintenance')) {
      return '/admin';
    }
    return '/';
  }

  // Admin / Property Manager Redirects
  if (userRole === 'Property Manager') {
    if (isPayment) {
      if (targetId) return `/payments/${targetId}`;
      return '/payments';
    }
    if (isMaintenance) {
      if (targetId) return `/maintenance/requests?id=${targetId}`;
      return '/maintenance/requests';
    }
    if (isLease) {
      if (targetId) return `/leases/${targetId}`;
      return '/leasing/leases';
    }
    return '/';
  }

  return null;
};
