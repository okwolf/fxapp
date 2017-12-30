import { h, app } from "../src"

beforeEach(() => {
  document.body.innerHTML = ""
})

test("oncreate", done => {
  const view = () =>
    h(
      "div",
      {
        oncreate(element) {
          element.className = "foo"
          expect(document.body.innerHTML).toBe(`<div class="foo">foo</div>`)
          done()
        }
      },
      "foo"
    )

  app({}, {}, view)
})

test("onupdate", done => {
  const state = { value: "foo" }
  const actions = {
    setValue: value => ({ value })
  }

  const view = (state, actions) =>
    h(
      "div",
      {
        class: state.value,
        oncreate() {
          actions.setValue("bar")
        },
        onupdate(element, oldProps) {
          expect(element.textContent).toBe("bar")
          expect(oldProps.class).toBe("foo")
          done()
        }
      },
      state.value
    )

  app(state, actions, view)
})

test("onremove", done => {
  const state = {
    value: true
  }

  const actions = {
    toggle: () => state => ({ value: !state.value })
  }

  const view = (state, actions) =>
    state.value
      ? h(
          "ul",
          {
            oncreate() {
              expect(document.body.innerHTML).toBe(
                "<ul><li></li><li></li></ul>"
              )
              actions.toggle()
            }
          },
          h("li"),
          h("li", {
            onremove(element, remove) {
              remove()
              expect(document.body.innerHTML).toBe("<ul><li></li></ul>")
              done()
            }
          })
        )
      : h("ul", h("li"))

  app(state, actions, view)
})

test("ondestroy", done => {
  let removed = false

  const state = {
    value: true
  }

  const actions = {
    toggle: () => state => ({ value: !state.value })
  }

  const view = (state, actions) =>
    state.value
      ? h(
          "ul",
          {
            oncreate: () => actions.toggle()
          },
          h("li"),
          h(
            "li",
            h("span", {
              ondestroy() {
                expect(removed).toBe(false)
                done()
              }
            })
          )
        )
      : h("ul", h("li"))

  app(state, actions, view)
})

test("onremove/ondestroy", done => {
  let detached = false

  const state = {
    value: true
  }

  const actions = {
    toggle: () => state => ({ value: !state.value })
  }

  const view = (state, actions) =>
    state.value
      ? h(
          "ul",
          {
            oncreate() {
              actions.toggle()
            }
          },
          h("li"),
          h("li", {
            ondestroy() {
              detached = true
            },
            onremove(element, remove) {
              expect(detached).toBe(false)
              remove()
              expect(detached).toBe(true)
              done()
            }
          })
        )
      : h("ul", h("li"))

  app(state, actions, view)
})

test("event bubbling", done => {
  let count = 0

  const state = {
    value: true
  }

  const actions = {
    toggle: () => state => ({ value: !state.value })
  }

  const view = (state, actions) =>
    h(
      "main",
      {
        oncreate() {
          expect(count++).toBe(3)
          actions.toggle()
        },
        onupdate() {
          expect(count++).toBe(7)
          done()
        }
      },
      h("p", {
        oncreate() {
          expect(count++).toBe(2)
        },
        onupdate() {
          expect(count++).toBe(6)
        }
      }),
      h("p", {
        oncreate() {
          expect(count++).toBe(1)
        },
        onupdate() {
          expect(count++).toBe(5)
        }
      }),
      h("p", {
        oncreate() {
          expect(count++).toBe(0)
        },
        onupdate() {
          expect(count++).toBe(4)
        }
      })
    )

  app(state, actions, view)
})
