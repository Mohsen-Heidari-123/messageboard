const animalSize = 48
const MAX_ANIMALS = 10
const LIMIT_PROMPT_ID = 'spawn-animal-limit-prompt'

let limitPromptTimeoutId = null

const isInSitesFolder = () =>
  window.location.pathname.toLowerCase().includes('/sites/')

const ANIMAL_GIFS = [
  'pixel-rabbit-rabbit.gif',
  'bee-pixel.gif',
  'fox.gif',
  'horse.gif',
  'squrril.gif',
  'run-pikachu.gif'
]

const basePath = isInSitesFolder() ? '../img/animals' : './img/animals'

function getRandomAnimalSrc () {
  const randomAnimal =
    ANIMAL_GIFS[Math.floor(Math.random() * ANIMAL_GIFS.length)]
  return `${basePath}/${randomAnimal}`
}

function randomPosition (garden, size) {
  const maxLeft = Math.max(garden.clientWidth - size, 0)
  const maxTop = Math.max(garden.clientHeight - size, 0)

  return {
    x: Math.floor(Math.random() * (maxLeft + 1)),
    y: Math.floor(Math.random() * (maxTop + 1))
  }
}

function moveAnimal (animal, garden) {
  const currentLeft = parseFloat(animal.style.left || '0')
  const next = randomPosition(garden, animalSize)

  animal.style.left = `${next.x}px`
  animal.style.top = `${next.y}px`

  if (next.x < currentLeft) {
    animal.style.transform = 'scaleX(-1)'
  } else {
    animal.style.transform = 'scaleX(1)'
  }
}

function getAnimalCount (garden) {
  return garden.querySelectorAll('.garden-animal').length
}

function removeLimitPrompt () {
  const existingPrompt = document.getElementById(LIMIT_PROMPT_ID)
  if (existingPrompt) {
    existingPrompt.remove()
  }

  if (limitPromptTimeoutId !== null) {
    window.clearTimeout(limitPromptTimeoutId)
    limitPromptTimeoutId = null
  }
}

function showLimitPrompt (button) {
  if (!button) {
    return
  }

  removeLimitPrompt()

  const prompt = document.createElement('div')
  prompt.id = LIMIT_PROMPT_ID
  prompt.className = 'spawn-animal-limit-prompt'
  prompt.textContent = `Max ${MAX_ANIMALS} animals reached`

  document.body.append(prompt)

  const buttonRect = button.getBoundingClientRect()
  const promptRect = prompt.getBoundingClientRect()
  const promptLeft = Math.max(8, buttonRect.right - promptRect.width)
  const promptTop = Math.max(8, buttonRect.top - promptRect.height - 10)

  prompt.style.left = `${promptLeft}px`
  prompt.style.top = `${promptTop}px`

  limitPromptTimeoutId = window.setTimeout(() => {
    prompt.remove()
    limitPromptTimeoutId = null
  }, 1800)
}

function updateSpawnButtonState (button, garden) {
  if (!button || !garden) {
    return
  }

  const reachedLimit = getAnimalCount(garden) >= MAX_ANIMALS
  button.classList.toggle('is-limit-reached', reachedLimit)
  button.setAttribute('aria-disabled', reachedLimit ? 'true' : 'false')
  button.title = reachedLimit
    ? `Maximum ${MAX_ANIMALS} animals reached`
    : 'Spawn Animal'
}

function spawnAnimal (garden, button) {
  if (!garden) {
    return
  }

  if (getAnimalCount(garden) >= MAX_ANIMALS) {
    updateSpawnButtonState(button, garden)
    showLimitPrompt(button)
    return
  }

  const animal = document.createElement('img')
  const start = randomPosition(garden, animalSize)
  const animalSrc = getRandomAnimalSrc()

  animal.src = animalSrc
  animal.alt = 'Random garden animal'
  animal.className = 'garden-animal'
  animal.style.left = `${start.x}px`
  animal.style.top = `${start.y}px`
  let moveIntervalId = null

  animal.addEventListener('click', () => {
    if (moveIntervalId !== null) {
      window.clearInterval(moveIntervalId)
    }
    animal.remove()
    updateSpawnButtonState(button, garden)
  })

  garden.append(animal)
  updateSpawnButtonState(button, garden)

  moveIntervalId = window.setInterval(() => {
    moveAnimal(animal, garden)
  }, 2000)
}

export function initAnimalControl () {
  const garden =
    document.getElementById('garden') ??
    document.querySelector('.garden-wrapper')

  if (!garden) {
    return
  }

  const existingButton = document.getElementById('spawn-animal-btn')
  if (existingButton) {
    existingButton.remove()
  }

  const button = document.createElement('button')
  button.id = 'spawn-animal-btn'
  button.type = 'button'
  button.textContent = 'Spawn Animal'

  button.addEventListener('click', () => {
    spawnAnimal(garden, button)
  })

  document.body.append(button)
  updateSpawnButtonState(button, garden)
}
