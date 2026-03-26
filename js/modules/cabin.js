
const isInSitesFolder = () =>
  window.location.pathname.toLowerCase().includes('/sites/')

const basePath = isInSitesFolder() ? '../img/cabin' : './img/cabin'
const soundBasePath = isInSitesFolder() ? '../sounds' : './sounds'
const cabinDoorSoundPath = `${soundBasePath}/cabinopen.mp3`

let cabinDoorAudio = null
let cabinDoorReverseBuffer = null
let cabinDoorAudioContext = null

import {
  postMessage,
  postReply,
  getUserPosts,
  getUserLikedPosts,
  likePost,
  unlikePost
} from '../firebase/firebase.js'
import { censorBadWords } from './censor.js'
import { getUsername } from './username.js'
import { createReactionIcon, setElementTextWithEmojis } from './emojis.js'

function playCabinDoorSound() {
  if (!cabinDoorAudio) {
    cabinDoorAudio = new Audio(cabinDoorSoundPath)
    cabinDoorAudio.preload = 'auto'
    cabinDoorAudio.volume = 0.22
  }

  try {
    cabinDoorAudio.currentTime = 0
  } catch {
    // Ignore seek errors if audio metadata is not ready yet.
  }

  cabinDoorAudio.play().catch(() => {})
}

async function getCabinDoorReverseBuffer() {
  if (cabinDoorReverseBuffer) {
    return cabinDoorReverseBuffer
  }

  if (!cabinDoorAudioContext) {
    cabinDoorAudioContext = new window.AudioContext()
  }

  if (cabinDoorAudioContext.state === 'suspended') {
    await cabinDoorAudioContext.resume()
  }

  const response = await fetch(cabinDoorSoundPath)
  const arrayBuffer = await response.arrayBuffer()
  const decoded = await cabinDoorAudioContext.decodeAudioData(arrayBuffer)

  const reversedBuffer = cabinDoorAudioContext.createBuffer(
    decoded.numberOfChannels,
    decoded.length,
    decoded.sampleRate
  )

  for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
    const source = decoded.getChannelData(channel)
    const target = reversedBuffer.getChannelData(channel)

    for (let i = 0; i < decoded.length; i += 1) {
      target[i] = source[decoded.length - 1 - i]
    }
  }

  cabinDoorReverseBuffer = reversedBuffer
  return cabinDoorReverseBuffer
}

async function playCabinDoorSoundReverse() {
  try {
    const buffer = await getCabinDoorReverseBuffer()
    const source = cabinDoorAudioContext.createBufferSource()
    const gain = cabinDoorAudioContext.createGain()
    const now = cabinDoorAudioContext.currentTime
    const targetGain = 0.18

    // Smooth the first ~120ms to remove the sharp transient at start.
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(targetGain, now + 0.12)
    source.buffer = buffer
    source.connect(gain)
    gain.connect(cabinDoorAudioContext.destination)
    source.start(0)
  } catch {
    // Ignore sound errors so popup close flow is never blocked.
  }
}

export function initCabin() {
  const cabinImg = document.getElementById('cabinImg')
  const cabinWrapper = document.querySelector('.cabin-wrapper')

  if (!cabinImg || !cabinWrapper) {
    return
  }

  // Make cabin wrapper clickable
  cabinWrapper.style.cursor = 'pointer'
  cabinWrapper.addEventListener('click', () => {
    playCabinDoorSound()
    openCabinPopup()
  })
}

