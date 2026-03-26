
const isInSitesFolder = () =>
  window.location.pathname.toLowerCase().includes('/sites/')

const basePath = isInSitesFolder() ? '../img/cabin' : './img/cabin'

import { postMessage, getUserPosts, getUserLikedPosts, likePost, unlikePost } from '../firebase/firebase.js'
import { censorBadWords } from './censor.js'
import { getUsername } from './username.js'

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
  closeBtn.addEventListener('click', () => overlay.remove())

  header.append(userInfo, closeBtn)

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
      overlay.remove()
    }
  })

  overlay.append(cabinContainer)
  document.body.append(overlay)
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
    title.style.margin = '0'
    title.style.fontWeight = 'bold'
    title.style.color = '#333'

    postItem.append(title)
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
    author.textContent = `by ${postData.name}`
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
  backBtn.style.marginBottom = '12px'
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
  message.textContent = postData.message
  message.style.margin = '0 0 16px 0'
  message.style.lineHeight = '1.6'
  message.style.color = '#333'

  // Like/Unlike button
  const likeBtn = document.createElement('button')
  likeBtn.type = 'button'
  likeBtn.style.padding = '8px 16px'
  likeBtn.style.backgroundColor = '#FFB347'
  likeBtn.style.color = '#333'
  likeBtn.style.border = 'none'
  likeBtn.style.borderRadius = '4px'
  likeBtn.style.cursor = 'pointer'
  likeBtn.style.fontSize = '14px'
  likeBtn.style.marginBottom = '12px'
  likeBtn.style.alignSelf = 'flex-start'
  
  // Check if already liked
  checkIfLiked(postId, username).then(isLiked => {
    likeBtn.textContent = isLiked ? '❤️ Liked' : '🤍 Like'
    likeBtn.addEventListener('click', async () => {
      try {
        if (isLiked) {
          await unlikePost(username, postId)
          likeBtn.textContent = '🤍 Like'
          isLiked = false
        } else {
          await likePost(username, postId)
          likeBtn.textContent = '❤️ Liked'
          isLiked = true
        }
      } catch (error) {
        console.error('Error toggling like:', error)
        alert('Error updating like status')
      }
    })
  })

  detailContainer.append(backBtn, title, author, message, likeBtn)
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
      form.innerHTML = '<p style="text-align: center; color: green;">Post sent! ✓</p>'
      
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
