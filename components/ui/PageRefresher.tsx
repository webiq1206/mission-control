'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function PageRefresher() {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 30000)
    return () => clearInterval(t)
  }, [router])
  return null
}