function openCabinPopup() {
  const existing = document.getElementById('cabin-popup-overlay')
  if (existing) {
    existing.remove()
  }

  const username = getUsername()
  if (!username) {
    alert('Please login first')
    return
  }

  const overlay = document.createElement('div')
  overlay.id = 'cabin-popup-overlay'
  overlay.style.backgroundImage = `url('${basePath}/cozyInside.gif')`
  overlay.style.backgroundSize = 'cover'
  overlay.style.backgroundPosition = 'center'
  overlay.style.backgroundAttachment = 'fixed'

  const cabinContainer = document.createElement('div')
  cabinContainer.className = 'cabin-popup-container'

  // Create the content area
  const contentArea = document.createElement('div')
  contentArea.className = 'cabin-popup-content'

  // Header with username and close button
  const header = document.createElement('div')
  header.className = 'cabin-popup-header'
  header.style.display = 'flex'
  header.style.justifyContent = 'space-between'
  header.style.alignItems = 'center'

  const userInfo = document.createElement('div')
  const userName = document.createElement('h2')
  userName.textContent = username
  userName.className = 'cabin-popup-username'
  userName.style.margin = '0'
  userName.style.fontSize = '24px'
  userInfo.append(userName)

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.className = 'cabin-popup-close'
  closeBtn.setAttribute('aria-label', 'Close cabin popup')

  const cabinReadabilityBtn = document.createElement('button')
  cabinReadabilityBtn.type = 'button'
  cabinReadabilityBtn.className = 'cabin-reading-btn'
  cabinReadabilityBtn.textContent = 'Lamp'
  cabinReadabilityBtn.setAttribute('aria-pressed', 'false')
  cabinReadabilityBtn.setAttribute('aria-label', 'Toggle cabin readability mode')

  cabinReadabilityBtn.addEventListener('click', () => {
    const nextState = !overlay.classList.contains('cabin-local-dark')
    overlay.classList.toggle('cabin-local-dark', nextState)
    cabinReadabilityBtn.setAttribute('aria-pressed', String(nextState))
    cabinReadabilityBtn.textContent = nextState ? 'Lamp on' : 'Lamp'
  })

  let isRemoved = false
  const removeOverlay = () => {
    if (isRemoved) {
      return
    }

    isRemoved = true
    document.removeEventListener('keydown', onKeyDown)
    playCabinDoorSoundReverse()
    overlay.remove()
    window.dispatchEvent(new CustomEvent('garden:cabin-closed'))
  }

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      removeOverlay()
    }
  }

  document.addEventListener('keydown', onKeyDown)
  closeBtn.addEventListener('click', removeOverlay)

  const headerActions = document.createElement('div')
  headerActions.className = 'cabin-popup-header-actions'
  headerActions.append(cabinReadabilityBtn, closeBtn)

  header.append(userInfo, headerActions)

  // Main content container with two columns
  const hubContainer = document.createElement('div')
  hubContainer.className = 'cabin-hub-container'
  hubContainer.style.display = 'flex'
  hubContainer.style.gap = '20px'
  hubContainer.style.height = '100%'
  hubContainer.style.minHeight = '300px'

  // Left column - User's posts
  const leftColumn = document.createElement('div')
  leftColumn.className = 'cabin-column cabin-column-posts'
  leftColumn.style.flex = '1'
  leftColumn.style.display = 'flex'
  leftColumn.style.flexDirection = 'column'
  leftColumn.style.borderRight = '2px solid rgba(139, 111, 71, 0.3)'
  leftColumn.style.paddingRight = '15px'

  const postsTitle = document.createElement('h3')
  postsTitle.textContent = 'Your Posts'
  postsTitle.style.marginTop = '0'
  postsTitle.style.color = '#8B6F47'

  const postsList = document.createElement('div')
  postsList.className = 'cabin-posts-list'
  postsList.style.flex = '1'
  postsList.style.overflowY = 'auto'
  postsList.style.paddingRight = '10px'

  // Right column - Liked posts
  const rightColumn = document.createElement('div')
  rightColumn.className = 'cabin-column cabin-column-liked'
  rightColumn.style.flex = '1'
  rightColumn.style.display = 'flex'
  rightColumn.style.flexDirection = 'column'

  const likedTitle = document.createElement('h3')
  likedTitle.textContent = 'Liked Posts'
  likedTitle.style.marginTop = '0'
  likedTitle.style.color = '#8B6F47'

  const likedList = document.createElement('div')
  likedList.className = 'cabin-liked-list'
  likedList.style.flex = '1'
  likedList.style.overflowY = 'auto'
  likedList.style.paddingRight = '10px'

  leftColumn.append(postsTitle, postsList)
  rightColumn.append(likedTitle, likedList)

  hubContainer.append(leftColumn, rightColumn)
  contentArea.append(header, hubContainer)

  // Load and display posts
  loadHubContent(username, postsList, likedList, hubContainer)

  // Add clickable scroll icon for posting
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
    showPostForm(contentArea, username, hubContainer, postsList)
  })

  cabinContainer.append(contentArea, scrollIcon)

  // Close on background click
  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      removeOverlay()
    }
  })

  overlay.append(cabinContainer)
  document.body.append(overlay)
  window.dispatchEvent(new CustomEvent('garden:cabin-opened'))
}

