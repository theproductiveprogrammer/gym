'use strict'

/*    outcome/
 * Create a new element with the given attributes
 * (including classes, inner 'html', and 'onxxx' listeners)
 */
function h(tag, addl, children) {
  if(typeof addl == 'string') addl = { html: addl }
  else if(!addl) addl = {}

  let e = document.createElement(tag)

  for(let k in addl) {
    if(k == 'class' || k == 'classes') e.className = addl[k]
    else if(k.startsWith('on')) {
      e.addEventListener(k.substring(2), addl[k])
    } else if(k == 'html') {
      e.innerHTML = addl[k]
    } else {
      if(addl[k] !== undefined &&
          addl[k] !== null) e.setAttribute(k, addl[k])
    }
  }

  if(children) {
    if(Array.isArray(children.length)) {
      for(let i = 0;i < children.length;i++) {
        e.appendChild(children[i])
      }
    } else if(typeof children == "string") {
      e.innerHTML = children
    } else {
      e.appendChild(children)
    }
  }

  return e
}
function div(addl, children) { return h('div', addl, children) }

/*    problem/
 * We have a button that works as follows:
 *  When nothing is selected
 *      "Start" --> selects and starts the first exercise
 *  When something is selected
 *      "Start" --> starts the exercise
 *  When started
 *      If exercise has timer
 *          "Stop" --> stops the exercise
 *      If exercise does not have timer
 *          "Done" --> Selects the next exercise
 *
 * Starts the exercise timer or just starts the exercise
 * If timer ends, goes to next exercise.
 * If Done, goes to next exercise.
 * If timer stops
 */

let STORE

function gym_init(e) {
  STORE = createStore(reducer)
  show(STORE, e)
  loadSchedule(STORE)

  STORE.subscribe((state, oldstate) => {
    if(oldstate.endtime == state.endtime) return
    countDown(STORE)
  })
}

const initialState = {
}

function reducer(state, action) {
  if(!state) state = initialState
  switch(action.type) {
    case 'loaderr':
      return { ...state, schedule: null, status: action.status }
    case 'loaded':
      return { ...state, schedule: action.schedule }
    case 'select':
      if(state.endtime) return state
      return { ...state, started: false, selected: action.e }
    case 'startexercise':
      return start_exercise_1(state)
    case 'timeleft':
      return { ...state, timeleft: action.left }
    case 'timerdone':
      state = { ...state, started: false, selected: action.e }
      delete state.timeleft
      delete state.endtime
      return start_exercise_1(state)
    case 'stoptimer':
      state = { ...state, started: false }
      delete state.timeleft
      delete state.endtime
    default:
      return state
  }

  function start_exercise_1(state) {
    if(!state.selected) return
    if(state.selected.dataset.time) {
      let secs = state.selected.dataset.time.split(':')
      secs = secs[0]*60 + secs[1] * 1
      let end = Date.now() + secs * 1000 + 1000
      return { ...state, started: true, endtime: end }
    } else {
      return { ...state, started: true }
    }
  }
}

function show(store, e) {
  let toolbar = div({ class: 'toolbar' })
  let schedule = div({ class: 'schedule' })
  let err = div({ class: 'err' })
  e.appendChild(toolbar)
  e.appendChild(schedule)
  e.appendChild(err)

  store.subscribe((state, oldstate) => {
    showToolbar(store, state, oldstate, toolbar)
  })

  store.subscribe((state, oldstate) => {
    showSchedule(store, state, oldstate, schedule)
  })

  store.subscribe((state, oldstate) => {
    showSelected(store, state, oldstate)
  })

  store.subscribe((state, oldstate) => {
    if(state.status != oldstate.status) {
      if(state.status == 200) err.innerHTML = ""
      else err.innerHTML = `Failed to load (${state.status})`
    }
  })
}

function showToolbar(store, state, oldstate, toolbar) {
  if(!state.schedule) toolbar.innerHTML = ""
  if(state.schedule == oldstate.schedule) return

  let cont = div( { class: 'btn-cont'} )
  toolbar.appendChild(cont)
  update_btn_1()
  let timer = div({ class: 'timer' })
  toolbar.appendChild(timer)

  store.subscribe((state, oldstate) => {
    if(oldstate.started == state.started &&
        oldstate.selected == state.selected) return
    update_btn_1()
  })

  store.subscribe((state, oldstate) => {
    update_timer_1()
  })

  function update_btn_1() {
    cont.innerHTML = ""

    let state = store.getState()
    if(!state.schedule) return

    let btn
    if(!state.started) btn = div({
      class: "btn",
      onclick: start_1,
    }, "Start")
    else if(state.selected.dataset.time) btn = div({
      class: "btn",
      onclick: () => store.dispatch({ type: 'stoptimer' })
    }, "Stop")
    else btn = div({
      class: "btn",
      onclick: next_1,
    }, "Done")

    cont.appendChild(btn)
  }

  function next_1() {
    store.dispatch({ type: 'stoptimer' })
    let state = store.getState()
    let e = getNextExercise(state.selected)
    if(e) {
      store.dispatch({ type: 'select', e })
      store.dispatch({ type: 'startexercise' })
    } else {
      store.dispatch({ type: 'select' })
      store.dispatch({ type: 'stoptimer' })
    }
  }

  function start_1() {
    let state = store.getState()
    if(!state.selected) {
      let first = document.getElementsByClassName("exercise")[0]
      store.dispatch({ type: 'select', e: first })
    }
    store.dispatch({ type: 'startexercise' })
  }

  function update_timer_1() {
    timer.innerHTML = ""

    let state = store.getState()
    if(state.timeleft) timer.innerHTML = tm_s_1(state.timeleft)
  }

  function tm_s_1(tm) {
    tm = tm / 1000
    let mins = Math.floor(tm / 60)
    let secs = Math.floor(tm - mins * 60)
    if(secs < 10) secs = '0' + secs
    return `${mins}:${secs}`
  }
}

