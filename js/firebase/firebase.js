import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js'
import {
  getDatabase,
  ref,
  onValue
} from 'https://www.gstatic.com/firebasejs/12.10.0/firebase-database.js'

// https://firebase.google.com/docs/web/setup#available-libraries
const firebaseConfig = {
  apiKey: 'AIzaSyBYrqmRZmIQjtWQZMSynD0F2wZPWA462tc',
  authDomain: 'messageboard-77286.firebaseapp.com',
  databaseURL:
    'https://messageboard-77286-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'messageboard-77286',
  storageBucket: 'messageboard-77286.firebasestorage.app',
  messagingSenderId: '262402990271',
  appId: '1:262402990271:web:724586d400e56438b0a60a'
}
const app = initializeApp(firebaseConfig)
const db = getDatabase(app)
export const usersRef = ref(db, '/messages')
const url =
  'https://messageboard-77286-default-rtdb.europe-west1.firebasedatabase.app/messages.json'
const messagesBaseUrl =
  'https://messageboard-77286-default-rtdb.europe-west1.firebasedatabase.app/messages'

export const getAll = async () => {
  const response = await fetch(url)
  if (!response.ok) throw new Error(response.status)
  const messages = await response.json()
  console.log(messages)
  return messages
}

export const subscribeToMessages = onData => {
  if (typeof onData !== 'function') {
    return () => {}
  }

  const messagesRef = ref(db, '/messages')
  return onValue(messagesRef, snapshot => {
    onData(snapshot.val() || {})
  })
}

export const setUserOnlineState = async (username, isOnline, options = {}) => {
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername) {
    return
  }

  const onlineResponse = await fetch(
    `${usersUrl}/${encodeURIComponent(cleanUsername)}/online.json`,
    {
      method: 'PUT',
      body: JSON.stringify(Boolean(isOnline)),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      keepalive: Boolean(options.keepalive)
    }
  )

  if (!onlineResponse.ok) {
    throw new Error(onlineResponse.status)
  }

  const lastSeenResponse = await fetch(
    `${usersUrl}/${encodeURIComponent(cleanUsername)}/lastSeen.json`,
    {
      method: 'PUT',
      body: JSON.stringify(Date.now()),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      },
      keepalive: Boolean(options.keepalive)
    }
  )

  if (!lastSeenResponse.ok) {
    throw new Error(lastSeenResponse.status)
  }
}

export const subscribeToOnlineUsers = onData => {
  if (typeof onData !== 'function') {
    return () => {}
  }

  const usersDbRef = ref(db, '/users')
  return onValue(usersDbRef, snapshot => {
    const users = snapshot.val() || {}
    const onlineUsers = Object.entries(users)
      .filter(([, user]) => Boolean(user?.online))
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b))

    onData(onlineUsers)
  })
}

export const postMessage = async (message, name, title) => {
  const newMessage = {
    message: message,
    name: name,
    title: title,
    likes: 0,
    dislikes: 0,
    answer: { name: '', message: '', likes: 0, dislikes: 0 },
    replies: []
  }
  const options = {
    method: 'POST',
    body: JSON.stringify(newMessage),
    headers: {
      'Content-type': 'application/json; charset=UTF-8'
    }
  }

  const response = await fetch(url, options)
  if (!response.ok) throw new Error(response.status)
  const newID = await response.json()
  console.log(newID.name)

  return { id: newID.name, newMessage }
}

export const postReply = async (postId, message, name) => {
  const cleanPostId = String(postId || '').trim()
  if (!cleanPostId) {
    throw new Error('Missing post id')
  }

  const replyPayload = {
    name,
    message,
    createdAt: Date.now(),
    likes: 0,
    dislikes: 0
  }

  const response = await fetch(
    `${messagesBaseUrl}/${encodeURIComponent(cleanPostId)}/replies.json`,
    {
      method: 'POST',
      body: JSON.stringify(replyPayload),
      headers: {
        'Content-type': 'application/json; charset=UTF-8'
      }
    }
  )

  if (!response.ok) {
    throw new Error(response.status)
  }

  const created = await response.json()
  return {
    ...replyPayload,
    id: created?.name || ''
  }
}

const usersUrl =
  'https://messageboard-77286-default-rtdb.europe-west1.firebasedatabase.app/users'

