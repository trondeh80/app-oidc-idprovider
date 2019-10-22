package com.enonic.app.oidcidprovider;


import javax.servlet.http.HttpSession;

import com.enonic.xp.portal.PortalRequest;
import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;
import com.enonic.xp.web.servlet.ServletRequestUrlHelper;

public class PortalRequestBean
    implements ScriptBean
{
    private static final String STATE_KEY = "com.enonic.app.oidcidprovider.state";

    private static final String NONCE_KEY = "com.enonic.app.oidcidprovider.nonce";

    private static final String ORIGINALURL_KEY = "com.enonic.app.oidcidprovider.originalUrl";

    private PortalRequest portalRequest;

    public String getRequestUrl()
    {
        return ServletRequestUrlHelper.getFullUrl( this.portalRequest.getRawRequest() );
    }

    public void storeContext( final String state, final String nonce, final String originalUrl )
    {
        final HttpSession session = portalRequest.getRawRequest().getSession( true );
        session.setAttribute( STATE_KEY, state );
        session.setAttribute( NONCE_KEY, nonce );
        session.setAttribute( ORIGINALURL_KEY, originalUrl );
    }

    @Override
    public void initialize( final BeanContext context )
    {
        this.portalRequest = context.getBinding( PortalRequest.class ).
            get();
    }
}
