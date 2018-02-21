const https = require('https')
    , fs = require('fs')
    , URL = require('url')

function download(url, dest, progress) {
  const stat = fs.existsSync(dest) && fs.statSync(dest)
      , start = stat ? stat.size : 0

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest, {
      flags: start ? 'r+' : 'w',
      start
    })

    const req = https.request(Object.assign({
      method: 'GET',
      headers: { Range: 'bytes=' + start + '-' }
    }, URL.parse(url)), res => {
      const length = parseInt(res.headers['content-length'], 10)

      let downloaded = start

      res.on('data', chunk => {
        downloaded += chunk.length
        typeof progress === 'function' && progress(downloaded, (length + start))
        file.write(chunk)
      })

      res.on('end', resolve)
    })

    file.on('error', e => {
      req.abort()
      reject(e)
    })

    req.on('error', reject)
    req.on('close', reject)
    req.on('timeout', () => { req.abort() })
    req.setTimeout(30 * 1000)
    req.end()
  })
}

module.exports = download
