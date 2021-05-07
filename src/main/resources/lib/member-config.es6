import { getIdProviderKey } from '/lib/xp/portal';

/**
 * Returns the group name for normal members without write access to admin
 * @returns {string}
 */
export function getDefaultUserGroup() {
    return `group:${getIdProviderKey()}:member`;
}
