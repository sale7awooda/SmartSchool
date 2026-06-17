'use client'

import { useEffect, useState } from 'react'
import { X, Megaphone } from 'lucide-react'
import { getSystemAnnouncementsAction } from '@/app/actions/subscription'

interface Announcement {
  id: string
  title: string
  content: string
  announcement_type: 'banner' | 'popup' | 'both'
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [showPopup, setShowPopup] = useState<Announcement | null>(null)

  useEffect(() => {
    getSystemAnnouncementsAction().then(res => {
      const banners = (res.announcements || []).filter(
        (a: any) => a.announcement_type === 'banner' || a.announcement_type === 'both'
      )
      setAnnouncements(banners)
      // Show first popup if any
      const firstPopup = (res.announcements || []).find(
        (a: any) => a.announcement_type === 'popup' || a.announcement_type === 'both'
      )
      if (firstPopup) {
        const dismissedPopups = JSON.parse(sessionStorage.getItem('dismissed-popups') || '[]')
        if (!dismissedPopups.includes(firstPopup.id)) {
          setShowPopup(firstPopup)
        }
      }
    })
  }, [])

  const dismissBanner = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
  }

  const dismissPopup = () => {
    if (showPopup) {
      const dismissedPopups = JSON.parse(sessionStorage.getItem('dismissed-popups') || '[]')
      dismissedPopups.push(showPopup.id)
      sessionStorage.setItem('dismissed-popups', JSON.stringify(dismissedPopups))
      setShowPopup(null)
    }
  }

  const activeBanners = announcements.filter(a => !dismissed.has(a.id))

  if (activeBanners.length === 0 && !showPopup) return null

  return (
    <>
      {/* Banner announcements */}
      {activeBanners.map(a => (
        <div
          key={a.id}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-800 dark:to-indigo-800 text-white px-4 py-2 flex items-center justify-between gap-2 text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone size={16} className="shrink-0" />
            <span className="font-semibold shrink-0">{a.title}:</span>
            <span className="truncate">{a.content}</span>
          </div>
          <button
            onClick={() => dismissBanner(a.id)}
            className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {/* Popup modal */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in-95">
            <button
              onClick={dismissPopup}
              className="absolute top-3 right-3 p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            >
              <X size={18} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <Megaphone size={20} />
              </div>
              <h3 className="font-semibold text-lg">{showPopup.title}</h3>
            </div>
            <p className="text-muted-foreground whitespace-pre-wrap">{showPopup.content}</p>
            <button
              onClick={dismissPopup}
              className="mt-6 w-full py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
