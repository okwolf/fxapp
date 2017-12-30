export function h() {
  if (typeof arguments[0] === "function") {
    return arguments[0](arguments[1] || {}, arguments[2])
  }
  var vnode = [arguments[0]]
  var i = 1
  if (arguments[i] === Object(arguments[i]) && !Array.isArray(arguments[i])) {
    vnode.push(arguments[i])
    i++
  } else {
    vnode.push({})
  }
  var children = []
  function isValidChild(child) {
    return child && child !== true
  }
  function convertChild(child) {
    return typeof child === "number" ? child + "" : child
  }
  function addChild(child) {
    if (Array.isArray(child)) {
      children.push(child.filter(isValidChild).map(convertChild))
    } else if (isValidChild(child)) {
      children.push(convertChild(child))
    }
  }
  for (; i < arguments.length; i++) {
    addChild(arguments[i])
  }
  vnode.push(children)

  return vnode
}

export function app(state, actions, view, container, patchLock, node) {
  var lifecycle = []
  container = container || document.body
  var root = container && container.children[0]

  repaint(init([], (state = copy(state)), (actions = copy(actions))))

  return actions

  function render(next) {
    patchLock = !patchLock
    next = view(state, actions)

    if (container && next && !patchLock) {
      root = patch(container, root, node, (node = next))
    }

    while ((next = lifecycle.pop())) {
      next()
    }
  }

  function repaint() {
    if (!patchLock) {
      patchLock = !patchLock
      setTimeout(render)
    }
  }

  function copy(a, b, target) {
    target = {}

    for (var i in a) target[i] = a[i]
    for (var i in b) target[i] = b[i]

    return target
  }

  function set(path, value, source, target) {
    if (path.length) {
      target[path[0]] =
        1 < path.length ? set(path.slice(1), value, source[path[0]], {}) : value
      return copy(source, target)
    }
    return value
  }

  function get(path, source) {
    for (var i = 0; i < path.length; i++) {
      source = source[path[i]]
    }
    return source
  }

  function init(path, slice, actions) {
    for (var key in actions) {
      typeof actions[key] === "function"
        ? (function(key, action) {
            actions[key] = function(data) {
              slice = get(path, state)

              if (typeof (data = action(data)) === "function") {
                data = data(slice, actions)
              }

              if (data && data !== slice && !data.then) {
                repaint((state = set(path, copy(slice, data), state, {})))
              }

              return data
            }
          })(key, actions[key])
        : init(
            path.concat(key),
            (slice[key] = slice[key] || {}),
            (actions[key] = copy(actions[key]))
          )
    }
  }

  function getKey(node) {
    return node && node[1] ? node[1].key : null
  }

  function setElementProp(element, name, value, oldValue) {
    if (name === "key") {
    } else if (name === "style") {
      for (var i in copy(oldValue, value)) {
        element[name][i] = null == value || null == value[i] ? "" : value[i]
      }
    } else {
      try {
        element[name] = null == value ? "" : value
      } catch (_) {}

      if (typeof value !== "function") {
        if (null == value || false === value) {
          element.removeAttribute(name)
        } else {
          element.setAttribute(name, value)
        }
      }
    }
  }

  function createElement(node, isSVG, element) {
    var name = node[0]
    var props = node[1]
    var children = node[2]
    if (typeof node === "string") {
      element = document.createTextNode(node)
    } else {
      element = (isSVG = isSVG || "svg" === name)
        ? document.createElementNS("http://www.w3.org/2000/svg", name)
        : document.createElement(name)

      if (props.oncreate) {
        lifecycle.push(function() {
          props.oncreate(element)
        })
      }

      for (var i = 0; i < children.length; i++) {
        element.appendChild(createElement(children[i], isSVG))
      }

      for (var name in props) {
        setElementProp(element, name, props[name])
      }
    }
    return element
  }

  function updateElement(element, oldProps, props) {
    for (var name in copy(oldProps, props)) {
      if (
        props[name] !==
        ("value" === name || "checked" === name
          ? element[name]
          : oldProps[name])
      ) {
        setElementProp(element, name, props[name], oldProps[name])
      }
    }

    if (props.onupdate) {
      lifecycle.push(function() {
        props.onupdate(element, oldProps)
      })
    }
  }

  function removeChildren(element, node, props) {
    var children = node[2]
    if ((props = node[1])) {
      for (var i = 0; i < children.length; i++) {
        removeChildren(element.childNodes[i], children[i])
      }

      if (props.ondestroy) {
        props.ondestroy(element)
      }
    }
    return element
  }

  function removeElement(parent, element, node, cb) {
    var props = node[1]
    function done() {
      parent.removeChild(removeChildren(element, node))
    }

    if (props && (cb = props.onremove)) {
      cb(element, done)
    } else {
      done()
    }
  }

  function patch(parent, element, oldNode, node, isSVG, nextSibling) {
    var name = node[0]
    var props = node[1]
    var children = node[2]
    var oldName = oldNode && oldNode[0]
    var oldProps = oldNode && oldNode[1]
    var oldChildren = oldNode && oldNode[2]
    if (node === oldNode) {
    } else if (null == oldNode) {
      element = parent.insertBefore(createElement(node, isSVG), element)
    } else if (name && name === oldName) {
      updateElement(element, oldProps, props)

      var oldElements = []
      var oldKeyed = {}
      var newKeyed = {}

      for (var i = 0; i < oldChildren.length; i++) {
        oldElements[i] = element.childNodes[i]

        var oldChild = oldChildren[i]
        var oldKey = getKey(oldChild)

        if (null != oldKey) {
          oldKeyed[oldKey] = [oldElements[i], oldChild]
        }
      }

      var i = 0
      var j = 0

      while (j < children.length) {
        var oldChild = oldChildren[i]
        var newChild = children[j]

        var oldKey = getKey(oldChild)
        var newKey = getKey(newChild)

        if (newKeyed[oldKey]) {
          i++
          continue
        }

        if (null == newKey) {
          if (null == oldKey) {
            patch(element, oldElements[i], oldChild, newChild, isSVG)
            j++
          }
          i++
        } else {
          var recyledNode = oldKeyed[newKey] || []

          if (oldKey === newKey) {
            patch(element, recyledNode[0], recyledNode[1], newChild, isSVG)
            i++
          } else if (recyledNode[0]) {
            patch(
              element,
              element.insertBefore(recyledNode[0], oldElements[i]),
              recyledNode[1],
              newChild,
              isSVG
            )
          } else {
            patch(element, oldElements[i], null, newChild, isSVG)
          }

          j++
          newKeyed[newKey] = newChild
        }
      }

      while (i < oldChildren.length) {
        var oldChild = oldChildren[i]
        if (null == getKey(oldChild)) {
          removeElement(element, oldElements[i], oldChild)
        }
        i++
      }

      for (var i in oldKeyed) {
        if (!newKeyed[oldKeyed[i][1][1].key]) {
          removeElement(element, oldKeyed[i][0], oldKeyed[i][1])
        }
      }
    } else {
      element = parent.insertBefore(
        createElement(node, isSVG),
        (nextSibling = element)
      )
      removeElement(parent, nextSibling, oldNode)
    }
    return element
  }
}
