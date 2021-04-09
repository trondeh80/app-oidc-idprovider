const subscriptions = [];

export function on(event, fn) {
    const eventFns = subscriptions[event] ?? [];
    eventFns.push(fn);
    const index = eventFns.length - 1;
    subscriptions[event] = eventFns;

    return () =>
        delete subscriptions?.[event]?.[index]; // returns function to unsubscribe.
}

export function trigger(event, data) {
    const eventFns = subscriptions[event] ?? [];
    return eventFns.forEach((fn) => fn(data));
}
