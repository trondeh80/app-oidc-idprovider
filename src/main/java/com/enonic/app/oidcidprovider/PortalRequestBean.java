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

    private static final String REDIRECTURI_KEY = "com.enonic.app.oidcidprovider.redirectUri";

    private static final String ORIGINALURL_KEY = "com.enonic.app.oidcidprovider.originalUrl";

    private PortalRequest portalRequest;

    public String getRequestUrl()
    {
        return ServletRequestUrlHelper.getFullUrl( this.portalRequest.getRawRequest() );
    }

    public void storeContext( final String state, final String nonce, final String originalUrl, final String redirectUri )
    {
        final HttpSession session = portalRequest.getRawRequest().getSession( true );
        session.setAttribute( STATE_KEY, state );
        session.setAttribute( NONCE_KEY, nonce );
        session.setAttribute( ORIGINALURL_KEY, originalUrl );
        session.setAttribute( REDIRECTURI_KEY, redirectUri );
    }

    public Context removeContext()
    {
        final HttpSession session = portalRequest.getRawRequest().getSession( true );
        final Context context = Context.create().
            state( (String) session.getAttribute( STATE_KEY ) ).
            nonce( (String) session.getAttribute( NONCE_KEY ) ).
            originalUrl( (String) session.getAttribute( ORIGINALURL_KEY ) ).
            redirectUri( (String) session.getAttribute( REDIRECTURI_KEY ) ).
            build();
        session.removeAttribute( STATE_KEY );
        session.removeAttribute( NONCE_KEY );
        session.removeAttribute( ORIGINALURL_KEY );
        session.removeAttribute( REDIRECTURI_KEY );
        return context;
    }

    @Override
    public void initialize( final BeanContext context )
    {
        this.portalRequest = context.getBinding( PortalRequest.class ).
            get();
    }
}
