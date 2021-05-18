import { newCache } from '/lib/cache';

const cache = newCache({
    size:   100,
    expire: 60 * 55 // 50 minutes (10 minutes less than dynamics token lifetime.)
});

export default cache;
