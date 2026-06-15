import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const fallbackSiteUrl = 'http://quran.louayegafaiti.work'
const rawSiteUrl =
  process.env.SITE_URL ||
  process.env.VITE_SITE_URL ||
  process.env.npm_package_homepage ||
  fallbackSiteUrl

const siteUrl = rawSiteUrl.replace(/\/+$/, '')
const distDir = resolve('dist')
const today = new Date().toISOString().slice(0, 10)

const urls = [
  { loc: `${siteUrl}/`, priority: '1.0' },
  ...Array.from({ length: 114 }, (_, index) => ({
    loc: `${siteUrl}/?surah=${index + 1}`,
    priority: index === 0 ? '0.9' : '0.8',
  })),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

const robots = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`

await mkdir(distDir, { recursive: true })
await writeFile(resolve(distDir, 'sitemap.xml'), sitemap, 'utf8')
await writeFile(resolve(distDir, 'robots.txt'), robots, 'utf8')

const indexPath = resolve(distDir, 'index.html')
const indexHtml = await readFile(indexPath, 'utf8')
await writeFile(indexPath, indexHtml.replaceAll(fallbackSiteUrl, siteUrl), 'utf8')
