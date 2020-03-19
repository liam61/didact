import React from '../didact'
const { render, useState } = React

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      {/* <div>count: {count < 3 ? <Aa count={count} /> : null}</div> */}
      {/* <button onClick={() => setCount(c => c + 1)}> */}
      <button onClick={() => setCount(count + 1)}>increase count</button>
    </div>
  )
}

// function Aa({ count }) {
//   return <Bb count={count} />
// }

// function Bb({ count }) {
//   return <span>{count}</span>
// }

debugger
render(<App />, document.getElementById('root'))
