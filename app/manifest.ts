import type { MetadataRoute } from 'next'
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Smart School',
    short_name: 'Smart School',
    description: 'Mobile-first school management system',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#4f46e5',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/logo.svg', sizes: '72x72', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/logo.svg', sizes: '96x96', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/logo.svg', sizes: '128x128', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/logo.svg', sizes: '144x144', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/logo.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/logo.svg', sizes: '256x256', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/logo.svg', sizes: '384x384', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/logo.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
