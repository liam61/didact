import { createDomElement, updateDomProperties } from './dom-utils';
import { createInstance } from './component';

// ① performWork
// ② performUnitOfWork
// ③ beginWork
// ④ completeWork (unit for this update)
// ⑤ commitWork

// let fiber = {
//   tag: HOST_COMPONENT,
//   type: "div",
//   parent: parentFiber,
//   child: childFiber,
//   sibling: null,
//   alternate: currentFiber, // link the WIP fibers with their corresponding fibers from the old tree
//   stateNode: document.createElement("div"), // reference to the component instance
//   props: { children: [], className: "foo"},
//   partialState: null,
//   effectTag: PLACEMENT, // PLACEMENT | UPDATE | DELETION
//   effects: [] // 扁平化的子节点数组
// };

// two fiber trees：One tree has already rendered to the DOM, call it the current tree or the old tree
// another build when updating (setState or render, call it the work-in-progress tree
// two trees won’t share any fiber
// Once built the work-in-progress tree and made the needed DOM mutations, it becomes the old tree

// if the updates comes from the first time render() was called, the root will be null
// if it comes from a subsequent call to render(), we can find the root on the _rootContainerFiber property
// if the update comes from a setState(), then go up from the instance fiber until we find a fiber without parent

// Fiber tags
const HOST_COMPONENT = 'host'; // 如图片中的 b p i 标签
const CLASS_COMPONENT = 'class'; // 如 Foo 组件
const HOST_ROOT = 'root';

// Effect tags for update components
const PLACEMENT = 1;
const DELETION = 2;
const UPDATE = 3;

const ENOUGH_TIME = 1;

// Global state
const updateQueue = []; // to keep track of the pending updates
let nextUnitOfWork = null;
// When performUnitOfWork finishes for the current update,
// it leaves the pending changes to the DOM in pendingCommit
let pendingCommit = null;

/**
 *
 * @param {*} elements virtual dom
 * @param {*} containerDom real dom
 */
export function render(elements, containerDom) {
  // example:
  // const { type, props } = element;
  // const dom = type === "TEXT ELEMENT" ? document.createTextNode('') : document.createElement(type);
  // handle events and attrs in props
  // const childElements = props.children || [];
  // childElements.forEach(childElement => render(childElement, dom));
  // parentDom.appendChild(dom);

  debugger;
  updateQueue.push({
    from: HOST_ROOT,
    dom: containerDom,
    newProps: { children: elements },
  });
  requestIdleCallback(performWork);

  // requestIdleCallback(deadline => {
  //   console.log(deadline.timeRemaining(), deadline.didTimeout); // 49.895 false
  // });
}

// for setState
export function scheduleUpdate(instance, partialState) {
  updateQueue.push({
    from: CLASS_COMPONENT,
    instance: instance,
    partialState: partialState,
  });
  requestIdleCallback(performWork);
}

// ①
function performWork(deadline) {
  workLoop(deadline);
  // finish current updating, checks if there’s pending work
  if (nextUnitOfWork || updateQueue.length > 0) {
    requestIdleCallback(performWork);
  }
}

function workLoop(deadline) {
  if (!nextUnitOfWork) {
    resetNextUnitOfWork();
  }

  while (nextUnitOfWork && deadline.timeRemaining() > ENOUGH_TIME) {
    // if work takes more than that, browser will overrun the deadline
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork); // ②
  }
  if (pendingCommit) {
    commitAllWork(pendingCommit); // ⑥
  }
}

// where the first nextUnitOfWork comes from
function resetNextUnitOfWork() {
  const update = updateQueue.shift();
  if (!update) {
    return;
  }

  // Copy the setState parameter from the update payload to the corresponding fiber
  // use it later when we call component’s render()
  if (update.partialState) {
    update.instance.__fiber.partialState = update.partialState;
  }

  const root = update.from == HOST_ROOT ? update.dom._rootContainerFiber : getRoot(update.instance.__fiber);

  // assign a new fiber and this fiber is the root of a new work-in-progress tree
  nextUnitOfWork = {
    tag: HOST_ROOT,
    stateNode: update.dom || root.stateNode,
    props: update.newProps || root.props,
    alternate: root,
  };
}