async function loadHubContent(username, postsList, likedList, hubContainer) {
  try {
    // Load user's posts
    const userPosts = await getUserPosts(username)
    displayPostsList(userPosts, postsList, username, hubContainer)

    // Load liked posts
    const likedPosts = await getUserLikedPosts(username)
    displayLikedList(likedPosts, likedList, username, hubContainer)
  } catch (error) {
    console.error('Error loading hub content:', error)
    postsList.innerHTML = '<p style="color: red;">Error loading posts</p>'
    likedList.innerHTML = '<p style="color: red;">Error loading liked posts</p>'
  }
}

function displayPostsList(postsData, container, username, hubContainer) {
  container.innerHTML = ''
  
  if (!postsData || Object.keys(postsData).length === 0) {
    container.innerHTML = '<p style="color: #999;">No posts yet</p>'
    return
  }

  Object.entries(postsData).forEach(([postId, postData]) => {
    const postItem = document.createElement('div')
    postItem.className = 'cabin-post-item'
    postItem.style.padding = '12px'
    postItem.style.marginBottom = '10px'
    postItem.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
    postItem.style.borderRadius = '4px'
    postItem.style.cursor = 'pointer'
    postItem.style.borderLeft = '4px solid #8B6F47'
    postItem.style.transition = 'all 0.2s'

    const title = document.createElement('p')
    title.textContent = postData.title || 'Untitled'
    title.style.margin = '0 0 4px 0'
    title.style.fontWeight = 'bold'
    title.style.color = '#333'

    const meta = document.createElement('p')
    meta.className = 'cabin-post-item-meta'
    meta.textContent = `${getReplyCount(postData)} replies`

    postItem.append(title, meta)
    postItem.addEventListener('click', () => {
      showPostDetail(postData, postId, username, hubContainer)
    })

    postItem.addEventListener('mouseenter', () => {
      postItem.style.backgroundColor = 'rgba(255, 255, 255, 1)'
      postItem.style.transform = 'translateX(4px)'
    })

    postItem.addEventListener('mouseleave', () => {
      postItem.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
      postItem.style.transform = 'translateX(0)'
    })

    container.append(postItem)
  })
}

function displayLikedList(likedData, container, username, hubContainer) {
  container.innerHTML = ''
  
  if (!likedData || Object.keys(likedData).length === 0) {
    container.innerHTML = '<p style="color: #999;">No liked posts yet</p>'
    return
  }

  Object.entries(likedData).forEach(([postId, postData]) => {
    const likedItem = document.createElement('div')
    likedItem.className = 'cabin-liked-item'
    likedItem.style.padding = '12px'
    likedItem.style.marginBottom = '10px'
    likedItem.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
    likedItem.style.borderRadius = '4px'
    likedItem.style.cursor = 'pointer'
    likedItem.style.borderLeft = '4px solid #FFB347'
    likedItem.style.transition = 'all 0.2s'

    const title = document.createElement('p')
    title.textContent = postData.title || 'Untitled'
    title.style.margin = '0 0 4px 0'
    title.style.fontWeight = 'bold'
    title.style.color = '#333'

    const author = document.createElement('p')
    author.textContent = `by ${postData.name} • ${getReplyCount(postData)} replies`
    author.className = 'cabin-liked-item-meta'
    author.style.margin = '0'
    author.style.fontSize = '12px'
    author.style.color = '#666'

    likedItem.append(title, author)
    likedItem.addEventListener('click', () => {
      showPostDetail(postData, postId, username, hubContainer)
    })

    likedItem.addEventListener('mouseenter', () => {
      likedItem.style.backgroundColor = 'rgba(255, 255, 255, 1)'
      likedItem.style.transform = 'translateX(4px)'
    })

    likedItem.addEventListener('mouseleave', () => {
      likedItem.style.backgroundColor = 'rgba(255, 255, 255, 0.8)'
      likedItem.style.transform = 'translateX(0)'
    })

    container.append(likedItem)
  })
}

