/**
 * Создание элемента
 * @param {string} elementName - название тега
 * 
 * @param {object} props - свойства
 *  
 * @prop {string} props.text - el.textContent
 * 
 * @prop {object} props.css - инициализация CSS
 * 
 * @prop {string} props.className - добавление className    
 * 
 * @prop {string} props.id - добавление id
 * 
 * @prop {object} props.attrs - инициализация data-атрибутов
 * @prop_view { key, value } — ключ-значение — атрибута
 * 
 * @prop {object} props.on - слушатели событий
 * @prop_view { click: <function> }
 * 
 * @prop {array} props.children - добавление дочерних элементов
 * @prop_view children: [["название_тега", { props }], ["название_тега", { props }]] - создание дочерних элементов
 * 
 * @prop {object} props.dataset - инициализация data-атрибутов
 * @prop_view { key, value } — ключ-значение — атрибута
*/

(function (global) {
    const effectStack = []

    /**
     * Создание сигнала (реактивная переменная)
    */
    function signal(v) {
        const listeners = new Set()
        return {
            __isSignal: true,
            get value() {
                const active = effectStack.at(-1)
                if (active && !listeners.has(active)) {
                    listeners.add(active)
                    active.deps.push(listeners)
                }
                return v
            },
            set value(newValue) {
                if (Object.is(v, newValue)) return
                v = newValue
                for (const fn of [...listeners]) { fn() }
            }
        }
    }

    // Проверка, является ли переменная сигналом
    function isSignal(v) {
        return v?.__isSignal === true
    }

    function cleanupChildren(runner) {
        for (const child of runner.children) { stopEffect(child) }
        runner.children.length = 0
    }

    function runEffectCleanup(runner) {
        if (runner.cleanupFn) {
            runner.cleanupFn()
            runner.cleanupFn = null
        }
    }

    // Работа со стеком эффектов
    function effect(fn) {
        const runner = () => {
            if (!runner.active) return
            runEffectCleanup(runner)
            cleanupEffect(runner)
            cleanupChildren(runner)
            effectStack.push(runner)

            try { 
                const result = fn()
                if (typeof result === 'function') runner.cleanupFn = result
            }
            finally { effectStack.pop() }
        }

        runner.active = true
        runner.deps = []
        runner.children = []
        runner.cleanupFn = null

        const parent = effectStack.at(-1)

        if (parent) {
            runner.parent = parent
            parent.children.push(runner)
        }

        runner.stop = () => stopEffect(runner)
        runner()
        return runner
    }

    function cleanupEffect(runner) {
        runner.deps.forEach(dep => dep.delete(runner))
        runner.deps.length = 0
    }

    function removeNodes(nodes) {
        for (const node of nodes) {
            cleanupNode(node)
            if (node.remove) node.remove()
        }
    }

    function stopEffect(runner) {
        if (!runner || !runner.active) return
        for (const child of runner.children) { stopEffect(child) }
        runner.children.length = 0
        runEffectCleanup(runner)
        cleanupEffect(runner)
        if (runner.parent) {
            const index = runner.parent.children.indexOf(runner)
            if (index !== -1) runner.parent.children.splice(index, 1)
        }
        runner.active = false
    }

    // Прикрепление подписки
    function bind(signal, setter, el) {
        const runner = effect(() => { setter(signal.value) })
        el.__cleanup ??= []
        el.__cleanup.push(() => { stopEffect(runner) })
    }

    // Рендер array сигналов
    function each(source, render) {
        if (!isSignal(source)) throw new Error("h.each() expects a signal")
        return { __isEach: true, signal: source, render }
    }

    // Очистка событий с ноды
    function cleanupNode(el) {
        if (!el) return

        if (el.__cleanup) {
            for (const cleanup of el.__cleanup) { cleanup() }
            delete el.__cleanup
        }

        for (const child of [...el.childNodes]) { cleanupNode(child) }
    }

    // Динамический рендер
    function dynamic(render) {
        const anchor = document.createComment("h-dynamic")
        let currentNode = null
        let initial = true

        const runner = effect(() => {
            const newNode = normalizeNode(render())

            if (initial) {
                // anchor ещё не вставлен вызывающим кодом — просто запоминаем узел
                currentNode = newNode
                initial = false
                return
            }

            cleanupNode(currentNode)
            currentNode.remove()
            anchor.parentNode?.insertBefore(newNode, anchor)
            currentNode = newNode
        })

        anchor.__cleanup ??= []
        anchor.__cleanup.push(() => {
            stopEffect(runner)
            if (currentNode) cleanupNode(currentNode)
        })

        // Первый рендер уже случился синхронно внутри effect() выше —
        // упаковываем узел + якорь во фрагмент, чтобы оба ушли в DOM одним appendChild
        const fragment = document.createDocumentFragment()
        fragment.appendChild(currentNode)
        fragment.appendChild(anchor)
        return fragment
    }

    // Удаление элемента
    function unmount(el) {
        cleanupNode(el)
        el.remove()
    }

    function bindEffect(getter, setter, el) {
        const runner = effect(() => {
            setter(getter())
        })

        el.__cleanup ??= []
        el.__cleanup.push(() => { stopEffect(runner) })
    }

    function processReactive(value, setter, el) {
        if (typeof value === 'function') bindEffect(value, setter, el)
        else if (isSignal(value)) bind(value, setter, el)
        else setter(value)
    }

    function processCSS(css, el) {
        Object.entries(css).forEach(([key, value]) => {
            processReactive(value, v => el.style[key] = v, el)
        })
    }

    function processText(text, el) {
        processReactive(text, v => el.textContent = v, el)
    }

    function processId(id, el) {
        processReactive(id, v => el.id = v, el)
    }

    function processClassName(className, el) {
        processReactive(className, v => el.className = v, el)
    }

    function processEvents(events, el) {
        Object.entries(events).forEach(([event, handler]) => {
            el.addEventListener(event, handler)

            el.__cleanup ??= []

            el.__cleanup.push(() => el.removeEventListener(event, handler))
        })
    }

    function processAttrs(attrs, el) {
        Object.entries(attrs).forEach(([key, value]) => {
            processReactive(value, v => el.setAttribute(key, v), el)
        })
    }

    function processDataset(dataset, el) {
        Object.entries(dataset).forEach(([key, value]) => {
            processReactive(value, v => el.dataset[key] = v, el)
        })
    }

    function processDefault(value, key, el) {
        processReactive(value, v => el[key] = v, el)
    }

    // Статический рендер
    function renderStaticChild(child, el) {
        const [childTag, childProps] = child
        el.appendChild(h(childTag, childProps))
    }

    function normalizeNode(result) {
        if (result instanceof Node)
            return result
        if (Array.isArray(result)) {
            if (typeof result[0] === "string")
                return h(result[0], result[1])
            if (result.every(node => node instanceof Node)) {
                const fragment = document.createDocumentFragment()
                result.forEach(node => fragment.appendChild(node))
                return fragment
            }
        }
        return document.createTextNode(String(result))
    }

    // Динамический рендеринг
    // Динамический рендеринг
    function renderDynamicChild(child, el) {
        const anchor = document.createComment("effect")
        el.appendChild(anchor) // anchor уже в DOM — с этим момента parentNode всегда есть

        let currentNode = null

        const runner = effect(() => {
            const result = child()
            const node = normalizeNode(result)

            if (currentNode) {
                cleanupNode(currentNode)
                currentNode.remove()
            }
            anchor.parentNode.insertBefore(node, anchor)
            currentNode = node
        })

        anchor.__cleanup ??= []
        anchor.__cleanup.push(() => {
            stopEffect(runner)
            if (currentNode) cleanupNode(currentNode)
        })
    }

    // Рендер списков
    function renderListChild(child, el) {
        const placeholder = document.createComment("h-each")
        el.appendChild(placeholder)

        let currentNodes = []

        const runner = effect(() => {
            removeNodes(currentNodes)
            currentNodes = []

            const parent = placeholder.parentNode
            if (!parent) return

            const items = child.signal.value ?? []

            for (const item of items) {
                const result = child.render(item)
                const node = result instanceof Node
                    ? result
                    : h(result[0], result[1])

                currentNodes.push(node)
                parent.insertBefore(node, placeholder)
            }
        })

        placeholder.__cleanup ??= []
        placeholder.__cleanup.push(() => {
            stopEffect(runner)
            removeNodes(currentNodes)
            currentNodes = []
        })
    }

    function processChildren(children, el) {
        if (!Array.isArray(children)) {
            children = [children]
        }

        for (const child of children) {
            if (child?.__isEach) renderListChild(child, el)
            else if (typeof child === 'function') renderDynamicChild(child, el)
            else renderStaticChild(child, el)
        }
    }

    // Обработчики
    const processors = {
        css: processCSS,
        text: processText,
        id: processId,
        className: processClassName,
        on: processEvents,
        attrs: processAttrs,
        dataset: processDataset,
        children: processChildren
    }

    function addProcessor(key, processor) { processors[key] = processor }

    function applyProps(el, props) {
        el.__cleanup ??= []
        for (const [key, value] of Object.entries(props)) {
            const processor = processors[key]
            if (processor) processor(value, el)
            else processDefault(value, key, el)
        }
    }

    /**
     * Функция для привязки обработчиков событий и свойств к существующему элементу в DOM.
     * 
     * Эта функция позволяет выбрать элемент в DOM с помощью CSS-селектора и применить к нему набор свойств и обработчиков событий.Ц
     * @param {string} selector 
     * @param {object} props 
     * @returns 
     */
    function attach(selector, props = {}) {
        const el = typeof selector === 'string'
            ? document.querySelector(selector)
            : selector
        if (!el) return null
        applyProps(el, props)
        return el
    }

    /**
     * Функция для привязки обработчиков событий и свойств ко всем элементам, соответствующим CSS-селектору.
     * 
     * Эта функция позволяет выбрать все элементы в DOM, соответствующие CSS-селектору, и применить к ним набор свойств и обработчиков событий.
     * @param {string} selector 
     * @param {object} props 
     * @returns 
     */
    function attachAll(selector, props = {}) {
        const elements = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : selector
        elements.forEach(el => applyProps(el, props))
        return elements
    }

    function h(elementName, props = {}) {
        if (typeof elementName === 'function') return dynamic(elementName)
        if (typeof elementName !== 'string') throw new Error('h() expects tag name or render function')

        const el = document.createElement(elementName)
        applyProps(el, props)
        return el
    }

    const meta = {
        name: 'h',
        version: '1.1.0',
        description: 'A lightweight reactive DOM library for creating and managing HTML elements with support for signals, dynamic rendering, and event handling.',
    }

    const _internals = {
        addProcessor,
        bind,
        bindEffect,
        effect,
        stopEffect,
        normalizeNode
    }

    Object.assign(h, {
        meta,
        unmount,
        signal,
        each,
        attach,
        attachAll,
        watch: effect,
        _internals,
    })

    window.h = h
})(window)