function getRoot(fiber) {
  let node = fiber;
  while (node.parent) {
    node = node.parent;
  }
  return node;
}

/**
 * 开启一个节点的处理工作
 * build the work-in-progress tree for the update it’s working on
 * and find out what changes we need to apply to the DOM
 * @param {*} wipFiber 当前处理的节点
 * @return 下次 fiber 要继续工作的节点
 */
function performUnitOfWork(wipFiber) {
  beginWork(wipFiber); // ③
  if (wipFiber.child) {
    return wipFiber.child; // 有 child 先深度处理 child
  }

  // No child, we call completeWork until we find a sibling
  // 已深度遍历到最底部，开始处理 completeWork（更新 fiber），处理完后放入 effects 中
  let uow = wipFiber;
  while (uow) {
    completeWork(uow); // ④
    if (uow.sibling) {
      return uow.sibling; // Sibling needs to beginWork
    }
    uow = uow.parent; // 子节点处理完回去继续处理父节点
  }
}

// create the new children of a fiber, and then return the first child so it becomes the nextUnitOfWork
function beginWork(wipFiber) {
  if (wipFiber.tag == CLASS_COMPONENT) {
    updateClassComponent(wipFiber);
  } else {
    updateHostComponent(wipFiber);
  }
}

// handles host components and also the root component
// create a new DOM node if necessary (only one node, without children and without appending it to the DOM)
function updateHostComponent(wipFiber) {
  if (!wipFiber.stateNode) {
    wipFiber.stateNode = createDomElement(wipFiber);
  }

  const newChildElements = wipFiber.props.children; // get child elements
  reconcileChildrenArray(wipFiber, newChildElements);
}

// create a new instance calling constructor if it needs to
// It updates the instance’s props and state so it can call the render() function to get the new children
function updateClassComponent(wipFiber) {
  let instance = wipFiber.stateNode;
  if (instance == null) {
    // Call class constructor
    instance = wipFiber.stateNode = createInstance(wipFiber);
  } else if (wipFiber.props == instance.props && !wipFiber.partialState) {
    // No need to render, clone children from last time
    cloneChildFibers(wipFiber);
    return;
  }

  instance.props = wipFiber.props;
  // 取出缓存的 partialState（update 时）
  instance.state = Object.assign({}, instance.state, wipFiber.partialState);
  wipFiber.partialState = null;

  // this can validates if it makes sense to call render(), so it is a simple shouldComponentUpdate()
  // If don’t need to re-render, just clone the current sub-tree to the WIP tree without any reconciliation
  const newChildElements = wipFiber.stateNode.render();
  reconcileChildrenArray(wipFiber, newChildElements);
}

function arrify(val) {
  return val == null ? [] : Array.isArray(val) ? val : [val];
}

function reconcileChildrenArray(wipFiber, newChildElements) {
  const elements = arrify(newChildElements);

  let index = 0;
  // the children from the old fiber tree are wipFiber.alternate.child
  // the new elements are wipFiber.props.children or from calling wipFiber.stateNode.render()
  // algorithm works by matching the first old fiber with the first child element (elements[0]) and so on pair
  let oldFiber = wipFiber.alternate ? wipFiber.alternate.child : null;
  let newFiber = null;
  while (index < elements.length || oldFiber != null) {
    const prevFiber = newFiber;
    const element = index < elements.length && elements[index];
    const sameType = oldFiber && element && element.type == oldFiber.type;

    // have the same type, we can keep the old stateNode and create a new fiber based on the old one
    if (sameType) {
      newFiber = {
        type: oldFiber.type,
        tag: oldFiber.tag,
        stateNode: oldFiber.stateNode,
        props: element.props,
        parent: wipFiber,
        alternate: oldFiber,
        partialState: oldFiber.partialState,
        effectTag: UPDATE, // add update effectTag and append the new fiber to the WIP tree.
      };
    }

    // different type or don’t have an oldFiber (because we have more new children than old children)
    // we create a new fiber by the element
    // 第一次渲染 app 走这里
    if (element && !sameType) {
      newFiber = {
        type: element.type,
        tag: typeof element.type === 'string' ? HOST_COMPONENT : CLASS_COMPONENT,
        props: element.props,
        parent: wipFiber,
        effectTag: PLACEMENT,
      };
    }

    // different type or there isn’t any element for this oldFiber (because we have more old children than new children)
    // this fiber is not part of WIP tree and add it now to the wipFiber.effects list so we don’t lose track of it
    if (oldFiber && !sameType) {
      oldFiber.effectTag = DELETION; // tag DELETION
      wipFiber.effects = wipFiber.effects || [];
      wipFiber.effects.push(oldFiber);
    }

    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }

    if (index == 0) {
      wipFiber.child = newFiber;
    } else if (prevFiber && element) {
      prevFiber.sibling = newFiber;
    }

    index++;
  }
}

