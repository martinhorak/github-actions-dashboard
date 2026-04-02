import { useEffect, useReducer } from 'react'

/**
 * Forces a re-render every `intervalMs` milliseconds.
 * Used to keep live duration counters ticking.
 */
export function useTimer(intervalMs = 1000): number {
  const [tick, increment] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    const id = setInterval(increment, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])

  return tick
}
