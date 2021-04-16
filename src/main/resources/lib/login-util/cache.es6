import { newCache } from '/lib/cache';

const cache = newCache({
    size:   100,
    expire: 60 * 10 // 10 minutes
});

export default cache;
