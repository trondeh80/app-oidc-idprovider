import { request } from '/lib/http-client';
import { hmacSha256AsHex } from '/lib/text-encoding';
import moment from '/assets/momentjs/2.12.0/min/moment-with-locales.min.js';
import { getIdProviderConfig } from './config';

const AID_ENPOINT = 'https://www.aid.no/api/vespasian/v1/';

export function getUserInformation({ accessToken }) {
  const url = createUrl();
  const userData = runRequest(createRequest({
    url,
    request: {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  }));
}

/***
 * Method to sign a request by AID standards.
 * @param url - endpoint in AID for request
 * @param fields - Data in the POST body
 * @param params - GET parameters
 *
 * returns a hashed signature string to be included in request to aid
 */
function createSignature({ url, fields = {}, params = {} }) {
  const time = moment().format(); // Uses default format: YYYY-MM-DDTHH:mm:ssZ (ISO-8601
  let token = url;
  const requestParams = {
    ...params,
    ...fields,
    timestamp: time
  };

  Object.keys(requestParams).sort().forEach((key) => {
    token += `|${key}=${requestParams[key]}`;
  });

  const { clientSecret } = getIdProviderConfig();
  return hmacSha256AsHex(clientSecret, token);
}

function createUrl(endpoint) {
  return `${AID_ENPOINT}${endpoint}`;
}

function createRequest({ url, request }) {
  return {
    url,
    method: 'GET',
    ...request
  };
}

function runRequest(httpRequest) {
  return request(httpRequest);
}
