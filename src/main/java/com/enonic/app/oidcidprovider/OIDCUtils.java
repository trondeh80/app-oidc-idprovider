package com.enonic.app.oidcidprovider;

import java.math.BigInteger;
import java.security.SecureRandom;
import java.text.ParseException;

import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.JWTParser;

import com.enonic.app.oidcidprovider.mapper.ClaimSetMapper;

public class OIDCUtils
{
    public static String generateToken()
    {
        return new BigInteger( 130, new SecureRandom() ).
            toString( 32 );
    }

    public static ClaimSetMapper parseJWT( final String s )
        throws ParseException
    {
        final JWTClaimsSet jwtClaimsSet = JWTParser.parse( s ).
            getJWTClaimsSet();
        return ClaimSetMapper.create().
            claimSet( jwtClaimsSet ).
            build();
    }
}
