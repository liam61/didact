import React, { render, Component } from '../../src/didact';

class App extends Component {
  constructor() {
    super();
    this.state = { count: 0 };
  }

  handleClick = () => this.setState({ count: this.state.count + 1 });

  render() {
    return (
      <div>
        <div>this is div and the state count is: {this.state.count}</div>
        <button onClick={this.handleClick}>increase count</button>
      </div>
    );
  }
}

render(<App />, document.getElementById('app'));
