// 由 babel 翻译 jsx，调用该函数
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object' ? child : createTextElement(child),
      ),
    },
  }
}

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text, // TextNode 类型直接预设 nodeValue
      children: [],
    },
  }
}

function createDom(fiber) {
  const dom =
    fiber.type == 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type)

  updateDom(dom, {}, fiber.props)

  return dom
}

const isEvent = key => key.startsWith('on')
const isProperty = key => key !== 'children' && !isEvent(key)
const isNew = (prev, next) => key => prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)

function updateDom(dom, prevProps, nextProps) {
  // Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ''
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      // 如果为 textNode，会有 nodeValue 属性
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}

function commitRoot() {
  deletions.forEach(commitWork)
  // wipRoot 为 root dom 所在的 fiber，它的 child 为 App fiber
  commitWork(wipRoot.child)
  // alternate root，供 useState 派发新 render 使用
  currentRoot = wipRoot
  wipRoot = null
  window._currentRoot = currentRoot
}

// dom 操作
function commitWork(fiber) {
  if (!fiber) return

  let domParentFiber = fiber.parent
  // 找到最近上游拥有 dom 的 parent fiber（有些 parent fiber 为组件）进行 dom 操作
  while (!domParentFiber.dom) {
    domParentFiber = domParentFiber.parent
  }
  const domParent = domParentFiber.dom

  // 组件 fiber 的 dom 不存在，忽略即可
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom)
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(
      fiber.dom,
      fiber.alternate.props, // prevProps
      fiber.props, // nextProps
    )
  } else if (fiber.effectTag === 'DELETION') {
    commitDeletion(fiber, domParent)
  }

  commitWork(fiber.child)
  commitWork(fiber.sibling)
  // commit child 和 sibling 后，跳到上层递归
}

function commitDeletion(fiber, domParent) {
  if (fiber.dom) {
    domParent.removeChild(fiber.dom)
  } else {
    // 如果为组件 fiber，则用 child 递归
    commitDeletion(fiber.child, domParent)
  }
}

function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element],
    },
    // 将 rootTree 置为 oldTree
    alternate: currentRoot,
  }
  deletions = []
  // wipTree 遍历的同时与 oldTree diff
  nextUnitOfWork = wipRoot
}

let nextUnitOfWork = null
let currentRoot = null
let wipRoot = null
let deletions = null

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork)
    shouldYield = deadline.timeRemaining() < 1
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot()
  }

  requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function
  if (isFunctionComponent) {
    // 组件
    updateFunctionComponent(fiber)
  } else {
    // 普通标签
    updateHostComponent(fiber)
  }

  // has child, perform work with child next
  if (fiber.child) return fiber.child

  let nextFiber = fiber
  while (nextFiber) {
    // has sibling, perform work with sibling next
    if (nextFiber.sibling) {
      return nextFiber.sibling
    }
    // end up with child or sibling, now keep going up
    nextFiber = nextFiber.parent
  }
}

let wipFiber = null
let hookIndex = null

function updateFunctionComponent(fiber) {
  // useState 中会用到，需将 fiber 传出去
  wipFiber = fiber
  // 执行函数前，重置其 hookIndex 和 hooks
  hookIndex = 0
  wipFiber.hooks = []
  // 通过 fiber.type 执行函数，返回 jsx
  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function useState(initial) {
  // 由 updateFunctionComponent，执行 type 进入
  // alternate 即 oldFiber 是在 parent fiber reconcileChildren 时赋值的
  const oldHook =
    wipFiber.alternate && wipFiber.alternate.hooks && wipFiber.alternate.hooks[hookIndex]
  const hook = {
    state: oldHook ? oldHook.state : initial,
    queue: [],
  }

  const actions = oldHook ? oldHook.queue : []
  // 调用 setState 后将在下次渲染时，从 updateFunctionComponent 重新执行函数后进来
  // 这时可获取到之前 queue 中的 action
  actions.forEach(action => {
    hook.state = action(hook.state)
  })

  const setState = action => {
    const wrapAction = typeof action === 'function' ? action : () => action
    hook.queue.push(wrapAction)
    // 从 alternateRoot 开始 render
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
    deletions = []
  }

  wipFiber.hooks.push(hook)
  hookIndex++
  return [hook.state, setState]
}

function updateHostComponent(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber)
  }
  reconcileChildren(fiber, fiber.props.children)
}

// diff and link children fiber
function reconcileChildren(wipFiber, elements) {
  let index = 0
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child
  let prevSibling = null

  while (index < elements.length || oldFiber != null) {
    // TODO: map 之后 element 为数组，不能正确赋值 newFiber
    const element = elements[index]
    let newFiber = null

    const sameType = oldFiber && element && element.type == oldFiber.type // newFiber 创建完后，element 和 oldFiber 都会向兄弟节点移动

    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        props: element.props, // new props
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber, // 保存 oldFiber 备用
        effectTag: 'UPDATE',
      }
    }
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT',
      }
    }
    // element 为空，同时 oldFiber 存在时，则 delete
    if (oldFiber && !sameType) {
      oldFiber.effectTag = 'DELETION'
      deletions.push(oldFiber)
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling
    }

    // link children 类似 reduceRight
    if (index === 0) {
      wipFiber.child = newFiber
    } else if (element) {
      prevSibling.sibling = newFiber
    }

    prevSibling = newFiber
    index++
  }
}

const Didact = {
  createElement,
  render,
  useState,
}

export default Didact
