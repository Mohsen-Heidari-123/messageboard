
const isInSitesFolder = () =>
  window.location.pathname.toLowerCase().includes('/sites/')

const basePath = isInSitesFolder() ? '../img/cabin' : './img/cabin'

import { postMessage } from '../firebase/firebase.js'
import { censorBadWords } from './censor.js'

export function initCabin() {
  const cabinImg = document.getElementById('cabinImg')
  const cabinWrapper = document.querySelector('.cabin-wrapper')

  if (!cabinImg || !cabinWrapper) {
    return
  }

  // Make cabin wrapper clickable
  cabinWrapper.style.cursor = 'pointer'
  cabinWrapper.addEventListener('click', openCabinPopup)
}

function openCabinPopup() {
  const existing = document.getElementById('cabin-popup-overlay')
  if (existing) {
    existing.remove()
  }

  const overlay = document.createElement('div')
  overlay.id = 'cabin-popup-overlay'
  overlay.style.backgroundImage = `url('${basePath}/cozyInside.gif')`
  overlay.style.backgroundSize = 'cover'
  overlay.style.backgroundPosition = 'center'
  overlay.style.backgroundAttachment = 'fixed'

  const cabinContainer = document.createElement('div')
  cabinContainer.className = 'cabin-popup-container'

  // Create the content area that will sit inside the cabin frame
  const contentArea = document.createElement('div')
  contentArea.className = 'cabin-popup-content'

  // Header with close button
  const header = document.createElement('div')
  header.className = 'cabin-popup-header'

  const title = document.createElement('h2')
  title.textContent = 'User Hub'
  title.className = 'cabin-popup-title'

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.className = 'cabin-popup-close'
  closeBtn.addEventListener('click', () => overlay.remove())

  header.append(title, closeBtn)

  // User info section - temporary placeholder
  const userSection = document.createElement('div')
  userSection.className = 'cabin-popup-section'
  userSection.innerHTML = `
    <h3>Welcome back!</h3>
    <p>Your posts and liked posts will appear here</p>
  `

  contentArea.append(header, userSection)

  // Add clickable icons
  const mailIcon = document.createElement('img')
  mailIcon.src = `${basePath}/mail.png`
  mailIcon.alt = 'Mail icon'
  mailIcon.className = 'cabin-popup-icon cabin-popup-icon-mail'
  mailIcon.style.cursor = 'pointer'

  const scrollIcon = document.createElement('img')
  scrollIcon.src = `${basePath}/scroll.png`
  scrollIcon.alt = 'Scroll icon'
  scrollIcon.className = 'cabin-popup-icon cabin-popup-icon-scroll'
  scrollIcon.style.cursor = 'pointer'
  scrollIcon.style.width = '140px'
  scrollIcon.style.height = '100px'
  scrollIcon.style.bottom = '-30px'
  scrollIcon.style.right = '-70px'
    scrollIcon.title = 'Post message'
  scrollIcon.addEventListener('click', () => {
    userSection.innerHTML = ''
    userSection.append(createCabinPostForm(userSection))
  })
  cabinContainer.append(contentArea, mailIcon, scrollIcon)

  // Close on background click
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      overlay.remove()
    }
  })

  overlay.append(cabinContainer)
  document.body.append(overlay)
}

function createCabinPostForm(userSection) {
  const container = document.createElement('div')
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.style.gap = '12px'

  // Back button at the top
  const backBtn = document.createElement('button')
  backBtn.textContent = '← Back'
  backBtn.type = 'button'
  backBtn.style.alignSelf = 'flex-start'
  backBtn.style.padding = '8px 12px'
  backBtn.style.backgroundColor = '#A0826D'
  backBtn.style.color = 'white'
  backBtn.style.border = 'none'
  backBtn.style.borderRadius = '4px'
  backBtn.style.cursor = 'pointer'
  backBtn.style.fontSize = '14px'
  backBtn.style.marginBottom = '8px'
  backBtn.addEventListener('click', () => {
    userSection.innerHTML = `
      <h3>Welcome back!</h3>
      <p>Your posts and liked posts will appear here</p>
    `
  })

  const form = document.createElement('form')
  form.style.display = 'flex'
  form.style.flexDirection = 'column'
  form.style.gap = '12px'

  const name = document.createElement('input')
  name.placeholder = 'Your name'
  name.type = 'text'
  name.required = true

  const title = document.createElement('input')
  title.placeholder = 'Post title'
  title.type = 'text'
  title.required = true

  const message = document.createElement('textarea')
  message.placeholder = 'Your message'
  message.maxLength = 400
  message.required = true
  message.style.minHeight = '100px'
  message.style.resize = 'vertical'

  const button = document.createElement('button')
  button.textContent = 'Post'
  button.type = 'submit'
  button.style.padding = '10px 20px'
  button.style.backgroundColor = '#8B6F47'
  button.style.color = 'white'
  button.style.border = 'none'
  button.style.borderRadius = '4px'
  button.style.cursor = 'pointer'

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    try {
      const nameValue = censorBadWords(name.value.trim())
      const titleValue = censorBadWords(title.value.trim())
      const messageValue = censorBadWords(message.value.trim())

      await postMessage(messageValue, nameValue, titleValue)
      form.innerHTML = '<p style="text-align: center; color: green;">Post sent! ✓</p>'
      setTimeout(() => {
        form.innerHTML = '<p style="text-align: center;">Your messages will appear here soon!</p>'
      }, 2000)
    } catch (error) {
      console.error('Error posting message: ', error)
      form.innerHTML = '<p style="text-align: center; color: red;">Error sending post. Try again!</p>'
    }
  })

  form.append(name, title, message, button)
  container.append(backBtn, form)
  return container
}
