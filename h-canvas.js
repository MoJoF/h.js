(function (h) {
    if (!h?.meta || h.meta.name !== 'h') {
        console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.');
        return
    }

    let canvas
    let ctx
    const scene = h.signal([])

    const drawings = {
        rect: drawRect,
        circle: drawCircle,
        text: drawText
    }

    const clickers = {
        rect: clickRect,
        circle: clickCircle,
        text: clickText
    }

    function unmount(id) { scene.value = scene.value.filter(l => l.id !== id) }
    function getById(id) { return scene.value.find(l => l.id === id) }

    function init(target) {
        if (ctx) return
        canvas = typeof target === 'string' ? document.querySelector(target) : target
        if (!(canvas instanceof HTMLCanvasElement)) throw new Error('The element must be <canvas>')
        ctx = canvas.getContext('2d')

        h.watch(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            scene.value.forEach(el => {
                if (drawings[el.type]) drawings[el.type](el)
            })
        })

        canvas.addEventListener('click', handleCanvasClick)
    }

    function createDisplayObject(type, props, trackedProps) {
        const renderTrigger = h.signal(0)
        const state = {}

        trackedProps.forEach(prop => {
            state['_' + prop] = props[prop] !== undefined ? props[prop] : getDefaultValue(prop)
        })

        const shape = {
            type,
            id: crypto.randomUUID(),
            interactive: props.interactive ?? false,
            onClick: props.onClick
        }

        trackedProps.forEach(prop => {
            Object.defineProperty(shape, prop, {
                get() {
                    renderTrigger.value
                    return state['_' + prop]
                },
                set(newValue) {
                    if (state['_' + prop] !== newValue) {
                        state['_' + prop] = newValue
                        renderTrigger.value++
                    }
                },
                enumerable: true
            })
        })

        scene.value = [...scene.value, shape]
        return shape
    }

    function getDefaultValue(prop) {
        if (prop === 'color' || prop === 'fill') return 'black'
        if (prop === 'font') return '16px sans-serif'
        if (prop === 'text') return ''
        return 0
    }

    // Отрисовка квадрата
    function rect(props = {}) {
        return createDisplayObject('rect', props, ['x', 'y', 'w', 'h', 'r', 'color'])
    }

    // Отрисовка круга
    function circle(props = {}) {
        return createDisplayObject('circle', props, ['x', 'y', 'r', 'color'])
    }

    // Отрисовка текста
    function text(props = {}) {
        return createDisplayObject('text', props, ['x', 'y', 'text', 'font', 'color'])
    }

    // Логика обработки кликов
    function handleCanvasClick(event) {
        const rectBound = canvas.getBoundingClientRect()
        const clickX = event.clientX - rectBound.left
        const clickY = event.clientY - rectBound.top

        let hitItem = null
        let currentScene = scene.value

        for (let i = currentScene.length - 1; i >= 0; i--) {
            const el = currentScene[i]
            if (!el.interactive) continue
            const isHit = clickers[el.type] ? clickers[el.type](el, clickX, clickY) : false
            if (isHit) {
                hitItem = el
                break
            }
        }

        if (hitItem && typeof hitItem.onClick === 'function') {
            hitItem.onClick(event)
        }
    }

    // Отрисовщики
    function drawRect(item) {
        ctx.save()
        ctx.fillStyle = item.color || 'black'
        ctx.beginPath()
        ctx.roundRect(item.x, item.y, item.h, item.r || 0)
        ctx.fill()
        ctx.restore()
    }

    function drawCircle(item) {
        ctx.save()
        ctx.fillStyle = item.color || 'black'
        ctx.beginPath()
        ctx.arc(item.x, item.y, item.r, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
    }

    function drawText(item) {
        ctx.save()
        ctx.fillStyle = item.color || 'black'
        ctx.font = item.font
        ctx.textBaseline = 'top'
        ctx.fillText(item.text, item.x, item.y)
        ctx.restore()
    }

    // Логика попадания клика
    function clickRect(item, clickX, clickY) {
        return clickX >= item.x && clickX <= item.x + item.w &&
            clickY >= item.y && clickY <= item.y + item.h
    }

    function clickCircle(item, clickX, clickY) {
        const distance = Math.hypot(clickX - item.x, clickY - item.y);
        return distance <= item.radius
    }

    function clickText(item, clickX, clickY) {
        ctx.save()
        ctx.font = item.font
        const metrics = ctx.measureText(item.text)
        const width = metrics.width
        const height = parseInt(item.font, 10) || 16
        ctx.restore()
        return clickX >= item.x && clickX <= item.x + width &&
            clickY >= item.y && clickY <= item.y + height
    }


    h.canvas = {
        init,
        rect,
        circle,
        text,
        unmount,
        getById
    }
})(window.h);