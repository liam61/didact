## Diff 算法

**核心是复用**

为了减少 DOM 操作，react 会对 2 次遍历的结果做 diff，尽量复用 dom，提高性能

### 阶段

**render 阶段**

- 从 vdom 转换成 fiber，并且对需要 dom 操作的节点打上 effectTag

**commit 阶段**

- 对有标记 effectTag 的 fiber 进行 dom 操作，并执行其 effect 副作用


1. 第一次 reconcile 时，不需要 diff，直接把 vdom 转换成 fiber（最新状态下的 tree）

2. 第二次遍历时，会产生新的 vdom，这时候要和之前 fiber 做对比，并打上 effectTag，如 Placement，Deletion，Update

3. 具体做法是进行 深度 + 广度遍历，然后依次往 parent 回退,


### Diff 算法

1. 只对同层级元素做 diff，如果 dom 在前后两次更新中，跨越了层级，那 react 直接不尝试复用它

2. 如果元素的 element tag 进行了改变，则直接忽略节点及其子树

3. 开发者可以通过 key 按时哪些子元素在变更下可以保持稳定，
