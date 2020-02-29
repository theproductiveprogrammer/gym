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
  schedule: [],
  selected: -1,
  started: false,
  timeleft: 0,
  endtime: 0,
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
      return { ...state, started: false, selected: action.ndx }
    case 'startexercise':
      return start_exercise_1(state)
    case 'timeleft':
      return { ...state, timeleft: action.left }
    case 'timerdone':
      state = { ...state, started: false, selected: action.ndx }
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
    let exercise = state.schedule[state.selected]
    if(exercise.time) {
      let secs = exercise.time.split(':')
      secs = secs[0]*60 + secs[1] * 1
      let end = Date.now() + secs * 1000 + 1000
      return { ...state, started: true, endtime: end }
    } else {
      return { ...state, started: true }
    }
  }
}

function show(store, e) {
  let statusbar = div({ class: 'statusbar' })
  let titlebar = div({ class: 'titlebar' })
  let toolbar = div({ class: 'toolbar' })
  let schedule = div({ class: 'schedule' })
  let err = div({ class: 'err' })
  e.appendChild(statusbar)
  e.appendChild(titlebar)
  e.appendChild(toolbar)
  e.appendChild(schedule)
  e.appendChild(err)

  showStatusbar(store, statusbar)

  store.subscribe((state, oldstate) => {
    showTitlebar(store, state, oldstate, titlebar)
  })

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

function showTitlebar(store, state, oldstate, titlebar) {
  if(state.schedule == oldstate.schedule &&
      state.selected == oldstate.selected) return
  let workout = ""
  let title = ""
  let i = state.selected
  if(i == -1) i = 0
  for(;i >=0;i--) {
    let curr = state.schedule[i]
    if(curr.type == 'workout' && !workout) workout = curr.txt
    if(curr.type == 'title' && !title) title = curr.txt
  }
  if(title && workout) titlebar.innerHTML = `${title} / ${workout}`
  else if(title) titlebar.innerHTML = title
  else if(workout) titlebar.innerHTML = workout
}

function showStatusbar(store, statusbar) {
  let stopwatch = h('span', { class: 'stopwatch' })
  statusbar.append(stopwatch)

  let img = h('img', { src: 'icon-128x128.png' })
  statusbar.append(img)

  let secs = 0;
  show_secs_1(secs, stopwatch)

  setInterval(() => {
    let state = store.getState()
    if(!state.started) return
    secs++
    show_secs_1(secs, stopwatch)
  }, 1000)

  function show_secs_1(secs, stopwatch) {
    let h = Math.floor(secs / 3600)
    secs = secs - h*3600
    let m = Math.floor(secs / 60)
    let s = secs - m*60

    m = m < 10 ? '0' + m : m
    s = s < 10 ? '0' + s : s

    stopwatch.innerHTML = `${h}:${m}:${s}`
  }
}

function showToolbar(store, state, oldstate, toolbar) {
  if(!state.schedule) toolbar.innerHTML = ""
  if(!state.started) toolbar.classList.add('stopped')
  else toolbar.classList.remove('stopped')
  if(state.schedule == oldstate.schedule) return

  let left = div({ class: 'left' })
  toolbar.appendChild(left)
  let right = div({ class: 'right' })
  toolbar.appendChild(right)

  let cont = div( { class: 'btn-cont'} )
  left.appendChild(cont)
  update_btn_1()

  let active = div({ class: 'active' })
  let activeimg = h('img', { src: 'inactive.svg' })
  active.appendChild(activeimg)
  left.appendChild(active)

  let ex = div({ class: 'current-exercise-txt' })
  left.appendChild(ex)
  update_ex_1()

  let repOrTimer = div({ class: 'rep-or-timer' })
  right.appendChild(repOrTimer)

  let weight = div({ class: 'weight' })
  right.appendChild(weight)


  /*

  let cont = div( { class: 'btn-cont'} )
  toolbar.appendChild(cont)
  update_btn_1()
  let ex = div({ class: 'current-exercise' })
  toolbar.appendChild(ex)
  update_ex_1()
  toolbar.appendChild(timer)
  */

  store.subscribe((state, oldstate) => {
    if(oldstate.started == state.started &&
        oldstate.selected == state.selected) return
    update_btn_1()
    update_ex_1()
  })
  store.subscribe((state, oldstate) => {
    if(state.started == oldstate.started) return
    update_active_1(state, oldstate)
  })

  store.subscribe((state, oldstate) => {
    update_timer_1()
  })

  function update_active_1(state) {
    let src = state.started ? 'active.svg' : 'inactive.svg'
    activeimg.src = src
  }

  function update_ex_1() {
    let state = store.getState()
    if(state.selected >= state.schedule.length) return
    let exercise = state.schedule[state.selected]
    if(exercise) {
      ex.innerHTML = exercise.txt
      if(exercise.reps) {
        repOrTimer.innerHTML = exercise.reps + ' reps'
      } else if(exercise.time) {
        repOrTimer.innerHTML = exercise.time
      } else {
        repOrTimer.innerHTML = ""
      }
      if(exercise.weight) {
        weight.innerHTML = exercise.weight + ' kgs'
      } else {
        weight.innerHTML = ""
      }
    } else {
      ex.innerHTML = ""
    }
    /*
    let reps = state.selected.getElementsByClassName('reps')
    if(reps && reps.length) reps = reps[0].innerText
    else reps = ""
    let weight = state.selected.getElementsByClassName('weight')
    if(weight && weight.length) weight = weight[0].innerText
    else weight = ""
    ex.appendChild(div({ class: 'txt' }, txt))
    ex.appendChild(div({ class: 'reps' }, reps))
    ex.appendChild(div({ class: 'weight' }, weight))
    */
  }

  function update_btn_1() {
    cont.innerHTML = ""

    let state = store.getState()
    if(!state.schedule) return

    let btn
    if(!state.started) btn = div({
      class: "btn",
      onclick: start_1,
    }, "Start")
    else if(state.schedule[state.selected].time) btn = div({
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
    let nxt = getNextExercise(state)
    store.dispatch({ type: 'select', ndx: nxt })
    if(nxt != -1) {
      store.dispatch({ type: 'startexercise' })
    } else {
      store.dispatch({ type: 'stoptimer' })
    }
  }

  function start_1() {
    chime()
    let state = store.getState()
    if(state.selected == -1) {
      store.dispatch({ type: 'select', ndx: getNextExercise(state) })
    }
    store.dispatch({ type: 'startexercise' })
  }

  function update_timer_1() {
    let state = store.getState()
    if(state.timeleft) repOrTimer.innerHTML = tm_s_1(state.timeleft)
  }

  function tm_s_1(tm) {
    tm = tm / 1000
    let mins = Math.floor(tm / 60)
    let secs = Math.floor(tm - mins * 60)
    if(secs < 10) secs = '0' + secs
    return `${mins}:${secs}`
  }
}

function getNextExercise(state) {
  let sel = state.selected ? state.selected : 0
  for(let i = sel+1;i < state.schedule.length;i++) {
    let curr = state.schedule[i]
    if(curr.type == 'set') return i
  }
  return -1
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
        onclick: (evt) => store.dispatch({ type: 'select', ndx: i }),
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
      exercise.e = e
      schedule.appendChild(e)
    }
  }
}

function showSelected(store, state, oldstate) {
  if(oldstate.selected == state.selected) return
  let exercise = state.schedule[state.selected]
  let old = oldstate.schedule[oldstate.selected]
  if(old && old.e) old.e.classList.remove('selected')
  if(exercise && exercise.e) exercise.e.classList.add('selected')
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
    let exercise = { type: 'set' }
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
      let nxt = getNextExercise(state)
      chime()
      store.dispatch({ type: 'timerdone', ndx: nxt })
    } else {
      store.dispatch({ type: 'timeleft', left })
      setTimeout(() => step_1(store), 500)
    }
  }
}

function chime() {
  let a = document.getElementById('chime')
  a.play()
}