export const registerUser = async (username, password) => {
  const checkResponse = await fetch(
    `${usersUrl}/${encodeURIComponent(username)}.json`
  )
  if (!checkResponse.ok) throw new Error(checkResponse.status)
  const existing = await checkResponse.json()
  if (existing !== null) {
    throw new Error('Username already taken')
  }

  const putResponse = await fetch(
    `${usersUrl}/${encodeURIComponent(username)}.json`,
    {
      method: 'PUT',
      body: JSON.stringify({ password }),
      headers: { 'Content-type': 'application/json; charset=UTF-8' }
    }
  )
  if (!putResponse.ok) throw new Error(putResponse.status)
  return putResponse.json()
}

export const loginUser = async (username, password) => {
  const response = await fetch(
    `${usersUrl}/${encodeURIComponent(username)}.json`
  )
  if (!response.ok) throw new Error(response.status)
  const user = await response.json()
  if (user === null) {
    throw new Error('User not found')
  }
  if (user.password !== password) {
    throw new Error('Incorrect password')
  }
  return true
}

export const isUserAdmin = async username => {
  const cleanUsername = String(username || '').trim()
  if (!cleanUsername) {
    return false
  }

  const response = await fetch(
    `${usersUrl}/${encodeURIComponent(cleanUsername)}.json`
  )
  if (!response.ok) {
    throw new Error(response.status)
  }

  const user = await response.json()
  return Boolean(user?.admin)
}

export const deleteMessagebyId = async id => {
  const cleanId = String(id || '').trim()
  if (!cleanId) {
    throw new Error('Missing message id')
  }

  try {
    const response = await fetch(
      `${messagesBaseUrl}/${encodeURIComponent(cleanId)}.json`,
      { method: 'DELETE' }
    )
    if (!response.ok) {
      throw new Error(response.status)
    }
    console.log('message deleted')
  } catch (err) {
    console.error('message not deleted')
    throw err
  }
}

// Get all posts by a specific user
export const getUserPosts = async username => {
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(response.status)
    const messages = await response.json()

    if (!messages) return {}

    const userPosts = {}
    Object.entries(messages).forEach(([id, message]) => {
      if (message.name === username) {
        userPosts[id] = message
      }
    })
    return userPosts
  } catch (error) {
    console.error('Error fetching user posts:', error)
    throw error
  }
}

// Get user's liked posts
export const getUserLikedPosts = async username => {
  try {
    const likedPostsResponse = await fetch(
      `${usersUrl}/${encodeURIComponent(username)}/liked-posts.json`
    )
    if (!likedPostsResponse.ok) throw new Error(likedPostsResponse.status)
    const likedPostIds = (await likedPostsResponse.json()) || {}

    const postIds = Object.keys(likedPostIds)
    if (postIds.length === 0) return {}

    let allMessages = {}
    try {
      const messagesResponse = await fetch(url)
      if (messagesResponse.ok) {
        allMessages = (await messagesResponse.json()) || {}
      }
    } catch {
      allMessages = {}
    }

    const likedPosts = {}

    for (const postId of postIds) {
      if (allMessages?.[postId]) {
        likedPosts[postId] = allMessages[postId]
        continue
      }

      // Fallback: fetch each liked post directly if bulk fetch is unavailable.
      try {
        const singlePostResponse = await fetch(
          `${messagesBaseUrl}/${encodeURIComponent(postId)}.json`
        )
        if (!singlePostResponse.ok) continue

        const singlePostData = await singlePostResponse.json()
        if (singlePostData) {
          likedPosts[postId] = singlePostData
        }
      } catch {
        // Ignore individual post failures and continue.
      }
    }

    return likedPosts
  } catch (error) {
    console.error('Error fetching liked posts:', error)
    return {}
  }
}

// Like a post
export const likePost = async (username, postId) => {
  try {
    const putResponse = await fetch(
      `${usersUrl}/${encodeURIComponent(
        username
      )}/liked-posts/${encodeURIComponent(postId)}.json`,
      {
        method: 'PUT',
        body: JSON.stringify(true),
        headers: { 'Content-type': 'application/json; charset=UTF-8' }
      }
    )
    if (!putResponse.ok) throw new Error(putResponse.status)

    // Also update the like count on the post
    await updatePostLikes(postId, 1)
    return true
  } catch (error) {
    console.error('Error liking post:', error)
    throw error
  }
}

// Unlike a post
export const unlikePost = async (username, postId) => {
  try {
    const deleteResponse = await fetch(
      `${usersUrl}/${encodeURIComponent(
        username
      )}/liked-posts/${encodeURIComponent(postId)}.json`,
      { method: 'DELETE' }
    )
    if (!deleteResponse.ok) throw new Error(deleteResponse.status)

    // Also update the like count on the post
    await updatePostLikes(postId, -1)
    return true
  } catch (error) {
    console.error('Error unliking post:', error)
    throw error
  }
}