function showPostDetail(postData, postId, username, hubContainer) {
  // Hide the hub container and show post detail
  hubContainer.style.display = 'none'

  const detailContainer = document.createElement('div')
  detailContainer.className = 'cabin-post-detail'
  detailContainer.style.display = 'flex'
  detailContainer.style.flexDirection = 'column'
  detailContainer.style.height = '100%'
  detailContainer.style.overflowY = 'auto'

  // Back button
  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'cabin-nav-btn'
  setPixelButtonContent(backBtn, 'pixel-icon-arrow-left', 'Back')
  backBtn.addEventListener('click', () => {
    detailContainer.remove()
    hubContainer.style.display = 'flex'
  })

  // Post content
  const title = document.createElement('h3')
  title.textContent = postData.title || 'Untitled'
  title.style.margin = '0 0 8px 0'
  title.style.color = '#8B6F47'

  const author = document.createElement('p')
  author.textContent = `By ${postData.name}`
  author.style.margin = '0 0 12px 0'
  author.style.fontSize = '14px'
  author.style.color = '#666'
  author.style.fontStyle = 'italic'

  const message = document.createElement('p')
  setElementTextWithEmojis(message, postData.message, { size: 18 })
  message.style.margin = '0 0 16px 0'
  message.style.lineHeight = '1.6'
  message.style.color = '#333'

  const actionsRow = document.createElement('div')
  actionsRow.className = 'cabin-post-actions'

  const copyBtn = document.createElement('button')
  copyBtn.type = 'button'
  copyBtn.className = 'cabin-post-copy-btn'
  copyBtn.textContent = 'Copy post'
  copyBtn.addEventListener('click', async () => {
    const copyText = [
      `Title: ${postData.title || 'Untitled'}`,
      `By: ${postData.name || 'Unknown'}`,
      '',
      `${postData.message || ''}`
    ].join('\n')

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText)
      } else {
        const helper = document.createElement('textarea')
        helper.value = copyText
        document.body.append(helper)
        helper.select()
        document.execCommand('copy')
        helper.remove()
      }

      copyBtn.textContent = 'Copied!'
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy post'
      }, 1200)
    } catch {
      copyBtn.textContent = 'Copy failed'
      window.setTimeout(() => {
        copyBtn.textContent = 'Copy post'
      }, 1200)
    }
  })

  const repliesSection = document.createElement('section')
  repliesSection.className = 'cabin-post-replies'

  const repliesTitle = document.createElement('h4')
  repliesTitle.className = 'cabin-post-replies-title'
  repliesTitle.textContent = 'Replies'

  const repliesList = document.createElement('div')
  repliesList.className = 'cabin-post-replies-list'

  const renderReplies = () => {
    repliesList.replaceChildren()
    const replies = getReplyList(postData)

    if (replies.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'cabin-post-replies-empty'
      empty.textContent = 'No replies yet.'
      repliesList.append(empty)
      return
    }

    replies.forEach(reply => {
      repliesList.append(buildCabinReplyElement(reply, username))
    })
  }

  renderReplies()
  repliesSection.append(repliesTitle, repliesList)

  const replyForm = buildCabinReplyForm({
    postId,
    postData,
    username,
    onReplySaved: renderReplies
  })

  const isOwnPost = postData?.name === username
  if (!isOwnPost) {
    // Like/Unlike button
    const likeBtn = document.createElement('button')
    likeBtn.type = 'button'
    likeBtn.className = 'cabin-like-btn'

    // Check if already liked
    checkIfLiked(postId, username).then(isLiked => {
      updateCabinLikeButton(likeBtn, isLiked)
      likeBtn.addEventListener('click', async () => {
        try {
          if (isLiked) {
            await unlikePost(username, postId)
            isLiked = false
          } else {
            await likePost(username, postId)
            isLiked = true
          }

          updateCabinLikeButton(likeBtn, isLiked)

          const postsList = hubContainer.querySelector('.cabin-posts-list')
          const likedList = hubContainer.querySelector('.cabin-liked-list')
          if (postsList && likedList) {
            loadHubContent(username, postsList, likedList, hubContainer)
          }
        } catch (error) {
          console.error('Error toggling like:', error)
          alert('Error updating like status')
        }
      })
    })

    actionsRow.append(copyBtn, likeBtn)
    detailContainer.append(backBtn, title, author, message, repliesSection, replyForm, actionsRow)
  } else {
    actionsRow.append(copyBtn)
    detailContainer.append(backBtn, title, author, message, repliesSection, replyForm, actionsRow)
  }

  hubContainer.parentElement.append(detailContainer)
}

