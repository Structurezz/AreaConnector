// Where each notification takes the estate manager. Returns a route (with the
// item to open/highlight in its query string) or an action the bell handles.
//   ?focus=<id>  → the page scrolls to that item and flashes it (see useFocusItem)
export function linkFor(n) {
  const m = n?.meta || {};
  if (m.url) return { to: m.url };
  switch (n?.type) {
    case 'visitor_checkin':
    case 'visitor_checkout':       return { to: m.visitorId ? `/visitors/${m.visitorId}` : '/visitors' };
    case 'new_alert':
    case 'alert_broadcast':        return { to: m.alertId ? `/alerts?alert=${m.alertId}&focus=${m.alertId}` : '/alerts' };
    case 'live_dj':
    case 'live_announcement':
    case 'live_podcast':           return { action: 'live' };
    case 'new_announcement':       return { to: m.announcementId ? `/announcements?focus=${m.announcementId}` : '/announcements' };
    case 'payment_received':
    case 'payment_due':
    case 'payment_overdue':        return { to: m.paymentId ? `/payments?payment=${m.paymentId}` : '/payments' };
    case 'household_request':      return { to: '/family-members?requests=1' };
    case 'new_resident':           return { to: m.residentId ? `/residents/${m.residentId}` : '/residents' };
    case 'password_reset_request': return { to: m.requestId ? `/settings/password-requests?focus=${m.requestId}` : '/settings/password-requests' };
    case 'plan_expiry_warning':
    case 'plan_expiry_urgent':     return { to: '/upgrade' };
    case 'court_update':
    case 'jury_summoned':          return { to: m.caseId ? `/courtroom?case=${m.caseId}` : '/courtroom' };
    case 'marketplace':
    case 'marketplace_item':
    case 'marketplace_order':      return { to: '/marketplace' };
    case 'new_post':
    case 'post_like':              return { to: m.postId ? `/lounge?focus=${m.postId}` : '/lounge' };
    case 'post_comment':           return { to: `/lounge?focus=${m.postId}&comments=1` };
    case 'missed_call':
    case 'credits_added':          return { to: '/calls' };
    case 'new_message':            return { to: m.fromId ? `/chat?dm=${m.fromId}` : '/chat' };
    default:                       return { to: null };
  }
}
