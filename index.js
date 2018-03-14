'use strict'

const fs = require('fs')
    , URL = require('url')

function download(url, dest, options) {
  options = options || {}
  url = URL.parse(url)

  const progress = options.progress || options

  return new Promise((resolve, reject) => {
    fs.stat(dest, (err, stat) => {
      if (err && err.code !== 'ENOENT')
        return reject(err)

      let start = stat ? stat.size : 0

      const req = require(url.protocol.slice(0, -1)).request(Object.assign({
        method: options.method || 'GET',
        headers: Object.assign({ Range: 'bytes=' + start + '-' }, options.headers)
      }, url), res => {
        if (res.headers.location)
          return resolve(download(res.headers.location, dest, options))

        if (res.statusCode >= 400)
          return reject(new Error('InvalidStatusCode:' + res.statusCode))

        options.onresponse && options.onresponse(res)

        if (!res.headers['content-range'])
          start = 0

        const file = fs.createWriteStream(dest, {
          flags: start ? 'r+' : 'w',
          start
        })

        file.on('error', e => {
          req.abort()
          reject(e)
        })

        const length = parseInt(res.headers['content-length'], 10)

        let downloaded = start

        res.on('data', chunk => {
          downloaded += chunk.length
          typeof progress === 'function' && progress(downloaded, (length + start))
          file.write(chunk)
        })

        res.on('end', () => {
          file.end()
          resolve()
        })
      })

      options.onrequest && options.onrequest(req)

      req.on('error', reject)
      req.on('close', reject)
      req.on('timeout', () => (req.abort(), reject(new Error('Timeout'))))
      req.on('abort', () => reject(new Error('Aborted')))
      req.setTimeout(30 * 1000)
      req.end()
    })
  })
}

module.exports = download
