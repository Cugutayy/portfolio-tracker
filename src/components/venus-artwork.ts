// Give the sea, sky and trees more of the extra width between the figures.
const expansionProfile = [
  [0, 1.8], [.11, 2], [.22, .23], [.378, .23], [.419, 1.65], [.461, 1.9],
  [.49, .23], [.60, .20], [.639, 1.72], [.692, 1.18], [.729, .29],
  [.838, .23], [.906, 1.70], [1, 2.2],
] as const

const columnCount = 256
const columnWeights = Array.from({ length: columnCount }, (_, index) => {
  const position = (index + .5) / columnCount
  const end = expansionProfile.findIndex(([x]) => x > position)
  const [left, low] = expansionProfile[end - 1]
  const [right, high] = expansionProfile[end]
  const progress = (position - left) / (right - left)
  const eased = (1 - Math.cos(Math.PI * progress)) / 2
  return low + (high - low) * eased
})
const totalWeight = columnWeights.reduce((sum, weight) => sum + weight, 0)

export function fitVenusArtwork(image: HTMLImageElement, canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) return

  let bitmap: ImageBitmap | undefined
  let preparedSource = ''
  let preparingSource = ''
  let renderedSource = ''
  let disposed = false
  let frame = 0
  function draw() {
    if (!image.naturalWidth) return

    const { width, height } = image.getBoundingClientRect()
    const naturalWidth = height * image.naturalWidth / image.naturalHeight
    const extraWidth = width - naturalWidth
    if (!height || extraWidth <= 2) {
      if (!canvas.hidden) {
        canvas.hidden = true
        canvas.width = canvas.height = 1
      }
      return
    }
    if (image.currentSrc !== preparedSource) {
      if (image.complete && image.currentSrc !== preparingSource) {
        preparingSource = image.currentSrc
        void prepareImage(preparingSource)
      }
      return
    }

    const scale = Math.min(
      window.devicePixelRatio, 2,
      8192 / Math.max(width, height),
      Math.sqrt(16_000_000 / (width * height)),
    )
    const pixelWidth = Math.round(width * scale)
    const pixelHeight = Math.round(height * scale)
    if (renderedSource === image.currentSrc && !canvas.hidden &&
        canvas.width === pixelWidth && canvas.height === pixelHeight) return

    canvas.width = pixelWidth
    canvas.height = pixelHeight

    const source = bitmap ?? image
    const sourceHeight = bitmap?.height ?? image.naturalHeight
    const sourceStep = (bitmap?.width ?? image.naturalWidth) / columnCount
    const baseStep = pixelHeight * image.naturalWidth / image.naturalHeight / columnCount
    const extraStep = (pixelWidth - baseStep * columnCount) / totalWeight
    let boundary = 0
    let left = 0

    columnWeights.forEach((weight, index) => {
      boundary += baseStep + extraStep * weight
      const right = Math.round(boundary)
      context.drawImage(
        source, index * sourceStep, 0, sourceStep, sourceHeight,
        left, 0, right - left, pixelHeight,
      )
      left = right
    })

    renderedSource = image.currentSrc
    canvas.hidden = context.isContextLost?.() === true
  }

  function scheduleDraw() {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      draw()
    })
  }

  async function prepareImage(source: string) {
    let prepared: ImageBitmap | undefined
    try {
      const height = Math.min(image.naturalHeight, 2160)
      const width = Math.round(height * image.naturalWidth / image.naturalHeight)
      prepared = await createImageBitmap(image, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' })
    } catch {
      try {
        await image.decode()
      } catch {
        return
      }
    } finally {
      if (preparingSource === source) preparingSource = ''
    }
    if (disposed || source !== image.currentSrc) {
      prepared?.close()
      return
    }
    bitmap?.close()
    bitmap = prepared
    preparedSource = source
    scheduleDraw()
  }

  const observer = new ResizeObserver(scheduleDraw)
  observer.observe(image)
  image.addEventListener('load', scheduleDraw)
  window.addEventListener('resize', scheduleDraw)
  scheduleDraw()

  return () => {
    disposed = true
    cancelAnimationFrame(frame)
    bitmap?.close()
    observer.disconnect()
    image.removeEventListener('load', scheduleDraw)
    window.removeEventListener('resize', scheduleDraw)
  }
}
