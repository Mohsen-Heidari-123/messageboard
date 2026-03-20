const THEME_KEY = 'garden-theme'
const LIGHT_THEME = 'light'
const DARK_THEME = 'dark'

function getSavedTheme () {
  return localStorage.getItem(THEME_KEY) || LIGHT_THEME
}

function applyTheme (theme) {
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
}

function toggleTheme () {
  const currentTheme = getSavedTheme()
  const newTheme = currentTheme === DARK_THEME ? LIGHT_THEME : DARK_THEME
  applyTheme(newTheme)
  updateToggleButton(newTheme)
}

function updateToggleButton (theme) {
  const btn = document.getElementById('theme-toggle-btn')
  if (btn) {
    btn.textContent = theme === DARK_THEME ? 'Light' : 'Dark'
    btn.setAttribute('data-theme', theme)
  }
}

export function initTheme () {
  const savedTheme = getSavedTheme()
  applyTheme(savedTheme)

  const btn = document.createElement('button')
  btn.id = 'theme-toggle-btn'
  btn.type = 'button'
  btn.className = 'theme-toggle-btn'
  btn.textContent = savedTheme === DARK_THEME ? 'Light' : 'Dark'
  btn.setAttribute('data-theme', savedTheme)

  btn.addEventListener('click', toggleTheme)

  document.body.append(btn)
}
