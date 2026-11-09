import { t } from './i18n.js';
import { toast } from './dom.js';

// One place that turns Firebase error codes into user-facing text.
const CODES = {
  'auth/invalid-credential': 'err.credentials', 'auth/wrong-password': 'err.credentials', 'auth/user-not-found': 'err.credentials',
  'auth/invalid-email': 'err.email', 'auth/email-already-in-use': 'err.exists', 'auth/weak-password': 'err.weak',
  'auth/network-request-failed': 'err.network', unavailable: 'err.network',
  'app/invalid-invite': 'err.invite',
  'permission-denied': 'err.permission', 'auth/popup-closed-by-user': 'err.cancelled'
};
export const errorMessage = e => t(CODES[e?.code] || 'err.generic');
export function handleError(e, scope = '') { console.error(scope, e); toast(errorMessage(e), 'error'); }
