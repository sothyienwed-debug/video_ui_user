import { createReadStream, existsSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { createServer } from 'node:http'

const port = Number(process.env.PORT) || 4173
const root = join(process.cwd(), 'dist')

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
}

createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname)
  const requestedPath = normalize(urlPath === '/' ? '/index.html' : urlPath)
  const filePath = join(root, requestedPath)
  const safePath = filePath.startsWith(root) && existsSync(filePath) ? filePath : join(root, 'index.html')
  const stream = createReadStream(safePath)

  response.setHeader('Content-Type', mimeTypes[extname(safePath)] || 'application/octet-stream')
  stream.on('error', () => {
    response.statusCode = 404
    response.end('Not found')
  })
  stream.pipe(response)
}).listen(port, () => {
  console.log(`TeensTH page running at http://127.0.0.1:${port}`)
})
