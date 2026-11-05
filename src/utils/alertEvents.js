// Helpers for the `new_alert` socket event. The server sends the same event
// for a brand-new alert AND for status changes (payload has `action:
// 'acknowledged' | 'resolved'`), and it also echoes alerts back to whoever
// raised them. Only a brand-new alert from someone else should ever trigger
// the siren / full-screen popup.

import { blockName } from './siteTypes';

export const isStatusUpdate = (alert) => !!alert?.action;

export const raiserIdOf = (alert) => String(alert?.residentId?._id || alert?.residentId || '');

export const isOwnAlert = (alert, userId) => !!userId && raiserIdOf(alert) === String(userId);

export const isIncomingAlert = (alert, userId) => !isStatusUpdate(alert) && !isOwnAlert(alert, userId);

// Insert or replace by _id, newest first.
export function upsertAlert(list, alert) {
  if (!alert?._id) return list;
  const i = list.findIndex((a) => a._id === alert._id);
  if (i === -1) return [alert, ...list];
  const next = list.slice();
  next[i] = { ...next[i], ...alert };
  return next;
}

// "Block A · Unit 4" for estates; pass the site terms for "Ward 4", "Moremi Hall · Room 12"…
export const unitLabelOf = (alert, terms) => (alert?.unitId
  ? `${alert.unitId.block ? `${blockName(alert.unitId.block, terms)} · ` : ''}${terms?.unit || 'Unit'} ${alert.unitId.unitNumber}`
  : null);
