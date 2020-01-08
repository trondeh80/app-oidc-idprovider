const authLib = require('/lib/xp/auth');
const preconditions = require('/lib/preconditions');

function getIdProviderConfig() {
    const idProviderConfig = authLib.getIdProviderConfig();
    preconditions.checkConfig(idProviderConfig, 'issuer');
    preconditions.checkConfig(idProviderConfig, 'authorizationUrl');
    preconditions.checkConfig(idProviderConfig, 'tokenUrl');
    preconditions.checkConfig(idProviderConfig, 'clientId');
    preconditions.checkConfig(idProviderConfig, 'clientSecret');

    //Handle backward compatibility
    if (!idProviderConfig.scopes) {
        idProviderConfig.scopes = {};
    }
    if (idProviderConfig.scopes.email !== false) {
        idProviderConfig.scopes.email = true;
    }
    if (!idProviderConfig.mappings) {
        idProviderConfig.mappings = {};
    }
    if (!idProviderConfig.mappings.displayName) {
        idProviderConfig.mappings.displayName = '${preferred_username}';
    }

    idProviderConfig.mappings.displayName = idProviderConfig.mappings.displayName.trim();

    return idProviderConfig;
}

exports.getIdProviderConfig = getIdProviderConfig;