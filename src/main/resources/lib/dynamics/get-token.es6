import { request } from '/lib/http-client';
import { getConfigValue } from '../login-util/config';

export function getToken() {
    const response = request(createAzureTokenRequest());
    const { body: { access_token } } = response;
    return access_token;
}

function createAzureTokenRequest() {
    const url = getConfigValue('dynamics.token.url');
    const secret = getConfigValue('dynamics.token.secret');
    const clientId = getConfigValue('dynamics.token.client.id');

    const data = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: secret,
        resource: 'api://5dd16e09-f8ba-419d-952e-b2bb37e073c0'
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
