const THEME_KEY = 'garden-theme'
const SOUND_MUTED_KEY = 'garden-sound-muted'
const LIGHT_THEME = 'light'
const DARK_THEME = 'dark'
// Duration (ms) of the slow overlay used for the automatic day/night cycle
const SLOW_TRANSITION_MS = 3600
const AUDIO_FADE_MS = 320
const AUDIO_FADE_STEP_MS = 40

const isInSitesFolder = () =>
  window.location.pathname.toLowerCase().includes('/sites/')

const soundBasePath = isInSitesFolder() ? '../sounds' : './sounds'
const iconBasePath = isInSitesFolder() ? '../img/emojis' : './img/emojis'

let themeToggleButton = null
let soundToggleButton = null
let controlsContainer = null
let themeInitialized = false
let audioUnlockInitialized = false
let audioUnlocked = false
let isMuted = false
let cabinActive = false

let dayAudio = null
let nightAudio = null
let cabinAudio = null
let pausedThemeAudio = null
let pausedThemeTime = 0
let activeTrack = null
let fadeToken = 0
let retryPlaybackArmed = false
let pendingPlayback = null

function getSavedTheme () {
  return localStorage.getItem(THEME_KEY) || LIGHT_THEME
}

function getSavedMutedState () {
  return localStorage.getItem(SOUND_MUTED_KEY) === 'true'
}

function runThemeTransition (theme, { slow = false } = {}) {
  const html = document.documentElement
  const targetClass = theme === DARK_THEME ? 'theme-to-dark' : 'theme-to-light'
  const duration = slow ? SLOW_TRANSITION_MS : 580

  html.classList.remove('theme-to-dark', 'theme-to-light', 'theme-slow-transition')
  html.classList.add(targetClass)
  if (slow) html.classList.add('theme-slow-transition')

  // Restart animation cleanly on repeated toggles.
  html.classList.remove('theme-transitioning')
  void html.offsetWidth
  html.classList.add('theme-transitioning')

  window.setTimeout(() => {
    html.classList.remove('theme-transitioning', 'theme-to-dark', 'theme-to-light', 'theme-slow-transition')
  }, duration + 50)
}

// Applies the actual CSS class + localStorage changes (no animation).
function applyThemeClasses (theme) {
  const html = document.documentElement
  if (theme === DARK_THEME) {
    html.setAttribute('data-theme', 'dark')
    html.classList.add('dark-mode')
    html.classList.remove('light-mode')
  } else {
    html.setAttribute('data-theme', 'light')
    html.classList.add('light-mode')
    html.classList.remove('dark-mode')
  }
  localStorage.setItem(THEME_KEY, theme)
  window.dispatchEvent(new CustomEvent('garden:theme-changed', { detail: { theme } }))
}

function applyTheme (theme, options = {}) {
  const { animate = true, slow = false } = options

  if (animate && slow) {
    // Cycle-triggered: start overlay, then swap the actual background at the
    // covered midpoint (~28% of SLOW_TRANSITION_MS) so the swap is invisible.
    runThemeTransition(theme, { slow: true })
    window.setTimeout(
      () => applyThemeClasses(theme),
      Math.round(SLOW_TRANSITION_MS * 0.30)
    )
    return
  }

  if (animate) {
    runThemeTransition(theme)
  }

  applyThemeClasses(theme)
}

function toggleTheme () {
  const currentTheme = getSavedTheme()
  const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME
  applyTheme(newTheme, { slow: true })
  window.setTimeout(() => {
    updateToggleButton(newTheme)
    updateSoundButton()
    if (!cabinActive) {
      playThemeTrack(newTheme)
    }
  }, Math.round(SLOW_TRANSITION_MS * 0.30))
}

function updateToggleButton (theme) {
  if (!themeToggleButton) {
    return
  }

  themeToggleButton.textContent = theme === DARK_THEME ? 'Light' : 'Dark'
  themeToggleButton.setAttribute('data-theme', theme)
}

function updateSoundButton () {
  if (!soundToggleButton) {
    return
  }

  const iconName = isMuted ? 'blackmuted.png' : 'blackunmuted.png'

  const icon = document.createElement('img')
  icon.className = 'sound-toggle-icon'
  icon.src = `${iconBasePath}/${iconName}`
  icon.alt = ''
  icon.setAttribute('aria-hidden', 'true')

  const label = document.createElement('span')
  label.className = 'sound-toggle-label'
  label.textContent = isMuted ? 'Unmute' : 'Mute'

  soundToggleButton.replaceChildren(icon, label)
  soundToggleButton.title = isMuted ? 'Sound is muted' : 'Sound is enabled'
  soundToggleButton.setAttribute(
    'aria-label',
    isMuted ? 'Unmute background sound' : 'Mute background sound'
  )
  soundToggleButton.setAttribute('aria-pressed', String(isMuted))
}