function getNextExercise(e) {
  while(e) {
    e = e.nextSibling
    if(e.classList.contains("exercise")) return e
  }
}

function showSchedule(store, state, oldstate, schedule) {
  if(!state.schedule) {
    if(state.status && state.status != 200) schedule.innerHTML = ""
    else return schedule.innerHTML = "Loading..."
  }
  if(state.schedule == oldstate.schedule) return

  schedule.innerHTML = ""

  for(let i = 0;i < state.schedule.length;i++) {
    let exercise = state.schedule[i]
    if(exercise.type == 'workout') schedule.appendChild(h('h1', exercise.txt))
    else if(exercise.type == 'title') schedule.appendChild(h('h2', exercise.txt))
    else {
      let e = div({
        class: "exercise",
        "data-time": exercise.time,
        onclick: (evt) => store.dispatch({ type: 'select', e: find_line_1(evt.target) }),
      })
      e.appendChild(h('span', { class: 'txt', html: exercise.txt}))
      if(exercise.time) {
        e.appendChild(h('span', { class: 'time', html: exercise.time }))
      }
      if(exercise.reps) {
        e.appendChild(h('span', { class: 'reps', html: exercise.reps + ' reps' }))
      }
      if(exercise.weight) {
        e.appendChild(h('span', { class: 'weight', html: exercise.weight + ' kgs' }))
      }
      schedule.appendChild(e)
    }
  }

  function find_line_1(e) {
    if(!e) return
    if(e.classList.contains("exercise")) return e
    else return find_line_1(e.parentNode)
  }

}

function showSelected(store, state, oldstate) {
  if(oldstate.selected == state.selected) return
  if(oldstate.selected) oldstate.selected.classList.remove('selected')
  if(state.selected) state.selected.classList.add('selected')
}

/*      outcome/
 * Get a resource from the server
 */
function ajaxGET(url_, cb) {
    let xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) return
        cb(xhr.status, xhr.responseText)
    }

    xhr.open('GET', url_)
    xhr.send()
}

/*      outcome/
 * Post the given data to the server
 */
function ajaxPOST(url_, data, cb) {
    let xhr = new XMLHttpRequest()
    xhr.onreadystatechange = function() {
        if(xhr.readyState !== XMLHttpRequest.DONE) return
        if(xhr.responseText) {
            try {
                let resp = JSON.parse(xhr.responseText)
                cb(xhr.status, resp)
            } catch(e) {
                let resp = { status: xhr.status, responseText: xhr.responseText }
                console.error(e)
                cb(0, resp)
            }
        } else {
            cb(0, {})
        }
    }

    xhr.open('POST', url_)
    xhr.setRequestHeader("Content-Type", "application/json")
    xhr.send(JSON.stringify(data))
}

function loadSchedule(store) {
  ajaxGET('/schedule.txt', (status, schedule) => {
    if(status != 200) store.dispatch({ type: 'loaderr', status })
    else store.dispatch({ type: 'loaded', schedule: make_schedule_1(schedule) })
  })

  /*    understand/
   * The schedule is in the following format:
   *
   * -- Workout
   * # Title
   * 2:45 Timed Workout
   * 6 Reps Workout
   * 2:45 Timed Workout with weight x35
   * 6 Reps Workout with weight x10
   */
  function make_schedule_1(txt) {
    let lines = txt.split(/[\n\r]/g).filter(l => l.trim())
    let schedule = []
    for(let i = 0;i < lines.length;i++) {
      let line = lines[i]
      if(line.startsWith('--')) schedule.push({
        type: 'workout',
        txt: line.replace(/--*/, '').trim()
      })
      else if(line.startsWith('#')) schedule.push({
        type: 'title',
        txt: line.replace('#', '').trim()
      })
      else schedule.push(exercise_1(line))
    }
    return schedule
  }

  /*    outcome/
   * Split the line into words and recognize time, reps, and weights,
   * putting the rest as the exercise text.
   */
  function exercise_1(line) {
    let words = line.split(/ /g)
    let first = words.shift()
    let last = words.pop()
    let exercise = {}
    if(first.indexOf(':') == -1) exercise.reps = first
    else exercise.time = first
    if(last.startsWith('x')) exercise.weight = last
    else words.push(last)
    exercise.txt = words.join(' ')
    return exercise
  }
}

function countDown(store) {
  let state = store.getState()
  if(!state.endtime) return

  setTimeout(() => step_1(store), 500)

  function step_1(store) {
    let state = store.getState()
    if(!state.endtime) return
    let left = state.endtime - Date.now()
    if(left < 0) {
      let e = getNextExercise(state.selected)
      let a = document.getElementById('chime')
      a.play()
      store.dispatch({ type: 'timerdone', e})
    } else {
      store.dispatch({ type: 'timeleft', left })
      setTimeout(() => step_1(store), 500)
    }
  }
}

