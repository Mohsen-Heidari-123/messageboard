import { postMessage } from '../firebase/firebase.js'
import { showAdVideo } from './advertisement.js'
import { censorBadWords } from './censor.js'
import {
  createEmojiPicker,
  getEmojiAwareLength,
  insertEmojiTokenAtSelection
} from './emojis.js'
import { getUsername } from './username.js'

const maxMessageLength = 100
const internalMessageLimit = 800

export const createFlowerForm = () => {
  const wrapper = document.createElement('div')
  wrapper.classList.add('form-wrapper')

  let isRemoved = false
  const removeForm = () => {
    if (isRemoved) {
      return
    }

    isRemoved = true
    document.removeEventListener('keydown', onKeyDown)
    wrapper.remove()
  }

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      removeForm()
    }
  }

  document.addEventListener('keydown', onKeyDown)

  const cancelBtn = document.createElement('button')
  cancelBtn.textContent = 'X'
  cancelBtn.classList.add('cancelBtn')
  cancelBtn.type = 'button'
  cancelBtn.setAttribute('aria-label', 'Close form')
  cancelBtn.addEventListener('click', removeForm)

  const form = document.createElement('form')

  const title = document.createElement('input')
  title.placeholder = 'Title'

  const message = document.createElement('textarea')
  message.placeholder = 'Message'
  message.maxLength = internalMessageLimit

  const charCount = document.createElement('div')
  charCount.textContent = `0 / ${maxMessageLength}`

  const name = document.createElement('input')
  name.placeholder = 'Name'
  name.value = getUsername()

  const button = document.createElement('button')
  button.textContent = 'Send!'
  button.classList.add('sendBtn')
  button.type = 'submit'

  const sendStatus = document.createElement('p')
  sendStatus.classList.add('form-send-status')

  let lastValidMessage = ''

  const updateCharCount = () => {
    charCount.textContent = `${getEmojiAwareLength(message.value)} / ${maxMessageLength}`
  }

  message.addEventListener('input', () => {
    if (getEmojiAwareLength(message.value) > maxMessageLength) {
      message.value = lastValidMessage
    } else {
      lastValidMessage = message.value
    }

    updateCharCount()
  })

  const emojiPickerPanel = document.createElement('div')
  emojiPickerPanel.classList.add('emoji-picker-panel')

  const emojiPickerLabel = document.createElement('p')
  emojiPickerLabel.classList.add('emoji-picker-label')
  emojiPickerLabel.textContent = 'Choose emoji'

  const emojiPicker = createEmojiPicker(token => {
    const inserted = insertEmojiTokenAtSelection(
      message,
      token,
      maxMessageLength
    )

    if (!inserted) {
      return
    }

    lastValidMessage = message.value
    updateCharCount()
  })

  emojiPickerPanel.append(emojiPickerLabel, emojiPicker)

  const bottomRow = document.createElement('div')
  bottomRow.classList.add('form-bottom-row')

  form.addEventListener('submit', async e => {
    e.preventDefault()

    const titleValue = censorBadWords(title.value.trim())
    const messageValue = censorBadWords(message.value.trim())
    const nameValue = censorBadWords(name.value.trim())

    if (!nameValue || !messageValue) {
      sendStatus.textContent = 'Name and message are required.'
      return
    }

    try {
      button.disabled = true
      sendStatus.textContent = 'Sending...'

      await postMessage(messageValue, nameValue, titleValue)
      showAdVideo()
      removeForm()
      console.log('message sent!')
    } catch (error) {
      console.error('Error sending message: ', error)
      button.disabled = false
      sendStatus.textContent = 'Could not send. Try again.'
    }
  })

  bottomRow.append(charCount, emojiPickerPanel)
  form.append(name, title, message, bottomRow, sendStatus, button)
  wrapper.append(cancelBtn, form)
  document.body.append(wrapper)

  title.focus()
}
