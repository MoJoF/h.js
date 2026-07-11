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
     * Создаёт сигнал — реактивную ячейку значения.
     * Чтение .value внутри effect/watch/h() автоматически регистрирует подписку.
     * Запись .value уведомляет всех подписчиков (если значение реально изменилось).
     *
     * @param {*} v - начальное значение
     * @returns {{ value: * }} объект с геттером/сеттером value
     *
     * @example
     * const count = h.signal(0)
     * console.log(count.value) // 0
     * count.value = 5
     * console.log(count.value) // 5
     *
     * @example
     * // Повторная запись того же значения не триггерит подписчиков (Object.is)
     * const flag = h.signal(true)
     * h.watch(() => console.log('изменился:', flag.value))
     * flag.value = true  // ничего не выведет — значение не поменялось
     * flag.value = false // "изменился: false"
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
    function effect(fn, { onError } = {}) {
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
            catch (err) {
                if (onError) onError(err)
                else console.error('[Effect] error: ' + err)
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
        runner.pause = () => { runner.active = false }
        runner.resume = () => {
            runner.active = true
            runner()
        }
        runner()
        return runner
    }

    /**
     * Запускает функцию сразу и повторно — при изменении любых сигналов,
     * прочитанных внутри неё (авто-трекинг через .value).
     * Не привязан к DOM — можно использовать как чистый JS-примитив для side-эффектов.
     *
     * @param {() => (void|function)} fn - функция эффекта; может вернуть cleanup-функцию,
     *   которая вызывается перед каждым перезапуском и при stop()
     * @param {object} [options]
     * @param {(err: Error) => void} [options.onError] - обработчик исключений внутри fn;
     *   по умолчанию просто console.error, выполнение приложения не прерывается
     * @returns {Runner} объект с методами:
     *   - stop() — необратимо остановить, отписаться от всех сигналов, вызвать cleanup
     *   - pause() — временно приостановить реакцию (подписки сохраняются)
     *   - resume() — возобновить после pause(), подхватив пропущенные изменения
     *
     * @example
     * const count = h.signal(0)
     * const stop = h.watch(() => {
     *   console.log('count =', count.value)
     * })
     * count.value = 5 // "count = 5"
     * stop()          // больше не реагирует
     *
     * @example
     * // С cleanup-функцией — аналог return () => {...} из useEffect
     * h.watch(() => {
     *   const id = setInterval(() => console.log('tick'), 1000)
     *   return () => clearInterval(id) // вызовется перед следующим прогоном / при stop()
     * })
     *
     * @example
     * // С обработкой ошибок
     * h.watch(() => {
     *   JSON.parse(invalidJson.value) // может бросить исключение
     * }, {
     *   onError: (err) => console.warn('watch упал:', err.message)
     * })
     *
     * @example
     * // pause/resume
     * const runner = h.watch(() => console.log(count.value))
     * runner.pause()
     * count.value = 100  // тишина, эффект приостановлен
     * runner.resume()    // сразу перезапустится с текущим значением
     */
    const watch = effect

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

    /**
     * Следит за одним конкретным сигналом и передаёт в callback новое и старое значение.
     * В отличие от h.watch(), не использует авто-трекинг — источник указывается явно,
     * что защищает от случайных подписок на лишние сигналы внутри callback.
     *
     * @param {{value: *}} source - сигнал для отслеживания
     * @param {(newValue: *, oldValue: *) => void} callback - вызывается при изменении source
     * @param {object} [options]
     * @param {boolean} [options.immediate=false] - вызвать callback сразу при подписке
     *   (с oldValue === undefined), не дожидаясь первого изменения
     * @returns {() => void} функция для остановки отслеживания
     *
     * @example
     * const count = h.signal(0)
     * const stop = h.watchSource(count, (next, prev) => {
     *   console.log(`было ${prev}, стало ${next}`)
     * })
     * count.value = 5 // "было 0, стало 5"
     * stop()
     *
     * @example
     * // immediate: true — полезно для синхронизации текущего состояния сразу при подписке
     * h.watchSource(count, (next) => {
     *   localStorage.setItem('count', next)
     * }, { immediate: true }) // сразу запишет текущее значение, а не только будущие
     */
    function watchSource(source, callback, { immediate = false } = {}) {
        let oldValue
        let isFirst = true
        const runner = effect(() => {
            const newValue = source.value
            if (immediate || !isFirst) callback(newValue, oldValue)
            oldValue = newValue
            isFirst = false
        })

        return runner.stop
    }

    /**
     * То же самое, что h.watchSource(), но callback вызывается не более одного раза —
     * после первого срабатывания отслеживание автоматически останавливается.
     *
     * @param {{value: *}} source - сигнал для отслеживания
     * @param {(newValue: *, oldValue: *) => void} callback - вызывается один раз
     * @param {object} [options]
     * @param {boolean} [options.immediate=false] - вызвать callback сразу при подписке
     *   и сразу же остановиться, даже не дожидаясь изменения source
     * @returns {Runner} объект эффекта (обычно не нужен — отписка происходит сама)
     *
     * @example
     * const ready = h.signal(false)
     * h.watchOnce(ready, (next, prev) => {
     *   console.log(`ready: ${prev} → ${next}`)
     * })
     * ready.value = true  // "ready: false → true" — сработает один раз
     * ready.value = false // тишина, отслеживание уже остановлено
     *
     * @example
     * // immediate: true — фактически "прочитать значение один раз прямо сейчас"
     * h.watchOnce(count, (next) => {
     *   console.log('стартовое значение:', next)
     * }, { immediate: true })
     */
    function watchOnce(source, callback, { immediate = false } = {}) {
        let runner = null
        let pendingStop = false
        let oldValue
        let isFirst = true

        runner = effect(() => {
            const newValue = source.value

            if (immediate || !isFirst) {
                callback(newValue, oldValue)
                if (runner) stopEffect(runner)
                else pendingStop = true
            }

            oldValue = newValue
            isFirst = false
        })

        if (pendingStop) stopEffect(runner)
        return runner
    }

    // Прикрепление подписки
    function bind(signal, setter, el) {
        const runner = effect(() => { setter(signal.value) })
        el.__cleanup ??= []
        el.__cleanup.push(() => { stopEffect(runner) })
    }

    /**
     * Создаёт реактивный список для использования внутри props.children.
     * При изменении source полностью перестраивает DOM-узлы списка.
     *
     * @param {{value: Array}} source - сигнал, хранящий массив
     * @param {(item: *) => Node|[string, object]} render - функция рендера одного элемента
     * @returns {{__isEach: true, signal, render}} служебный дескриптор для processChildren
     *
     * @example
     * const todos = h.signal(['Купить хлеб', 'Помыть посуду'])
     *
     * const list = h('ul', {
     *   children: h.each(todos, (item) => ['li', { text: item }])
     * })
     *
     * todos.value = [...todos.value, 'Новая задача'] // список перерисуется
     *
     * @example
     * // render может вернуть готовый DOM-узел напрямую вместо [tag, props]
     * h.each(todos, (item) => h('li', { text: item, className: 'todo-item' }))
     */
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

    /**
     * Полностью удаляет элемент из DOM, предварительно останавливая все связанные
     * с ним и его потомками эффекты (event listeners, watch, dynamic-блоки и т.д.).
     * Обязательно использовать вместо el.remove() для узлов, созданных через h(),
     * иначе эффекты внутри продолжат работать в фоне (утечка).
     *
     * @param {Node} el - узел для удаления
     *
     * @example
     * const count = h.signal(0)
     * const panel = h('div', { text: () => `count: ${count.value}` })
     * document.body.appendChild(panel)
     *
     * // ...позже
     * h.unmount(panel) // корректно остановит внутренний watch и уберёт узел из DOM
     * // panel.remove() тут был бы ошибкой — эффект внутри остался бы жив
     */
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
     * Применяет свойства и обработчики событий к уже существующему элементу в DOM.
     * В отличие от h(), не создаёт новый узел — работает с готовой разметкой.
     *
     * @param {string|Element} selector - CSS-селектор или сам DOM-элемент
     * @param {object} [props] - те же свойства, что и в h() (text, css, on, attrs, ...)
     * @returns {Element|null} найденный элемент, или null, если не найден
     *
     * @example
     * // Разметка уже есть в HTML: <div id="app"></div>
     * const count = h.signal(0)
     * h.attach('#app', {
     *   text: () => `Значение: ${count.value}`,
     *   on: { click: () => count.value++ }
     * })
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
     * То же самое, что h.attach(), но применяет props ко всем элементам,
     * соответствующим селектору.
     *
     * @param {string|NodeList} selector - CSS-селектор или готовый NodeList
     * @param {object} [props] - свойства, применяемые к каждому найденному элементу
     * @returns {NodeList} список обработанных элементов
     *
     * @example
     * // <button class="tab">1</button><button class="tab">2</button>...
     * h.attachAll('.tab', {
     *   on: { click: (e) => console.log('клик по табу:', e.target.textContent) }
     * })
     */
    function attachAll(selector, props = {}) {
        const elements = typeof selector === 'string'
            ? document.querySelectorAll(selector)
            : selector
        elements.forEach(el => applyProps(el, props))
        return elements
    }

    /**
     * Создаёт DOM-элемент с заданными свойствами, либо — если передана функция —
     * реактивный блок, который сам перерисовывается при изменении сигналов внутри неё.
     *
     * @param {string|function} elementName - имя тега ('div', 'span', ...) или render-функция
     * @param {object} [props] - свойства элемента (см. processors: css, text, id, className, on, attrs, dataset, children)
     * @returns {Node} DOM-узел (или DocumentFragment, если elementName — функция)
     *
     * @example
     * // Статический элемент
     * const btn = h('button', {
     *   text: 'Нажми меня',
     *   className: 'btn primary',
     *   on: { click: () => alert('клик!') }
     * })
     * document.body.appendChild(btn)
     *
     * @example
     * // Реактивный текст через сигнал
     * const count = h.signal(0)
     * const label = h('span', { text: () => `Счётчик: ${count.value}` })
     *
     * @example
     * // Компонент как функция — пересобирается целиком при изменении сигнала
     * const show = h.signal(true)
     * const Toggle = () => show.value
     *   ? h('div', { text: 'Видно' })
     *   : h('div', { text: 'Скрыто' })
     *
     * document.body.appendChild(h(Toggle))
     */
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

    /**
     * @private
     * h._internals — низкоуровневые примитивы для расширения библиотеки
     * (например, через h._internals.addProcessor() можно добавить свой обработчик props).
     * API нестабилен, обратная совместимость не гарантируется.
     */
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
        watch,
        watchSource,
        watchOnce,
        _internals,
    })

    window.h = h
})(window)