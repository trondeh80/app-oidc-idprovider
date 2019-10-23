package com.enonic.app.oidcidprovider.mapper;

import java.util.Map;

import com.nimbusds.jwt.JWTClaimsSet;

import com.enonic.xp.script.serializer.MapGenerator;
import com.enonic.xp.script.serializer.MapSerializable;

public class ClaimSetMapper
    implements MapSerializable
{
    private final JWTClaimsSet claimSet;

    private ClaimSetMapper( final Builder builder )
    {
        claimSet = builder.claimSet;
    }

    public static Builder create()
    {
        return new Builder();
    }

    @Override
    public void serialize( final MapGenerator gen )
    {
        final Map<String, Object> claimMap = claimSet.getClaims();
        for ( Map.Entry<String, Object> claimEntry : claimMap.entrySet() )
        {
            gen.value( claimEntry.getKey(), claimEntry.getValue() );
        }
    }

    public static final class Builder
    {
        private JWTClaimsSet claimSet;

        private Builder()
        {
        }

        public Builder claimSet( final JWTClaimsSet claimSet )
        {
            this.claimSet = claimSet;
            return this;
        }

        public ClaimSetMapper build()
        {
            return new ClaimSetMapper( this );
        }
    }
}
