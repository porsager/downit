'use strict'

const https = require('https')
    , fs = require('fs')
    , URL = require('url')

function download(url, dest, progress) {
  return new Promise((resolve, reject) => {
    fs.stat(dest, (err, stat) => {
      if (err && err.code !== 'ENOENT')
        return reject(err)

      let start = stat ? stat.size : 0

      const req = https.request(Object.assign({
        method: 'GET',
        headers: { Range: 'bytes=' + start + '-' }
      }, URL.parse(url)), res => {
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

        res.on('end', resolve)
      })

      req.on('error', reject)
      req.on('close', reject)
      req.on('timeout', () => { req.abort() })
      req.setTimeout(30 * 1000)
      req.end()
    })
  })
}

module.exports = download
