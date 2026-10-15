export interface TenantContext {
  userId?: string;
  userEmail?: string;
  userName?: string;
  profileId?: string;
  profileEmail?: string;
  profileFirstName?: string;
  profileLastName?: string;
  unitNumber?: string;
}

/**
 * Checks if a notification strictly belongs to the logged-in tenant.
 * Prevents cross-tenant leaks from un-isolated backend responses or localStorage.
 */
export function isNoticeForTenant(notice: any, ctx: TenantContext): boolean {
  if (!notice) return false;
  if (notice.id === 'ai-notice-seed-1') return false; // Ignore legacy seed notices

  const currentEmail = (ctx.userEmail || ctx.profileEmail || '').toLowerCase().trim();
  const currentName = (ctx.userName || `${ctx.profileFirstName || ''} ${ctx.profileLastName || ''}`).toLowerCase().trim();
  const currentFirstName = (ctx.profileFirstName || ctx.userName?.split(' ')[0] || '').toLowerCase().trim();
  const currentLastName = (ctx.profileLastName || ctx.userName?.split(' ').slice(1).join(' ') || '').toLowerCase().trim();
  const currentId = ctx.userId || ctx.profileId || '';

  const noticeEmail = (notice.tenantEmail || '').toLowerCase().trim();
  const noticeId = notice.tenantId || '';
  const noticeName = (notice.tenantName || '').toLowerCase().trim();

  // 1. Strict negative check: If notice has explicit target fields, they MUST NOT mismatch
  if (noticeEmail && currentEmail && noticeEmail !== currentEmail) {
    return false;
  }
  if (noticeId && currentId && noticeId !== currentId && (!ctx.profileId || noticeId !== ctx.profileId)) {
    return false;
  }
  if (noticeName && currentName) {
    const matchesName =
      currentName.includes(noticeName) ||
      noticeName.includes(currentName) ||
      (currentFirstName.length > 1 && noticeName.includes(currentFirstName)) ||
      (currentLastName.length > 1 && noticeName.includes(currentLastName));
    if (!matchesName) {
      return false;
    }
  }

  // 2. Parse recipient name from message (e.g., "Dear gfg fdf," or "Dear remo demo,")
  const message = String(notice.message || '');
  const dearMatch = message.match(/(?:Dear|Hi|Hello)\s+([A-Za-z0-9\s]+?)(?:,|\.|\n)/i);
  if (dearMatch && dearMatch[1]) {
    const addressedName = dearMatch[1].toLowerCase().trim();
    // Exclude generic greetings like "Resident", "Valued Tenant", "Customer"
    const genericGreetings = ['resident', 'tenant', 'valued resident', 'valued tenant', 'all', 'everyone', 'user', 'customer'];
    const isGenericGreeting = genericGreetings.includes(addressedName);

    if (!isGenericGreeting && addressedName.length > 2) {
      const nameMatches =
        (currentName && (currentName.includes(addressedName) || addressedName.includes(currentName))) ||
        (currentFirstName && currentFirstName.length > 1 && (addressedName.includes(currentFirstName) || currentFirstName.includes(addressedName))) ||
        (currentLastName && currentLastName.length > 1 && (addressedName.includes(currentLastName) || currentLastName.includes(addressedName)));

      if (!nameMatches) {
        // Explicitly addressed to another person (e.g., "gfg fdf" when logged in as "remo demo")
        return false;
      }
    }
  }

  // 3. For AI Rent Notices:
  // If notice is an AI Rent Notice, verify it has legitimate target info matching this tenant
  const isAiNotice =
    (notice.id || '').startsWith('ai-notice') ||
    (notice.title || '').toLowerCase().includes('ai rent') ||
    (notice.title || '').toLowerCase().includes('urgent rent') ||
    (notice.title || '').toLowerCase().includes('friendly reminder: rent') ||
    (notice.title || '').toLowerCase().includes('rent payment reminder') ||
    message.toLowerCase().includes('friendly reminder: rent payment due') ||
    message.toLowerCase().includes('rent payment due for');

  if (isAiNotice) {
    // Must match either by email, id, explicit tenantName, or parsed addressedName
    const hasTargetInfo = Boolean(
      (noticeEmail && currentEmail && noticeEmail === currentEmail) ||
      (noticeId && currentId && (noticeId === currentId || noticeId === ctx.profileId)) ||
      (noticeName && currentName && (currentName.includes(noticeName) || noticeName.includes(currentName))) ||
      (dearMatch && dearMatch[1] && !['resident', 'tenant', 'valued resident', 'valued tenant'].includes(dearMatch[1].toLowerCase().trim()))
    );

    if (!hasTargetInfo) {
      // Untargeted AI rent notice, reject to avoid cross-tenant contamination
      return false;
    }
  }

  return true;
}
