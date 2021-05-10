import { request } from '/lib/http-client';
import { getConfigValue } from '../login-util/config';

/**
 *  Returns a dynamics access token to be used in communication with the new dynamics API:
 *  https://servicetestv2.njff.no/swagger/ui/index#!
 *  If token was generated less than 5 minutes ago. Reuse it, else create new and update object.
 *  @returns a string containing the access token, or undefined if request fails.
 */
const token = {
    accessToken: null,
    time: 0 // time in milliseconds
}
export function getToken() {
    if (token.accessToken && ((new Date().getTime() - (1000 * 60 * 5)) < token.time)) {
        return token.accessToken;
    }

    const { body } = request(createAzureTokenRequest());
    const { access_token } = JSON.parse(body ?? '{}');
    token.accessToken = access_token;
    token.time = new Date().getTime();

    return access_token;
}

function createAzureTokenRequest() {
    const url = getConfigValue('dynamics.token.url');
    const secret = getConfigValue('dynamics.token.secret');
    const clientId = getConfigValue('dynamics.token.client.id');
    const resource = getConfigValue('dynamics.token.resource');

    const data = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: secret,
        resource
    };

    const body = Object.keys(data)
        .map((key) => `${key}=${encodeURIComponent(data[key])}`)
        .join('&');

    return {
        url,
        body,
        method: 'POST',
        headers: {
            'Content-type': 'application/x-www-form-urlencoded',
        }
    };
}
