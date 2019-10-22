function getRequestUrl() {
    var bean = __.newBean('com.enonic.app.oidcidprovider.PortalRequestBean');
    return bean.getRequestUrl();
}

function storeContext(params) {
    var bean = __.newBean('com.enonic.app.oidcidprovider.PortalRequestBean');
    bean.storeContext(params.state, params.nonce, params.originalUrl);
}

exports.getRequestUrl = getRequestUrl;
exports.storeContext = storeContext;