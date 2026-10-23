// Estate manager team access — mirrors server/utils/teamAccess.js.
// Owners (teamRole missing or 'owner') see everything; invited members only
// see the areas in `user.permissions`. The server enforces the same rules.

export const AREA_LABELS = {
  residents:      'Residents & units',
  security:       'Security',
  finance:        'Finance',
  communications: 'Communications',
  community:      'Community',
  settings:       'Settings & team',
};

// First path segment → areas that unlock it (any one is enough). Paths not
// listed (dashboard, calls, settings for your own password) are open to all.
const AREA_BY_PATH = {
  residents:     ['residents'],
  units:         ['residents'],
  visitors:      ['security'],
  guards:        ['security'],
  alerts:        ['security'],
  payments:      ['finance'],
  upgrade:       ['finance'],
  announcements: ['communications'],
  chat:          ['communications'],
  lounge:        ['community', 'communications'],
  podcasts:      ['community'],
  marketplace:   ['community'],
  courtroom:     ['community'],
  team:          ['settings'],
};

export const isTeamMember = (user) => user?.role === 'estate_manager' && user?.teamRole === 'member';

export const hasArea = (user, area) => !isTeamMember(user) || (user.permissions || []).includes(area);

export function canOpen(user, pathname) {
  if (!isTeamMember(user)) return true;
  const areas = (pathname || '').startsWith('/settings/password-requests')
    ? ['settings']
    : AREA_BY_PATH[(pathname || '').split('/')[1]];
  return !areas || areas.some(a => hasArea(user, a));
}
