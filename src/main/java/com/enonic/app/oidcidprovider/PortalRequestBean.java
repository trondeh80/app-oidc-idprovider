package com.enonic.app.oidcidprovider;


import java.util.Map;

import javax.servlet.http.HttpSession;

import com.google.common.collect.ImmutableMap;

import com.enonic.app.oidcidprovider.mapper.ContextMapper;
import com.enonic.xp.portal.PortalRequest;
import com.enonic.xp.script.bean.BeanContext;
import com.enonic.xp.script.bean.ScriptBean;
import com.enonic.xp.web.servlet.ServletRequestUrlHelper;

public class PortalRequestBean
    implements ScriptBean
{
    private static final String CONTEXT_KEY = "com.enonic.app.oidcidprovider.context";

    private PortalRequest portalRequest;

    public String getRequestUrl()
    {
        return ServletRequestUrlHelper.getFullUrl( this.portalRequest.getRawRequest() );
    }

    public void storeContext( final String state, final String nonce, final String originalUrl, final String redirectUri )
    {
        final ImmutableMap.Builder<String, Context> contextMap = ImmutableMap.builder();

        final HttpSession session = portalRequest.getRawRequest().getSession( true );
        Map<String, Context> existingContextMap = (Map<String, Context>) session.getAttribute( CONTEXT_KEY );
        if ( existingContextMap != null )
        {
            contextMap.putAll( existingContextMap );
        }

        final Context context = Context.create().
            state( state ).
            nonce( nonce ).
            originalUrl( originalUrl ).
            redirectUri( redirectUri ).
            build();
        contextMap.put( state, context );

        session.setAttribute( CONTEXT_KEY, contextMap.build() );
    }

    public ContextMapper removeContext( final String state )
    {
        final HttpSession session = portalRequest.getRawRequest().getSession( true );

        final Map<String, Context> contextMap = (Map<String, Context>) session.getAttribute( CONTEXT_KEY );
        final Context context = contextMap == null ? null : contextMap.get( state );

        if ( context != null )
        {
            session.removeAttribute( CONTEXT_KEY );
            return ContextMapper.from( context );
        }

        return null;
    }

    @Override
    public void initialize( final BeanContext context )
    {
        this.portalRequest = context.getBinding( PortalRequest.class ).
            get();
    }
}
