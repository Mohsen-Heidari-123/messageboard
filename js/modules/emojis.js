const isInSitesFolder = () =>
  window.location.pathname.toLowerCase().includes('/sites/')

const emojiBasePath = isInSitesFolder() ? '../img/emojis' : './img/emojis'

const spriteSheetPath = `${emojiBasePath}/pixelemoji-set.png`
const heartEmojiPath = `${emojiBasePath}/heartemoji.png`
const brokenHeartEmojiPath = `${emojiBasePath}/brokenheartemoji.png`

const SPRITE_COLUMNS = 5
const SPRITE_ROWS = 5

const spriteEmojiDefinitions = Array.from(
  { length: SPRITE_COLUMNS * SPRITE_ROWS },
  (_, index) => {
    const row = Math.floor(index / SPRITE_COLUMNS)
    const column = index % SPRITE_COLUMNS

    return {
      id: `emoji-${index + 1}`,
      token: `:emoji-${index + 1}:`,
      type: 'sprite',
      row,
      column
    }
  }
)

export const heartEmojiDefinition = {
  id: 'heart',
  token: ':heart:',
  type: 'heart'
}

export const postEmojiDefinitions = [
  ...spriteEmojiDefinitions,
  heartEmojiDefinition
]

const emojiDefinitionMap = new Map(
  postEmojiDefinitions.map(definition => [definition.token, definition])
)

const emojiTokenPattern = new RegExp(
  `(${postEmojiDefinitions
    .map(definition => escapeForRegExp(definition.token))
    .sort((left, right) => right.length - left.length)
    .join('|')})`,
  'g'
)

function escapeForRegExp (value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function setSpriteBackground (element, definition) {
  const positionX =
    SPRITE_COLUMNS === 1 ? 0 : (definition.column / (SPRITE_COLUMNS - 1)) * 100
  const positionY =
    SPRITE_ROWS === 1 ? 0 : (definition.row / (SPRITE_ROWS - 1)) * 100

  element.style.backgroundImage = `url('${spriteSheetPath}')`
  element.style.backgroundSize = `${SPRITE_COLUMNS * 100}% ${
    SPRITE_ROWS * 100
  }%`
  element.style.backgroundPosition = `${positionX}% ${positionY}%`
}

export function createEmojiVisual (definition, options = {}) {
  const icon = document.createElement('span')
  icon.className = 'emoji-asset-icon'

  const size = Number(options.size || 20)
  icon.style.width = `${size}px`
  icon.style.height = `${size}px`

  if (definition.type === 'heart') {
    icon.style.backgroundImage = `url('${heartEmojiPath}')`
    icon.style.backgroundSize = 'contain'
    icon.style.backgroundPosition = 'center'
  } else {
    icon.classList.add('emoji-sprite-icon')
    setSpriteBackground(icon, definition)
  }

  if (options.inactive) {
    icon.classList.add('emoji-heart-inactive')
  }

  if (options.className) {
    icon.classList.add(options.className)
  }

  icon.setAttribute('aria-hidden', 'true')
  return icon
}

export function createReactionIcon (kind, options = {}) {
  const size = options.size || 18

  if (kind === 'heart') {
    return createEmojiVisual(heartEmojiDefinition, {
      size,
      inactive: !options.active,
      className: 'emoji-reaction-icon'
    })
  }

  if (kind === 'dislike') {
    const icon = document.createElement('span')
    icon.className = 'emoji-asset-icon emoji-reaction-icon'
    if (options.active) {
      icon.classList.add('emoji-dislike-active')
    }
    icon.style.width = `${size}px`
    icon.style.height = `${size}px`
    icon.style.backgroundImage = `url('${brokenHeartEmojiPath}')`
    icon.style.backgroundSize = 'contain'
    icon.style.backgroundPosition = 'center'
    icon.style.backgroundRepeat = 'no-repeat'
    icon.setAttribute('aria-hidden', 'true')
    return icon
  }

  // fallback: minus-streck
  const minus = document.createElement('span')
  minus.className = 'emoji-minus-icon'
  minus.style.width = `${size}px`
  minus.setAttribute('aria-hidden', 'true')
  return minus
}

export function createEmojiPicker (onSelect) {
  const picker = document.createElement('div')
  picker.className = 'emoji-picker'

  postEmojiDefinitions.forEach(definition => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'emoji-picker-button'
    button.title = definition.token
    button.append(createEmojiVisual(definition, { size: 24 }))
    button.addEventListener('click', () => {
      if (typeof onSelect === 'function') {
        onSelect(definition.token)
      }
    })
    picker.append(button)
  })

  return picker
}

export function getEmojiAwareLength (text) {
  const normalized = String(text || '').replace(emojiTokenPattern, 'x')
  return Array.from(normalized).length
}

export function insertEmojiTokenAtSelection (textarea, token, maxLength) {
  if (!textarea || !token) {
    return false
  }

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const nextValue =
    textarea.value.slice(0, start) + token + textarea.value.slice(end)

  if (
    typeof maxLength === 'number' &&
    getEmojiAwareLength(nextValue) > maxLength
  ) {
    return false
  }

  textarea.value = nextValue
  textarea.focus()
  textarea.selectionStart = textarea.selectionEnd = start + token.length
  textarea.dispatchEvent(new Event('input'))
  return true
}

export function createRichTextFragment (text, options = {}) {
  const fragment = document.createDocumentFragment()
  const rawText = String(text || '')

  if (!rawText) {
    return fragment
  }

  const iconSize = Number(options.size || 20)
  let cursor = 0

  rawText.replace(emojiTokenPattern, (match, _group, offset) => {
    if (offset > cursor) {
      fragment.append(document.createTextNode(rawText.slice(cursor, offset)))
    }

    const definition = emojiDefinitionMap.get(match)
    if (definition) {
      fragment.append(
        createEmojiVisual(definition, {
          size: iconSize,
          className: 'emoji-inline-icon'
        })
      )
    } else {
      fragment.append(document.createTextNode(match))
    }

    cursor = offset + match.length
    return match
  })

  if (cursor < rawText.length) {
    fragment.append(document.createTextNode(rawText.slice(cursor)))
  }

  return fragment
}

export function setElementTextWithEmojis (element, text, options = {}) {
  if (!element) {
    return
  }

  element.replaceChildren(createRichTextFragment(text, options))
}
