function getRequestUrl() {
    var bean = __.newBean('com.enonic.app.oidcidprovider.PortalRequestBean');
    return bean.getRequestUrl();
}

function storeContext(params) {
    var bean = __.newBean('com.enonic.app.oidcidprovider.PortalRequestBean');
    bean.storeContext(params.state, params.nonce, params.originalUrl, params.redirectUri);
}

function removeContext(state) {
    var bean = __.newBean('com.enonic.app.oidcidprovider.PortalRequestBean');
    return __.toNativeObject(bean.removeContext(state));
}

exports.getRequestUrl = getRequestUrl;
exports.storeContext = storeContext;
exports.removeContext = removeContext;