'use strict'

const fs = require('fs')
    , URL = require('url')

function download(url, dest, options) {
  options = options || {}
  const progress = options.progress || options
      , parsedUrl = URL.parse(url)

  return new Promise((resolve, reject) => {
    fs.stat(dest, (err, stat) => {
      if (err && err.code !== 'ENOENT')
        return reject(err)

      let start = (stat && stat.size) ? stat.size - 1 : 0

      const req = require(parsedUrl.protocol.slice(0, -1)).request(Object.assign({
        method: options.method || 'GET',
        headers: Object.assign({ Range: 'bytes=' + start + '-' }, options.headers)
      }, parsedUrl), res => {
        options.onresponse && options.onresponse(res)

        if (res.statusCode === 416 && res.headers['content-range'] && res.headers['content-range'].slice(-2) !== '/0')
          return fs.unlink(dest, () => resolve(download(url, dest, options)))

        if (res.statusCode >= 400)
          return reject(new Error('InvalidStatusCode:' + res.statusCode))

        if (res.headers.location)
          return resolve(download(res.headers.location, dest, options))

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

        const length = parseInt(res.headers['content-length'], 10)

        let downloaded = start

        res.on('data', chunk => {
          downloaded += chunk.length
          typeof progress === 'function' && progress(downloaded, (length + start))
          file.write(chunk)
        })

        res.on('end', () => file.end())
        file.on('finish', () =>
          res.complete
            ? resolve()
            : reject(new Error('IncompleteResponse'))
        )
      })

      options.onrequest && options.onrequest(req)

      req.on('error', reject)
      req.on('timeout', () => (req.abort(), reject(new Error('Timeout'))))
      req.on('abort', () => reject(new Error('Aborted')))
      req.setTimeout(30 * 1000)
      req.end()
    })
  })
}

module.exports = download
