import { getAll } from './firebase/firebase.js'
import { renderFlowers } from './rendering/renderflowers.js'
import { renderPost } from './rendering/renderpost.js'
import { initHeaderOnLoad } from './modules/header.js'
import { addStyling } from './modules/cssadder.js'
import { initAnimalControl } from './modules/animal.js'
import { initTheme } from './modules/theme.js'
import { initCabin } from './modules/cabin.js'

async function initPage () {
  initHeaderOnLoad()
  initTheme()
  await addStyling()
  initAnimalControl()
  initCabin()
  const data = await getAll()
  renderFlowers(data)
}

initPage()