async function checkIfLiked(postId, username) {
  try {
    const likedPosts = await getUserLikedPosts(username)
    return !!likedPosts[postId]
  } catch (error) {
    console.error('Error checking like status:', error)
    return false
  }
}

function normalizeReply(entry) {
  if (!entry || typeof entry !== 'object') {
    return null
  }

  const name = String(entry.name || '').trim()
  const message = String(entry.message || '').trim()

  if (!name || !message) {
    return null
  }

  return {
    id: String(entry.id || ''),
    name,
    message,
    createdAt:
      typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt)
        ? entry.createdAt
        : 0
  }
}

function normalizeUserName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function formatTimestamp(timestamp) {
  if (!timestamp || !Number.isFinite(timestamp)) {
    return 'unknown time'
  }

  try {
    return new Date(timestamp).toLocaleString('sv-SE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'unknown time'
  }
}

function getReplyList(postData) {
  const replies = []

  if (Array.isArray(postData?.replies)) {
    postData.replies.forEach(entry => {
      const normalized = normalizeReply(entry)
      if (normalized) {
        replies.push(normalized)
      }
    })
  } else if (postData?.replies && typeof postData.replies === 'object') {
    Object.values(postData.replies).forEach(entry => {
      const normalized = normalizeReply(entry)
      if (normalized) {
        replies.push(normalized)
      }
    })
  }

  const legacyAnswer = normalizeReply(postData?.answer)
  if (legacyAnswer && replies.length === 0) {
    replies.push(legacyAnswer)
  }

  replies.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))

  return replies
}

function getReplyCount(postData) {
  return getReplyList(postData).length
}

function buildCabinReplyElement(replyData, currentUsername) {
  const item = document.createElement('article')
  item.className = 'cabin-post-reply-item'

  const ownReply =
    normalizeUserName(replyData?.name) === normalizeUserName(currentUsername)
  if (ownReply) {
    item.classList.add('cabin-post-reply-item-own')
  }

  const message = document.createElement('p')
  message.className = 'cabin-post-reply-message'
  setElementTextWithEmojis(message, replyData.message, { size: 16 })

  const meta = document.createElement('p')
  meta.className = 'cabin-post-reply-meta'

  const author = document.createElement('span')
  author.className = 'cabin-post-reply-author'
  author.textContent = ownReply ? 'You' : replyData.name

  const time = document.createElement('span')
  time.className = 'cabin-post-reply-time'
  time.textContent = formatTimestamp(replyData.createdAt)

  meta.append(author, time)

  item.append(message, meta)
  return item
}

function buildCabinReplyForm({ postId, postData, username, onReplySaved }) {
  const form = document.createElement('form')
  form.className = 'cabin-post-reply-form'

  const input = document.createElement('textarea')
  input.name = 'cabin-reply-message'
  input.className = 'cabin-post-reply-input'
  input.maxLength = 180
  input.required = true
  input.placeholder = 'Write a reply...'

  const actions = document.createElement('div')
  actions.className = 'cabin-post-reply-actions'

  const submit = document.createElement('button')
  submit.type = 'submit'
  submit.className = 'cabin-post-reply-submit'
  submit.textContent = 'Reply'

  const status = document.createElement('p')
  status.className = 'cabin-post-reply-status'
  status.hidden = true

  actions.append(submit, status)
  form.append(input, actions)

  form.addEventListener('submit', async event => {
    event.preventDefault()

    const nameValue = censorBadWords(String(username || '').trim())
    const messageValue = censorBadWords(input.value.trim())

    if (!nameValue) {
      status.hidden = false
      status.textContent = 'You need to be logged in to reply.'
      return
    }

    if (!messageValue) {
      status.hidden = false
      status.textContent = 'Please enter a reply.'
      return
    }

    submit.disabled = true
    status.hidden = false
    status.textContent = 'Sending...'

    try {
      const savedReply = await postReply(postId, messageValue, nameValue)
      if (!Array.isArray(postData.replies)) {
        postData.replies = getReplyList(postData)
      }
      postData.replies.push(savedReply)
      input.value = ''
      status.textContent = 'Reply posted.'
      onReplySaved()
    } catch {
      status.textContent = 'Could not post reply. Try again.'
    } finally {
      submit.disabled = false
    }
  })

  return form
}

