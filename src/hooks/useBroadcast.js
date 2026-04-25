// BroadcastChannel API wrapper for Ring Topology P2P communication
// src/hooks/useBroadcast.js

import { useEffect, useRef } from 'react';

const CHANNEL_NAME = 'aco_swarm';

export function useBroadcast(onReceiveBetter) {
    const channelRef = useRef(null);
    const globalBestRef = useRef({ route: null, dist: Infinity });

    useEffect(() => {
        channelRef.current = new BroadcastChannel(CHANNEL_NAME);

        channelRef.current.onmessage = (e) => {
            const { type, route, dist } = e.data;

            if (type === 'NEW_BEST' && dist < globalBestRef.current.dist) {
                globalBestRef.current = { route, dist };
                onReceiveBetter(route, dist);  // caller decides what to do (inject pheromones)
            }
        };

        return () => channelRef.current.close();  // cleanup on unmount
    }, []);

    function broadcast(route, dist) {
        if (dist >= globalBestRef.current.dist) return;  // don't broadcast if not actually better

        globalBestRef.current = { route, dist };

        channelRef.current.postMessage({
            type: 'NEW_BEST',
            route,
            dist
        });
    }

    return { broadcast };
}