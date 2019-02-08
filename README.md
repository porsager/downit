# Downit - Resume downloads in node

Downit simply downloads a file from a URL to a destination on the disk, resuming previous progress if the server supports the `Range` header.

# Install

```
npm i downit
```

# Usage

### `downit(url, dest, [options])`

```js
const downit = require('downit')

downit(url, dest, {
  headers: { Authorization: 'Bearer Of Good News' },
  progress: (got, total) => console.log('Got ', got, 'B of ', total, 'B'),
  onrequest: req => { /* The node request instance */ },
  onresponse: res => { /* The node response instance */ }
}).then(() => {
  console.log('Downed it')
}).catch(e => {
  console.error('Dropped it, due to ', e)
})
```

### CLI

Downit also works on the command line.

#### Installation
```
npm i downit -g
```

#### Usage

```
downit url [dest]
```
