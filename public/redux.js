'use strict'
/*    understand/
 * This is an implementation of the Redux pattern which is the most
 * effective and widely used pattern for data management in an SPA we
 * currently have. Refer https://redux.js.org/
 */
function createStore(reducer) {

  let state
  let listeners = []

  function dispatch(action) {
    let oldstate = state
    state = reducer(state, action)
    listeners.map(l => l(state, oldstate))
  }

  function subscribe(listener) {
    listeners.push(listener)
  }

  function getState() {
    return state
  }

  dispatch({ type: '@@reduX/INIT' })

  return {
    dispatch,
    subscribe,
    getState,
  }
}
