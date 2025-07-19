function willError() {
  throw new Error('This is an error thrown from a function')
}
function callWillError() {
  willError()
}


requestAnimationFrame(willError)
window.addEventListener('error', (event) => {
  console.error('Caught an error:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('Caught an unhandled promise rejection:', event.reason)
})

// Example of an unhandled promise rejection
Promise.reject('This is an unhandled promise rejection')

async function asyncWillError() {
  throw new Error('This is an error from an async function')
}
asyncWillError()

callWillError()
