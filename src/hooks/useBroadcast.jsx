import { useEffect, useRef, useState } from 'react'

const CHANNEL_NAME = 'bahun-swarm-channel'
const PRESENCE_INTERVAL_MS = 2000
const PRESENCE_TIMEOUT_MS = 6000

export function useBroadcast({ onBestRoute, onBlockedEdge }) {
	const tabIdRef = useRef(`tab-${Math.random().toString(36).slice(2, 10)}`)
	const presenceRef = useRef(new Map())
	const channelRef = useRef(null)
	const [activeTabs, setActiveTabs] = useState(1)

	useEffect(() => {
		if (typeof BroadcastChannel === 'undefined') {
			return undefined
		}

		const channel = new BroadcastChannel(CHANNEL_NAME)
		channelRef.current = channel
		let isClosed = false

		const safePost = (message) => {
			if (isClosed) {
				return
			}
			try {
				channel.postMessage(message)
			} catch {
				// Ignore races during teardown in StrictMode/dev.
			}
		}

		const upsertPresence = (id) => {
			presenceRef.current.set(id, Date.now())
			setActiveTabs(Math.max(1, presenceRef.current.size))
		}

		const prunePresence = () => {
			const now = Date.now()
			for (const [id, timestamp] of presenceRef.current) {
				if (now - timestamp > PRESENCE_TIMEOUT_MS) {
					presenceRef.current.delete(id)
				}
			}
			setActiveTabs(Math.max(1, presenceRef.current.size))
		}

		const handleMessage = (event) => {
			const { type, from, payload } = event.data ?? {}
			if (!type || from === tabIdRef.current) {
				return
			}

			if (type === 'TAB_JOIN' || type === 'TAB_PING') {
				upsertPresence(from)
				return
			}

			if (type === 'TAB_LEAVE') {
				presenceRef.current.delete(from)
				setActiveTabs(Math.max(1, presenceRef.current.size))
				return
			}

			if (type === 'BEST_ROUTE') {
				onBestRoute?.(payload)
				return
			}

			if (type === 'BLOCK_EDGE') {
				onBlockedEdge?.(payload)
			}
		}

		presenceRef.current.set(tabIdRef.current, Date.now())
		setActiveTabs(1)
		channel.addEventListener('message', handleMessage)
		safePost({ type: 'TAB_JOIN', from: tabIdRef.current })

		const timer = setInterval(() => {
			presenceRef.current.set(tabIdRef.current, Date.now())
			safePost({ type: 'TAB_PING', from: tabIdRef.current })
			prunePresence()
		}, PRESENCE_INTERVAL_MS)

		const onUnload = () => {
			safePost({ type: 'TAB_LEAVE', from: tabIdRef.current })
		}
		window.addEventListener('beforeunload', onUnload)

		return () => {
			isClosed = true
			clearInterval(timer)
			window.removeEventListener('beforeunload', onUnload)
			safePost({ type: 'TAB_LEAVE', from: tabIdRef.current })
			channel.removeEventListener('message', handleMessage)
			channelRef.current = null
			channel.close()
		}
	}, [onBestRoute, onBlockedEdge])

	function publishBestRoute(payload) {
		const channel = channelRef.current
		if (!channel) {
			return
		}
		try {
			channel.postMessage({ type: 'BEST_ROUTE', from: tabIdRef.current, payload })
		} catch {
			// Ignore if channel closed between render and publish.
		}
	}

	function publishBlockedEdge(payload) {
		const channel = channelRef.current
		if (!channel) {
			return
		}
		try {
			channel.postMessage({ type: 'BLOCK_EDGE', from: tabIdRef.current, payload })
		} catch {
			// Ignore if channel closed between render and publish.
		}
	}

	return {
		activeTabs,
		publishBestRoute,
		publishBlockedEdge,
	}
}
