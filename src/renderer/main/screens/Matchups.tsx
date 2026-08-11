import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CivMeta } from './CivMeta'

/** Deep-link the Counter Lab without duplicating the large Civ Meta screen. */
export function Matchups() {
  const [searchParams, setSearchParams] = useSearchParams()
  useEffect(() => {
    if (searchParams.get('tab') === 'matchups') return
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'matchups')
    if (!next.get('ladder')) next.set('ladder', 'rm_solo')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])
  return <CivMeta />
}
