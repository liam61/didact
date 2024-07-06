// example:
// const element = {
//   type: "div",
//   props: {
//     id: "container",
//     children: [
//       { type: "input", props: { value: "foo", type: "text" } },
//       {
//         type: "a",
//         props: {
//           href: "/bar",
//           children: [{ type: "TEXT ELEMENT", props: { nodeValue: "bar" } }]
//         }
//       },
//       {
//         type: "span",
//         props: {
//           onClick: e => alert("Hi"),
//           children: [{ type: "TEXT ELEMENT", props: { nodeValue: "click me" } }]
//         }
//       }
//     ]
//   }
// };

// babel -> jsx
// const element = createElement(
//   "div",
//   { id: "container" },
//   createElement("input", { value: "foo", type: "text" }),
//   createElement(
//     "a",
//     { href: "/bar" },
//     "bar"
//   ),
//   createElement(
//     "span",
//     { onClick: e => alert("Hi") },
//     "click me"
//   )
// );
export const TEXT_ELEMENT = 'TEXT ELEMENT';

/**
 * 
 * @param {*} type 元素类型
 * @param {*} config props
 * @param  {...any} args children
 */
export function createElement(type, config, ...args) {
  const props = Object.assign({}, config);
  const hasChildren = args.length > 0;
  const rawChildren = hasChildren ? [].concat(...args) : [];
  props.children = rawChildren
    .filter(c => c != null && c !== false)
    .map(c => (c instanceof Object ? c : createTextElement(c)));
  return { type, props }; // 转换为 react element
}

function createTextElement(value) {
  return createElement(TEXT_ELEMENT, { nodeValue: value });
}
