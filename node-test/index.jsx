import React from "../didact"
const { render, useState } = React

function App() {
  const [count, setCount] = useState(0)
  // const [list, setList] = useState([3, 5, 7])

  return (
    <div className="app">
      <div>
        {/* this is div and the state count is: {count < 3 ? count : null} */}
        this is div and the state count is: {count < 3 ? <Inner count={count} /> : null}
      </div>
      {/* <button onClick={() => setCount(c => c + 1)}> */}
      <button onClick={() => setCount(count + 1)}>
        increase count
      </button>
      {/* <ul>
        {list.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
      <button onClick={handleChangeList}>
        删除和改变 list
      </button> */}
    </div>
  )
}

function Inner({ count }) {
  return <DblInner count={count} />
}

function DblInner({ count }) {
  return <span>{count}</span>
}

debugger
render(<App />, document.getElementById("root"))
