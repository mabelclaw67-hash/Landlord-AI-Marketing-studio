import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function localVideoProxy() {
  return {
    name: 'local-video-proxy',
    configureServer(server) {
      server.middlewares.use('/.netlify/functions/video-proxy', async (req, res) => {
        try {
          const requestUrl = new URL(req.url || '', 'http://localhost')
          const sourceUrl = String(requestUrl.searchParams.get('url') || '').trim()
          const url = new URL(sourceUrl)
          const allowedHost = url.hostname === 'drive.google.com' || url.hostname === 'drive.usercontent.google.com'
          if (!allowedHost) {
            res.statusCode = 400
            res.end('Unsupported video source')
            return
          }

          const headers = {}
          if (req.headers.range) headers.Range = req.headers.range

          const response = await fetch(url.toString(), { headers, redirect: 'follow' })
          res.statusCode = response.status
          res.setHeader('Content-Type', response.headers.get('content-type') || 'video/mp4')
          res.setHeader('Accept-Ranges', response.headers.get('accept-ranges') || 'bytes')

          const contentLength = response.headers.get('content-length')
          const contentRange = response.headers.get('content-range')
          if (contentLength) res.setHeader('Content-Length', contentLength)
          if (contentRange) res.setHeader('Content-Range', contentRange)

          const buffer = Buffer.from(await response.arrayBuffer())
          res.end(buffer)
        } catch {
          res.statusCode = 400
          res.end('Video proxy failed')
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localVideoProxy()],
})
