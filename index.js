'use strict'

const fs = require('fs')
    , URL = require('url')
    , http = require('http')
    , https = require('https')

function download(url, dest, options) {
  options = options || {}
  const parsedUrl = URL.parse(url)
      , resume = options.resume !== false

  return new Promise((res, rej) => {
    let pending = true

    const resolve = (r) => (pending = false, res(r))
        , reject = (e) => (pending = false, rej(e))

    fs.stat(dest, (err, stat) => {
      if (err && err.code !== 'ENOENT')
        return reject(err)

      let start = (resume && stat && stat.size) ? stat.size - 1 : 0

      const req = (parsedUrl.protocol === 'https:' ? https : http).request(Object.assign(
        { method: 'GET' },
        parsedUrl,
        options,
        { headers: Object.assign({ Range: 'bytes=' + start + '-' }, options.headers) }
      ), res => {
        options.onresponse && options.onresponse(res)

        if (res.statusCode === 416)
          return fs.unlink(dest, () => resolve(pending && download(url, dest, options)))

        if (res.statusCode >= 400)
          return reject(new Error('InvalidStatusCode:' + res.statusCode))

        if (res.headers.location)
          return resolve(pending && download(res.headers.location, dest, options))

        if (!res.headers['content-range'])
          start = 0

        const file = fs.createWriteStream(dest, {
          flags: start ? 'r+' : 'w',
          start
        })

        file.on('error', e => {
          reject(e)
          req.abort()
        })

        const length = res.headers['content-length']
          ? parseInt(res.headers['content-length'], 10)
          : 0

        let downloaded = start

        emitProgress()
        res.on('data', chunk => {
          downloaded += chunk.length
          emitProgress()
          file.write(chunk)
        })

        res.on('end', () => file.end())
        file.on('finish', () => {
          if (!res.complete && pending)
            return resolve(download(url, dest, options))

          emitProgress()
          resolve(dest)
        })

        function emitProgress() {
          typeof options.onprogress === 'function' && options.onprogress(downloaded, Math.max(downloaded, (length + start)))
        }
      })

      options.onrequest && options.onrequest(req)

      req.on('error', reject)
      req.on('timeout', () => (req.abort(), reject(new Error('Timeout'))))
      req.on('abort', () => reject(new Error('Aborted')))
      req.end()
    })
  })
}

module.exports = download
