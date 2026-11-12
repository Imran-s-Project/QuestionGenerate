// Unsaved question drafts live on this device only (localStorage). They are removed after a successful save.
const key = (orgId, id) => `qg.draft.${orgId}.${id || 'new'}`;
export const saveDraft = (orgId, id, data) => { try { localStorage.setItem(key(orgId, id), JSON.stringify({ at: Date.now(), data })); } catch (e) { console.warn('Draft not saved', e); } };
export const loadDraft = (orgId, id) => { try { return JSON.parse(localStorage.getItem(key(orgId, id)) || 'null'); } catch { return null; } };
export const clearDraft = (orgId, id) => localStorage.removeItem(key(orgId, id));