function updateControlsForCabinState () {
  if (!themeToggleButton) {
    return
  }

  // Keep global sound control available in cabin, hide global theme toggle
  // to avoid duplicating with cabin-local readability toggle.
  themeToggleButton.hidden = cabinActive
}

function setTracksMuted (muted) {
  ;[dayAudio, nightAudio, cabinAudio].forEach(track => {
    if (track) {
      track.muted = muted
    }
  })
}

function armPlaybackRetry (track, { resume = false } = {}) {
  if (!track) {
    return
  }

  pendingPlayback = {
    track,
    resume,
    time: track.currentTime
  }

  if (retryPlaybackArmed) {
    return
  }

  const retry = () => {
    retryPlaybackArmed = false
    const queued = pendingPlayback
    pendingPlayback = null

    if (!queued) {
      return
    }

    audioUnlocked = true
    if (queued.resume && Number.isFinite(queued.time)) {
      queued.track.currentTime = queued.time
    }

    playTrack(queued.track, { resume: true })
  }

  document.addEventListener('pointerdown', retry, { once: true, capture: true })
  document.addEventListener('keydown', retry, { once: true, capture: true })
  retryPlaybackArmed = true
}

function createAudioTrack (src, { loop = false, volume = 0.46 } = {}) {
  const audio = new Audio(src)
  audio.preload = 'auto'
  audio.loop = loop
  audio.volume = volume
  audio._targetVolume = volume
  audio.muted = isMuted
  return audio
}

function ensureAudioTracks () {
  if (dayAudio && nightAudio && cabinAudio) {
    return
  }

  dayAudio = createAudioTrack(`${soundBasePath}/daygardenmusic.mp3`, { volume: 0.46 })
  nightAudio = createAudioTrack(`${soundBasePath}/nightgardenmusic.mp3`, { volume: 0.46 })
  cabinAudio = createAudioTrack(`${soundBasePath}/cabinmusic.mp3`, {
    loop: true,
    volume: 0.42
  })

  setTracksMuted(isMuted)

  dayAudio.addEventListener('ended', () => {
    if (cabinActive) {
      return
    }

    const nextTheme = DARK_THEME
    applyTheme(nextTheme, { slow: true })
    window.setTimeout(() => {
      updateToggleButton(nextTheme)
      updateSoundButton()
      playThemeTrack(nextTheme)
    }, Math.round(SLOW_TRANSITION_MS * 0.30))
  })

  nightAudio.addEventListener('ended', () => {
    if (cabinActive) {
      return
    }

    const nextTheme = LIGHT_THEME
    applyTheme(nextTheme, { slow: true })
    window.setTimeout(() => {
      updateToggleButton(nextTheme)
      updateSoundButton()
      playThemeTrack(nextTheme)
    }, Math.round(SLOW_TRANSITION_MS * 0.30))
  })
}

function pauseAllTracks () {
  ;[dayAudio, nightAudio, cabinAudio].forEach(track => {
    if (track) {
      track.pause()
    }
  })
  activeTrack = null
}

function getThemeTrack (theme) {
  return theme === DARK_THEME ? nightAudio : dayAudio
}

function fadeVolume (track, from, to, duration, token, onDone = null) {
  if (!track) {
    return
  }

  const steps = Math.max(1, Math.round(duration / AUDIO_FADE_STEP_MS))
  const stepValue = (to - from) / steps
  let currentStep = 0

  track.volume = from

  const intervalId = window.setInterval(() => {
    if (token !== fadeToken) {
      window.clearInterval(intervalId)
      return
    }

    currentStep += 1
    const nextValue = from + stepValue * currentStep
    const clamped = Math.max(0, Math.min(1, nextValue))
    track.volume = clamped

    if (currentStep >= steps) {
      window.clearInterval(intervalId)
      track.volume = Math.max(0, Math.min(1, to))
      if (typeof onDone === 'function') {
        onDone()
      }
    }
  }, AUDIO_FADE_STEP_MS)
}

function playTrack (track, { resume = false } = {}) {
  if (!track) {
    return
  }

  if (!audioUnlocked) {
    armPlaybackRetry(track, { resume })
    return
  }

  const token = ++fadeToken
  const previousTrack = activeTrack

  if (previousTrack && previousTrack !== track) {
    fadeVolume(
      previousTrack,
      previousTrack.volume,
      0,
      AUDIO_FADE_MS,
      token,
      () => {
        previousTrack.pause()
        previousTrack.volume = previousTrack._targetVolume || 0.46
      }
    )
  }

  if (!resume) {
    track.currentTime = 0
  }

  const targetVolume = track._targetVolume || 0.46
  track.volume = previousTrack === track ? track.volume : 0
  track.muted = isMuted

  track.play().then(() => {
    if (token !== fadeToken) {
      return
    }

    fadeVolume(
      track,
      track.volume,
      targetVolume,
      AUDIO_FADE_MS,
      token
    )
    activeTrack = track
  }).catch(() => {
    armPlaybackRetry(track, { resume: true })
  })
}

