const authLib = require('/lib/xp/auth');
const preconditions = require('/lib/preconditions');

function getIdProviderConfig() {
    const idProviderConfig = authLib.getIdProviderConfig();
    preconditions.checkConfig(idProviderConfig, 'authorizationUrl');
    preconditions.checkConfig(idProviderConfig, 'tokenUrl');
    preconditions.checkConfig(idProviderConfig, 'clientId');
    return idProviderConfig;
}

exports.getIdProviderConfig = getIdProviderConfig;