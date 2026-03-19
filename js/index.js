import { getAll } from './firebase.js'
import { renderPost } from './renderpost.js'
import { initHeaderOnLoad } from './modules/header.js'
import { addStyling } from './modules/cssadder.js'

initHeaderOnLoad()
addStyling()
getAll().then(() => renderPost())
