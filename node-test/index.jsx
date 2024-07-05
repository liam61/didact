import React from '../didact'
const { render, useState, useEffect } = React

function App() {
  const [count, setCount] = useState(0)
  const [num, setNum] = useState(10)
  const [text, setText] = useState('')

  useEffect(() => {
    console.log('effect', { count, num, text })
  }, [count, text])

  return (
    <div className="app">
      {/* <div>count: {count < 3 ? <Aa count={count} /> : null}</div> */}
      {/* <button onClick={() => setCount(c => c + 1)}> */}
      <button onClick={() => setCount(count + 1)}>count: {count}</button>
      <button onClick={() => setNum(num + 1)}>num: {num}</button>
      <input onInput={ev => setText(ev.target.value)} value={text} />
    </div>
  )
}

// function Aa({ count }) {
//   return <Bb count={count} />
// }

// function Bb({ count }) {
//   return <span>{count}</span>
// }

// debugger
render(<App />, document.getElementById('root'))