// clones each of the wipFiber.alternate children and appends them to the WIP tree
// don’t need to add any effectTag
function cloneChildFibers(parentFiber) {
  const oldFiber = parentFiber.alternate;
  if (!oldFiber.child) {
    return;
  }

  let oldChild = oldFiber.child;
  let prevChild = null;
  while (oldChild) {
    const newChild = {
      type: oldChild.type,
      tag: oldChild.tag,
      stateNode: oldChild.stateNode,
      props: oldChild.props,
      partialState: oldChild.partialState,
      alternate: oldChild,
      parent: parentFiber,
    };
    if (prevChild) {
      prevChild.sibling = newChild;
    } else {
      parentFiber.child = newChild;
    }
    prevChild = newChild;
    oldChild = oldChild.sibling;
  }
}

// when a wipFiber doesn’t have new children or when we already completed the work of all the children
// complete the update for the fiber
function completeWork(fiber) {
  if (fiber.tag == CLASS_COMPONENT) {
    fiber.stateNode.__fiber = fiber;
  }

  if (fiber.parent) {
    const childEffects = fiber.effects || [];
    const thisEffect = fiber.effectTag != null ? [fiber] : [];
    const parentEffects = fiber.parent.effects || [];
    fiber.parent.effects = parentEffects.concat(childEffects, thisEffect);
  } else {
    // root of the work-in-progress tree
    // workLoop() can call commitAllWork()
    pendingCommit = fiber;
  }
}

// take the effects from pendingCommit and mutate the DOM
function commitAllWork(fiber) {
  fiber.effects.forEach(f => commitWork(f)); // 调用深度优先遍历的扁平化数组，提交每个 fiber work
  // WIP tree stops being the WIP tree and becomes the old tree
  // assign its root to _rootContainerFiber
  fiber.stateNode._rootContainerFiber = fiber;
  nextUnitOfWork = null;
  pendingCommit = null;
}

// dom 操作
function commitWork(fiber) {
  if (fiber.tag == HOST_ROOT) {
    return;
  }

  let domParentFiber = fiber.parent;
  // 必需找到当前 fiber 的最近非 Class 的 parent fiber，这样才能获取到 stateNode 进行 dom 操作
  while (domParentFiber.tag == CLASS_COMPONENT) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.stateNode;

  if (fiber.effectTag == PLACEMENT && fiber.tag == HOST_COMPONENT) {
    // PLACEMENT: look for the parent DOM node and then simply append the fiber’s stateNode
    domParent.appendChild(fiber.stateNode);
  } else if (fiber.effectTag == UPDATE) {
    // UPDATE: pass the stateNode together with the old and new props
    // let updateDomProperties() decide what to update
    updateDomProperties(fiber.stateNode, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag == DELETION) {
    // DELETION: for host component, just call removeChild()
    // for class component, first find all the host components from the fiber sub-tree that need to be removed
    // and then calling removeChild()
    commitDeletion(fiber, domParent);
  }
}

function commitDeletion(fiber, domParent) {
  let node = fiber;
  while (true) {
    if (node.tag == CLASS_COMPONENT) {
      node = node.child;
      continue;
    }
    domParent.removeChild(node.stateNode);
    while (node != fiber && !node.sibling) {
      node = node.parent;
    }
    if (node == fiber) {
      return;
    }
    node = node.sibling;
  }
}
