(function (h) {
    if (!h?.meta || h.meta.name !== 'h') {
        console.error('h.js is not loaded or is not the correct version. Please ensure that h.js is included before this script and that it is the correct version.');
        return
    }

    let canvas
    let ctx
    let focusedInput = h.signal(null)
    let caretVisible = true
    let caretInterval = null

    const scene = h.signal([])

    const drawings = {
        rect: drawRect,
        circle: drawCircle,
        text: drawText,
        input: drawInput,
    }

    const clickers = {
        rect: clickRect,
        circle: clickCircle,
        text: clickText,
        input: clickRect
    }

    function unmount(id) { scene.value = scene.value.filter(l => l.id !== id) }
    function getById(id) { return scene.value.find(l => l.id === id) }

    // Каретка в input
    function startCaretBlinking() {
        if (caretInterval) clearInterval(caretInterval)
        caretInterval = setInterval(() => {
            caretVisible = !caretVisible
            scene.value = [...scene.value]
        }, 500)
    }

    function init(target, params = {}) {
        if (ctx) return
        canvas = typeof target === 'string' ? document.querySelector(target) : target
        if (!(canvas instanceof HTMLCanvasElement)) throw new Error('The element must be <canvas>')
        ctx = canvas.getContext('2d')

        if (params.width) canvas.width = params.width
        if (params.height) canvas.height = params.height

        h.watch(() => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            scene.value.forEach(el => {
                if (drawings[el.type]) drawings[el.type](el)
            })
        })

        canvas.addEventListener('click', handleCanvasClick)
        window.addEventListener('keydown', handleKeydown)
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
        if (prop === 'borderColor') return '#cccccc'
        if (prop === 'w') return 150
        if (prop === 'h') return 30
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

    // Отрисовка input
    function input(props = {}) {
        const shape = createDisplayObject('input', props, ['x', 'y', 'w', 'h', 'text', 'font', 'color', 'borderColor'])
        shape.interactive = true
        shape.onUpdate = props.onUpdate || null
        shape.getValue = function () { return shape.text }
        shape.setValue = function (newValue) {
            const stringValue = String(newValue)
            shape.text = stringValue
            if (typeof shape.onUpdate === 'function') shape.onUpdate(stringValue) 
        }
        return shape
    }

    // Обработка клавиш
    function handleKeydown(event) {
        if (!focusedInput.value) return
        if (event.key === 'Backspace' || event.key === ' ') event.preventDefault()

        if (event.key === 'Backspace') focusedInput.value.setValue(focusedInput.value.getValue().slice(0, -1))
        else if (event.key.length === 1) focusedInput.value.setValue(focusedInput.value.getValue() + event.key)
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

        if (hitItem && hitItem.type === 'input') {
            focusedInput.value = hitItem
            startCaretBlinking()
        } else {
            focusedInput.value = null
            if (caretInterval) clearInterval(caretInterval)
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
        ctx.roundRect(item.x, item.y, item.w, item.h, item.r || 0)
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

    function drawInput(item) {
        ctx.save()

        const isFocused = (focusedInput.value === item)
        const paddingLeft = 8
        const paddingRight = 8
        const allowedWidth = item.w - paddingLeft - paddingRight
        const textY = item.y + item.h / 2

        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.roundRect(item.x, item.y, item.w, item.h, 4)
        ctx.fill()

        ctx.strokeStyle = isFocused ? '#0c8ce9' : '#cccccc'
        ctx.lineWidth = isFocused ? 2 : 1
        ctx.stroke()

        ctx.save()

        ctx.beginPath()
        ctx.rect(item.x + paddingLeft, item.y, allowedWidth, item.h)
        ctx.clip() 

        ctx.fillStyle = item.color || 'black'
        ctx.font = item.font || '14px sans-serif'
        ctx.textBaseline = 'middle'

        const textWidth = ctx.measureText(item.text).width

        let scrollX = 0
        if (textWidth > allowedWidth) {
            scrollX = textWidth - allowedWidth
        }

        const drawX = item.x + paddingLeft - scrollX

        ctx.fillText(item.text, drawX, textY)

        if (isFocused && caretVisible) {
            const caretX = drawX + textWidth
            const caretHeight = parseInt(item.font, 10) || 14

            ctx.strokeStyle = '#0c8ce9'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(caretX, textY - caretHeight / 2)
            ctx.lineTo(caretX, textY + caretHeight / 2)
            ctx.stroke()
        }

        ctx.restore() 
        ctx.restore()
    }


    // Логика попадания клика
    function clickRect(item, clickX, clickY) {
        return clickX >= item.x && clickX <= item.x + item.w &&
            clickY >= item.y && clickY <= item.y + item.h
    }

    function clickCircle(item, clickX, clickY) {
        const distance = Math.hypot(clickX - item.x, clickY - item.y);
        return distance <= item.r
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
        input,
        unmount,
        getById
    }
})(window.h);