// Update post like count
export const updatePostLikes = async (postId, increment) => {
  try {
    const response = await fetch(
      `${messagesBaseUrl}/${encodeURIComponent(postId)}.json`
    )
    if (!response.ok) throw new Error(response.status)
    const post = await response.json()

    const newLikes = Math.max((post?.likes || 0) + increment, 0)

    const updateResponse = await fetch(
      `${messagesBaseUrl}/${encodeURIComponent(postId)}/likes.json`,
      {
        method: 'PUT',
        body: JSON.stringify(newLikes),
        headers: { 'Content-type': 'application/json; charset=UTF-8' }
      }
    )
    if (!updateResponse.ok) throw new Error(updateResponse.status)
    return true
  } catch (error) {
    console.error('Error updating post likes:', error)
    throw error
  }
}
//like Message
export const LikeMessage = async (id, likes) => {
  const url =
    'https://messageboard-77286-default-rtdb.europe-west1.firebasedatabase.app/messages'
  const options = {
    method: 'PATCH',
    body: JSON.stringify({
      likes: likes + 1
    }),
    headers: {
      'Content-type': 'application/json; charset=UTF-8'
    }
  }
  const response = await fetch(`${url}/${id}.json`, options)
  if (!response.ok) throw new Error(response.status)
  const data = await response.json()
  //console.log(data)
}

//Dislike Message
export const disLikeMessage = async (id, dislikes) => {
  const url =
    'https://messageboard-77286-default-rtdb.europe-west1.firebasedatabase.app/messages'

  const options = {
    method: 'PATCH',
    body: JSON.stringify({
      dislikes: dislikes + 1
    }),
    headers: {
      'Content-type': 'application/json; charset=UTF-8'
    }
  }
  const response = await fetch(`${url}/${id}.json`, options)
  if (!response.ok) throw new Error(response.status)
  const data = await response.json()
  //console.log(data)
}

// Get user's disliked posts
export const getUserDislikedPosts = async username => {
  try {
    const dislikedPostsResponse = await fetch(
      `${usersUrl}/${encodeURIComponent(username)}/disliked-posts.json`
    )
    if (!dislikedPostsResponse.ok) throw new Error(dislikedPostsResponse.status)
    return (await dislikedPostsResponse.json()) || {}
  } catch (error) {
    console.error('Error fetching disliked posts:', error)
    return {}
  }
}

// Update post dislike count
export const updatePostDislikes = async (postId, increment) => {
  try {
    const response = await fetch(
      `${messagesBaseUrl}/${encodeURIComponent(postId)}.json`
    )
    if (!response.ok) throw new Error(response.status)
    const post = await response.json()

    const newDislikes = Math.max((post?.dislikes || 0) + increment, 0)

    const updateResponse = await fetch(
      `${messagesBaseUrl}/${encodeURIComponent(postId)}/dislikes.json`,
      {
        method: 'PUT',
        body: JSON.stringify(newDislikes),
        headers: { 'Content-type': 'application/json; charset=UTF-8' }
      }
    )
    if (!updateResponse.ok) throw new Error(updateResponse.status)
    return true
  } catch (error) {
    console.error('Error updating post dislikes:', error)
    throw error
  }
}

// Dislike a post for user
export const dislikePost = async (username, postId) => {
  try {
    const putResponse = await fetch(
      `${usersUrl}/${encodeURIComponent(
        username
      )}/disliked-posts/${encodeURIComponent(postId)}.json`,
      {
        method: 'PUT',
        body: JSON.stringify(true),
        headers: { 'Content-type': 'application/json; charset=UTF-8' }
      }
    )
    if (!putResponse.ok) throw new Error(putResponse.status)

    await updatePostDislikes(postId, 1)
    return true
  } catch (error) {
    console.error('Error disliking post:', error)
    throw error
  }
}

// Remove dislike from a post for user
export const undislikePost = async (username, postId) => {
  try {
    const deleteResponse = await fetch(
      `${usersUrl}/${encodeURIComponent(
        username
      )}/disliked-posts/${encodeURIComponent(postId)}.json`,
      { method: 'DELETE' }
    )
    if (!deleteResponse.ok) throw new Error(deleteResponse.status)

    await updatePostDislikes(postId, -1)
    return true
  } catch (error) {
    console.error('Error removing dislike from post:', error)
    throw error
  }
}
