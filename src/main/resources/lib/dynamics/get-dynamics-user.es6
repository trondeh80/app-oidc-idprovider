import { request } from '/lib/http-client';
import { getToken } from './get-token';
import { getConfigValue } from '../login-util/config';

const NO_MEMBER_RESPONSE = 'Medlem ikke funnet';

export function getDynamicsUser(uuid) {
    const url = createUrl(`/accounts/${uuid}?fullMemberDetail=true&memberDetail=true&membership=true&validMembership=true&title=true`); // eslint-disable-line
    const dynamicsRequest = createDynamicsRequest(url);
    const { body } = request(dynamicsRequest);
    if (!body || body === NO_MEMBER_RESPONSE) {
        return null;
    }
    const { response = null } = JSON.parse(body) ?? {};
    return response;
}

export function getHasPublishForUnion(uuid, number) {
    const url = createUrl(`/accounts/${uuid}?union=${number}&validPublish=true`); // eslint-disable-line
    const dynamicsRequest = createDynamicsRequest(url);
    const { body } = request(dynamicsRequest);
    const { response: { hasPublish = false } } = JSON.parse(body) ?? {};
    return hasPublish;
}

function createDynamicsRequest(url, requestObject = {}) {
    const accessToken = getToken();

    return {
        method: 'GET',
        ...requestObject,
        url,
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };
}

function createUrl(endpoint) {
    const url = getConfigValue('dynamics.v2.url');
    return `${url}${endpoint}`;
}
