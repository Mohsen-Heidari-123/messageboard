import { postMessage } from '../firebase/firebase.js'
import { renderFlower } from '../rendering/renderflowers.js'

const isInSitesFolder = () =>
  window.location.pathname.toLowerCase().includes('/sites/')

const FLOWER_COLORS = [
  { label: 'Blue', value: 'blue' },
  { label: 'Green', value: 'green' },
  { label: 'Pink', value: 'pink' },
  { label: 'Purple', value: 'purple' },
  { label: 'Red', value: 'red' },
  { label: 'Yellow', value: 'yellow' }
]

function openPlantFlowerPopup () {
  const existing = document.getElementById('plant-flower-popup')
  if (existing) {
    existing.remove()
    return
  }

  const overlay = document.createElement('div')
  overlay.id = 'plant-flower-popup'

  const box = document.createElement('div')
  box.className = 'flower-popup-box'

  const title = document.createElement('h3')
  title.className = 'flower-popup-name'
  title.textContent = 'Plant a flower'

  const form = document.createElement('form')
  form.className = 'plant-flower-form'

  const nameInput = document.createElement('input')
  nameInput.type = 'text'
  nameInput.placeholder = 'Your name'
  nameInput.required = true

  const messageInput = document.createElement('input')
  messageInput.type = 'text'
  messageInput.placeholder = 'Your message'
  messageInput.required = true

  const colorLabel = document.createElement('p')
  colorLabel.textContent = 'Pick a color'
  colorLabel.className = 'plant-flower-color-label'

  const colorGroup = document.createElement('div')
  colorGroup.className = 'plant-flower-colors'
  FLOWER_COLORS.forEach(({ label, value }) => {
    const radio = document.createElement('input')
    radio.type = 'radio'
    radio.name = 'flowerColor'
    radio.id = `color-${value}`
    radio.value = value
    const lbl = document.createElement('label')
    lbl.htmlFor = `color-${value}`
    lbl.textContent = label
    colorGroup.append(radio, lbl)
  })

  const submitBtn = document.createElement('button')
  submitBtn.type = 'submit'
  submitBtn.textContent = 'Plant!'

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.textContent = '\u2715'
  closeBtn.className = 'flower-popup-close'
  closeBtn.addEventListener('click', () => overlay.remove())

  overlay.addEventListener('click', event => {
    if (event.target === overlay) overlay.remove()
  })

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const name = nameInput.value.trim()
    const message = messageInput.value.trim()
    const selectedColor =
      form.querySelector('input[name="flowerColor"]:checked')?.value ?? 'red'
    const base = isInSitesFolder() ? '../img/flowers' : './img/flowers'
    const imageSrc = `${base}/${selectedColor}Flower.png`
    submitBtn.disabled = true
    submitBtn.textContent = 'Planting...'
    try {
      await postMessage({ name, message })
      renderFlower(imageSrc, { name, message })
    } catch (err) {
      console.error('Could not plant flower', err)
    } finally {
      overlay.remove()
    }
  })

  form.append(nameInput, messageInput, colorLabel, colorGroup, submitBtn)
  box.append(closeBtn, title, form)
  overlay.append(box)
  document.body.append(overlay)
  nameInput.focus()
}

const getDefaultLinks = () => {
  if (isInSitesFolder()) {
    return [
      { label: 'Messageboard', href: '../index.html' },
      { label: 'About', href: './about.html' },
      { label: 'Contact', href: './contact.html' },
      { label: 'Plant flower', href: './contact.html' }
    ]
  }

  return [
    { label: 'Messageboard', href: './index.html' },
    { label: 'About', href: './sites/about.html' },
    { label: 'Contact', href: './sites/contact.html' },
    { label: 'Plant a flower', href: './sites/contact.html' }
  ]
}

export const renderHeader = links => {
  const navLinks = getDefaultLinks()
  const mount = document.body
  const existingHeader = mount.querySelector('[data-generated-header="true"]')
  if (existingHeader) return existingHeader

  // Determine correct image path based on location
  const imagePath = isInSitesFolder()
    ? '../img/icons/pixlecloud.png'
    : 'img/icons/pixlecloud.png'

  const header = document.createElement('header')
  header.dataset.generatedHeader = 'true'

  const nav = document.createElement('nav')
  navLinks.forEach(({ label, href }) => {
    const anchor = document.createElement('a')
    const background = document.createElement('img')
    const p = document.createElement('p')
    background.src = imagePath
    p.textContent = label
    background.classList.add('cloud')

    if (label === 'Plant flower') {
      anchor.href = '#'
      anchor.addEventListener('click', event => {
        event.preventDefault()
        openPlantFlowerPopup()
      })
    } else {
      anchor.href = href
    }

    anchor.append(background)
    anchor.append(p)

    // Random positioning only on larger screens
    if (window.innerWidth > 600) {
      const randomTop = Math.random() * 40
      const randomLeft = Math.random() * 80
      const randomDuration = (8 + Math.random() * 8).toFixed(2)
      const randomDelay = -(Math.random() * 8).toFixed(2)
      anchor.style.top = randomTop + '%'
      anchor.style.left = randomLeft + '%'
      anchor.style.setProperty('--cloud-duration', `${randomDuration}s`)
      anchor.style.setProperty('--cloud-delay', `${randomDelay}s`)
      // Unique random path for each anchor
      for (let i = 0; i <= 4; i++) {
        const x = (Math.random() * 24 - 12).toFixed(2)
        const y = (Math.random() * 40 - 20).toFixed(2)
        anchor.style.setProperty(`--cx${i}`, `${x}vw`)
        anchor.style.setProperty(`--cy${i}`, `${y}px`)
      }
      anchor.style.paddingBo = '20px'
    }

    nav.append(anchor)
  })

  header.append(nav)
  header.classList.add('sky-wrapper')

  if (mount === document.body) {
    document.body.prepend(header)
  } else {
    mount.replaceChildren(header)
  }

  return header
}

export const initHeaderOnLoad = () => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => renderHeader(), {
      once: true
    })
    return
  }

  renderHeader()
}