function showPostForm(contentArea, username, hubContainer, postsList) {
  // Hide hub and show form
  hubContainer.style.display = 'none'

  const formContainer = document.createElement('div')
  formContainer.className = 'cabin-post-form-container'
  formContainer.style.display = 'flex'
  formContainer.style.flexDirection = 'column'
  formContainer.style.gap = '12px'
  formContainer.style.overflowY = 'auto'

  // Back button
  const backBtn = document.createElement('button')
  backBtn.type = 'button'
  backBtn.className = 'cabin-nav-btn'
  setPixelButtonContent(backBtn, 'pixel-icon-arrow-left', 'Back')
  backBtn.addEventListener('click', () => {
    formContainer.remove()
    hubContainer.style.display = 'flex'
  })

  const form = document.createElement('form')
  form.style.display = 'flex'
  form.style.flexDirection = 'column'
  form.style.gap = '12px'

  const nameInput = document.createElement('input')
  nameInput.placeholder = 'Your name'
  nameInput.type = 'text'
  nameInput.value = username // Pre-fill with logged-in username
  nameInput.required = true

  const titleInput = document.createElement('input')
  titleInput.placeholder = 'Post title'
  titleInput.type = 'text'
  titleInput.required = true

  const messageInput = document.createElement('textarea')
  messageInput.placeholder = 'Your message'
  messageInput.maxLength = 400
  messageInput.required = true
  messageInput.style.minHeight = '100px'
  messageInput.style.resize = 'vertical'

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
      const nameValue = censorBadWords(nameInput.value.trim())
      const titleValue = censorBadWords(titleInput.value.trim())
      const messageValue = censorBadWords(messageInput.value.trim())

      await postMessage(messageValue, nameValue, titleValue)
      form.innerHTML = ''
      const successMessage = document.createElement('p')
      successMessage.className = 'cabin-form-success'
      successMessage.append(createPixelLabel('pixel-icon-check', 'Post sent!'))
      form.append(successMessage)
      
      setTimeout(() => {
        // Reload the posts list
        formContainer.remove()
        hubContainer.style.display = 'flex'
        // Refresh the posts
        const postsList = hubContainer.querySelector('.cabin-posts-list')
        if (postsList) {
          loadHubContent(username, postsList, hubContainer.querySelector('.cabin-liked-list'), hubContainer)
        }
      }, 1500)
    } catch (error) {
      console.error('Error posting message: ', error)
      form.innerHTML = '<p style="text-align: center; color: red;">Error sending post. Try again!</p>'
    }
  })

  form.append(nameInput, titleInput, messageInput, button)
  formContainer.append(backBtn, form)
  
  // Insert after header
  const header = contentArea.querySelector('.cabin-popup-header')
  header.after(formContainer)
}

function createPixelLabel(iconClass, text) {
  const wrapper = document.createElement('span')
  wrapper.className = 'pixel-inline'

  const icon = document.createElement('span')
  icon.className = `pixel-icon ${iconClass}`
  icon.setAttribute('aria-hidden', 'true')

  const label = document.createElement('span')
  label.textContent = text

  wrapper.append(icon, label)
  return wrapper
}

function setPixelButtonContent(button, iconClass, text) {
  button.replaceChildren(createPixelLabel(iconClass, text))
}

function updateCabinLikeButton(button, isLiked) {
  const icon = createReactionIcon('heart', { active: isLiked, size: 18 })
  const label = document.createElement('span')
  label.textContent = isLiked ? 'Liked' : 'Like'
  button.replaceChildren(icon, label)
}
