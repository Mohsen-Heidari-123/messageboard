const DEFAULT_FLOWER_IMAGE = 'img/flowers/redFlower.png'
const FLOWER_SIZE = 64
const FLOWER_IMAGES = [
  'img/flowers/blueFlower.png',
  'img/flowers/greenFlower.png',
  'img/flowers/pinkFlower.png',
  'img/flowers/purpleFlower.png',
  'img/flowers/redFlower.png',
  'img/flowers/yellowFlower.png'
]

export function renderFlower (imageSrc = DEFAULT_FLOWER_IMAGE) {
  const garden =
    document.getElementById('garden') ??
    document.querySelector('.garden-wrapper')

  if (!garden) {
    return null
  }

  const flower = document.createElement('img')
  const maxLeft = Math.max(garden.clientWidth - FLOWER_SIZE, 0)
  const maxTop = Math.max(garden.clientHeight - FLOWER_SIZE, 0)
  const randomLeft = `${Math.floor(Math.random() * (maxLeft + 1))}px`
  const randomTop = `${Math.floor(Math.random() * (maxTop + 1))}px`

  flower.src = imageSrc
  flower.alt = 'Flower'
  flower.className = 'garden-flower'
  garden.style.position = 'relative'
  flower.style.position = 'absolute'
  flower.style.width = `${FLOWER_SIZE}px`
  flower.style.height = `${FLOWER_SIZE}px`
  flower.style.left = randomLeft
  flower.style.top = randomTop

  garden.append(flower)
  flower.addEventListener('click', () => openFlowerPopup(imageSrc))

  return flower
}

function openFlowerPopup (imageSrc) {
  const existing = document.getElementById('flower-popup')
  if (existing) {
    existing.remove()
  }

  const overlay = document.createElement('div')
  overlay.id = 'flower-popup'

  const box = document.createElement('div')
  box.className = 'flower-popup-box'

  const img = document.createElement('img')
  img.src = imageSrc
  img.alt = 'Flower'

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕'
  closeBtn.className = 'flower-popup-close'
  closeBtn.addEventListener('click', () => overlay.remove())

  overlay.addEventListener('click', event => {
    if (event.target === overlay) {
      overlay.remove()
    }
  })

  box.append(closeBtn, img)
  overlay.append(box)
  document.body.append(overlay)
}

export function renderFlowers (count = 50) {
  const renderedFlowers = []

  for (let index = 0; index < count; index += 1) {
    const randomImage =
      FLOWER_IMAGES[Math.floor(Math.random() * FLOWER_IMAGES.length)]
    const flower = renderFlower(randomImage)

    if (flower) {
      renderedFlowers.push(flower)
    }
  }

  return renderedFlowers
}
