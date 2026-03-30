'use client'

import { useEffect } from 'react'
import useSWR from 'swr'
import type { FounderJourney } from '@/lib/types/founder-dna'
import { fetchJson } from '@/lib/api/fetch-json'

const JOURNEY_KEY = '/api/founder-dna/journey'

export function useFounderJourney() {
  const { data, error, isLoading, mutate } = useSWR<FounderJourney>(
    JOURNEY_KEY,
    (url) => fetchJson<FounderJourney>(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 120_000,
      keepPreviousData: true,
    },
  )

  useEffect(() => {
    const handleSync = () => {
      void mutate()
    }
    window.addEventListener('data-sync-request', handleSync)
    return () => window.removeEventListener('data-sync-request', handleSync)
  }, [mutate])

  return {
    data: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    mutate,
  }
}

export type FounderJourneyQueryState = ReturnType<typeof useFounderJourney>
