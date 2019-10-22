package com.enonic.app.oidcidprovider;

import com.enonic.xp.script.serializer.MapGenerator;
import com.enonic.xp.script.serializer.MapSerializable;

public class Context
    implements MapSerializable
{
    private final String state;

    private final String nonce;

    private final String originalUrl;

    private final String redirectUri;

    private Context( final Builder builder )
    {
        state = builder.state;
        nonce = builder.nonce;
        originalUrl = builder.originalUrl;
        redirectUri = builder.redirectUri;
    }

    public static Builder create()
    {
        return new Builder();
    }

    @Override
    public void serialize( final MapGenerator gen )
    {
        gen.value( "state", state );
        gen.value( "nonce", nonce );
        gen.value( "originalUrl", originalUrl );
        gen.value( "redirectUri", redirectUri );
    }

    public static final class Builder
    {
        private String state;

        private String nonce;

        private String originalUrl;

        private String redirectUri;

        private Builder()
        {
        }

        public Builder state( final String state )
        {
            this.state = state;
            return this;
        }

        public Builder nonce( final String nonce )
        {
            this.nonce = nonce;
            return this;
        }

        public Builder originalUrl( final String originalUrl )
        {
            this.originalUrl = originalUrl;
            return this;
        }

        public Builder redirectUri( final String redirectUri )
        {
            this.redirectUri = redirectUri;
            return this;
        }

        public Context build()
        {
            return new Context( this );
        }
    }
}
