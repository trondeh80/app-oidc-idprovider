const contextLib = require('/lib/xp/context');

function runAsSu(callback) {
    return contextLib.run({
        user: {
            login: 'su',
            idProvider: 'system'
        },
        principals: ['role:system.admin']
    }, callback);
}

exports.runAsSu = runAsSu;