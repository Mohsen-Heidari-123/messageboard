import { getAll } from './firebase/firebase.js'
import { renderFlowers } from './rendering/renderflowers.js'


const garden = document.querySelector('#garden')
const searchForm = document.querySelector('#search')

export const searchUser = async () => {
  console.log(searchForm)
  console.log(garden)
  const all = await getAll()

  const form = document.createElement('form')
  form.id = "searchForm"


  const input = document.createElement('input')
  input.type = 'text'
  input.placeholder = 'Search'

  const searchBtn = document.createElement('button')
  searchBtn.type = 'submit'
  searchBtn.textContent = 'Search'


  form.appendChild(input)
  form.appendChild(searchBtn)
  searchForm.appendChild(form)



  form.addEventListener('submit', e => {
    e.preventDefault()

    const search = input.value.toLowerCase()

    const filteredUsers = {}

    console.log(search)

    for (const key in all) {
      const users = all[key]
      //console.log(names)
      if (users.name.toLowerCase() === search) {
        console.log(input.value)
        filteredUsers[key] = users
      }
      garden.innerHTML = ''
      if (Object.keys(filteredUsers).length === 0) {
        const notAUser = document.createElement('p')
        notAUser.classList.add('notFound')
        notAUser.innerText = 'That user does not exist'
        garden.appendChild(notAUser)
      }
    }
    const flowers = renderFlowers(filteredUsers)
   // garden.innerHTML = ''
    flowers.forEach(flower => {
      garden.appendChild(flower)
    })
    input.value = ''
  })
}
