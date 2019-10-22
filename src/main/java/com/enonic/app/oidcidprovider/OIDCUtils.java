package com.enonic.app.oidcidprovider;

import java.math.BigInteger;
import java.security.SecureRandom;

public class OIDCUtils
{
    public static String generateToken()
    {
        return new BigInteger( 130, new SecureRandom() ).
            toString( 32 );
    }
}