function playThemeTrack (theme, { resume = false } = {}) {
  ensureAudioTracks()
  const track = getThemeTrack(theme)
  playTrack(track, { resume })
}

function startUserGestureUnlock () {
  if (audioUnlockInitialized) {
    return
  }

  const unlock = () => {
    audioUnlocked = true
    if (!cabinActive) {
      playThemeTrack(getSavedTheme())
    }
  }

  document.addEventListener('pointerdown', unlock, { once: true, capture: true })
  document.addEventListener('keydown', unlock, { once: true, capture: true })
  audioUnlockInitialized = true
}

function handleCabinOpened () {
  ensureAudioTracks()
  cabinActive = true
  updateControlsForCabinState()

  const currentThemeTrack = getThemeTrack(getSavedTheme())
  pausedThemeAudio = currentThemeTrack
  pausedThemeTime = currentThemeTrack?.currentTime || 0

  pauseAllTracks()
  playTrack(cabinAudio)
}

function handleCabinClosed () {
  ensureAudioTracks()
  cabinActive = false
  updateControlsForCabinState()

  if (pausedThemeAudio && pausedThemeTime > 0) {
    pausedThemeAudio.currentTime = pausedThemeTime
    playTrack(pausedThemeAudio, { resume: true })
  } else {
    playThemeTrack(getSavedTheme())
  }

  pausedThemeAudio = null
  pausedThemeTime = 0
}

function toggleSoundMute () {
  ensureAudioTracks()
  audioUnlocked = true
  isMuted = !isMuted
  localStorage.setItem(SOUND_MUTED_KEY, String(isMuted))
  setTracksMuted(isMuted)
  updateSoundButton()

  if (isMuted) {
    return
  }

  if (cabinActive && (!activeTrack || activeTrack.paused || activeTrack.ended)) {
    playTrack(cabinAudio, { resume: true })
    return
  }

  if (
    pausedThemeAudio &&
    pausedThemeTime > 0 &&
    (!activeTrack || activeTrack.paused || activeTrack.ended)
  ) {
    pausedThemeAudio.currentTime = pausedThemeTime
    playTrack(pausedThemeAudio, { resume: true })
    return
  }

  if (!activeTrack || activeTrack.paused || activeTrack.ended) {
    playThemeTrack(getSavedTheme(), { resume: true })
  }
}

function mountThemeControls () {
  if (!themeToggleButton || !soundToggleButton) {
    return
  }

  if (!controlsContainer) {
    controlsContainer = document.createElement('div')
    controlsContainer.className = 'floating-top-left-controls'
    document.body.append(controlsContainer)
  }

  controlsContainer.replaceChildren(soundToggleButton, themeToggleButton)
  updateControlsForCabinState()
}

function createThemeControls (savedTheme) {
  if (themeToggleButton && soundToggleButton) {
    return
  }

  themeToggleButton = document.createElement('button')
  themeToggleButton.id = 'theme-toggle-btn'
  themeToggleButton.type = 'button'
  themeToggleButton.className = 'theme-toggle-btn'
  themeToggleButton.textContent = savedTheme === DARK_THEME ? 'Light' : 'Dark'
  themeToggleButton.setAttribute('data-theme', savedTheme)
  themeToggleButton.addEventListener('click', toggleTheme)

  soundToggleButton = document.createElement('button')
  soundToggleButton.id = 'sound-toggle-btn'
  soundToggleButton.type = 'button'
  soundToggleButton.className = 'theme-toggle-btn sound-toggle-btn'
  soundToggleButton.addEventListener('click', toggleSoundMute)
  updateSoundButton()
}

export function initTheme () {
  const savedTheme = getSavedTheme()
  isMuted = getSavedMutedState()
  applyTheme(savedTheme, { animate: false })

  if (!themeInitialized) {
    ensureAudioTracks()
    startUserGestureUnlock()
    createThemeControls(savedTheme)

    window.addEventListener('garden:header-rendered', () => {
      mountThemeControls()
    })

    window.addEventListener('garden:cabin-opened', handleCabinOpened)
    window.addEventListener('garden:cabin-closed', handleCabinClosed)

    themeInitialized = true
  }

  updateToggleButton(getSavedTheme())
  updateSoundButton()
  mountThemeControls()
}
