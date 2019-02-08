'use strict'

const fs = require('fs')
    , URL = require('url')
    , http = require('http')
    , https = require('https')

function download(url, dest, options) {
  options = options || {}
  const progress = options.progress || options
      , parsedUrl = URL.parse(url)

  return new Promise((res, rej) => {
    let pending = true

    const resolve = (r) => (pending = false, res(r))
        , reject = (e) => (pending = false, rej(e))

    fs.stat(dest, (err, stat) => {
      if (err && err.code !== 'ENOENT')
        return reject(err)

      let start = (stat && stat.size) ? stat.size - 1 : 0

      const req = (parsedUrl.protocol === 'https:' ? https : http).request(Object.assign({
        method: options.method || 'GET',
        headers: Object.assign({ Range: 'bytes=' + start + '-' }, options.headers)
      }, parsedUrl), res => {
        options.onresponse && options.onresponse(res)

        if (res.statusCode === 416 && res.headers['content-range'] && res.headers['content-range'].slice(-2) !== '/0')
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

        res.on('data', chunk => {
          downloaded += chunk.length
          typeof progress === 'function' && progress(downloaded, Math.max(downloaded, (length + start)))
          file.write(chunk)
        })

        res.on('end', () => file.end())
        file.on('finish', () => {
          resolve(!res.complete && pending && download(url, dest, options))
        })
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
