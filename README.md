# Downit - Resume downloads in node

Downit simply downloads a file from a URL to a destination on the disk, resuming previous progress if the server supports the `Range` header.

# Install

```
npm i downit
```

# Usage

### `downit(url, dest, [progress])``

```js
const downit = require('downit')

downit(url, dest, (downloaded, total) => {
  console.log('Got', downloaded, 'bytes of ', total, 'bytes')
}).then(() => {
  console.log('Downed it')
}).catch(e => {
  console.error('Dropped it')
})
```
