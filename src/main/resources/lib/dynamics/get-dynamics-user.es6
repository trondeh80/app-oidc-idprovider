import { request } from '/lib/http-client';
import { getToken } from './get-token';
import { getConfigValue } from '../login-util/config';

export default function getDynamicsUser(dynamicsId) {
    const url = createUrl(`/api/accounts/${dynamicsId}?fullMemberDetail=true`);
    const { body } = request(url);
    return JSON.parse(body);
}

function createDynamicsRequest(url, requestObject = {}) {
    const accessToken = getToken();

    return {
        method: 'GET',
        ...requestObject,
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    };
}

function createUrl(endpoint) {
    const url = getConfigValue('dynamics.v2.url');
    return `${url}${endpoint}`;
}
