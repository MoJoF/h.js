(function (global) {
    let CURRENT_EFFECT = null;

    /**
     * Создание сигнала (реактивная переменная)
    */
    function signal(v) {
        const listeners = new Set()
        return {
            __isSignal: true,
            get value() {
                if (CURRENT_EFFECT) {
                    listeners.add(CURRENT_EFFECT);
                }
                return v
            },
            set value(newValue) {
                v = newValue
                listeners.forEach(fn => fn());
            },
            _subscribe(fn) { listeners.add(fn) },
            _unsubscribe(fn) { listeners.delete(fn) }
        }
    }

    // Проверка, является ли переменная сигналом
    function isSignal(v) {
        return v?.__isSignal === true;
    }

    // Прикрепление подписки
    function bind(signal, setter, el) {
        const update = () => setter(signal.value);

        setter(signal.value);
        signal._subscribe(update);

        if (!el.__cleanup) el.__cleanup = [];

        el.__cleanup.push(() => {
            signal._unsubscribe(update);
        });
    }

    // Рендер array сигналов
    function each(signal, render) {
        return {
            __isEach: true,
            signal,
            render
        };
    }

    // Динамический рендер
    function dynamic(render) {
        const anchor = document.createComment("h-dynamic");
        let currentNode = null;
        const update = () => {
            const newNode = render();
            if (!(newNode instanceof Node)) {
                throw new Error("render() должен возвращать DOM Node");
            }
            if (currentNode) {
                currentNode.replaceWith(newNode);
            } else {
                anchor.replaceWith(newNode);
            }
            currentNode = newNode;
        };
        update();
        return anchor;
    }

    // Удаление элемента
    function unmount(el) {
        if (el.__cleanup) {
            el.__cleanup.forEach(fn => fn());
        }
        el.remove();
    }

    function bindComputed(getter, setter, el) {
        const update = () => {
            CURRENT_EFFECT = update
            setter(getter())
            CURRENT_EFFECT = null
        }
        update()

        if (!el.__cleanup) el.__cleanup = []
        el.__cleanup.push(() => { })
    }

    function processReactive(value, setter, el) {
        if (typeof value === 'function') bindComputed(value, setter, el)
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
        const [childTag, childProps] = child;
        el.appendChild(h(childTag, childProps));
    }

    function normalizeNode(result) {
        if (result instanceof Node)
            return result;
        if (Array.isArray(result)) {
            if (typeof result[0] === "string")
                return h(result[0], result[1]);
            if (result.every(node => node instanceof Node)) {
                const fragment = document.createDocumentFragment();
                result.forEach(node => fragment.appendChild(node));
                return fragment;
            }
        }
        return document.createTextNode(String(result));
    }

    // Динамический рендеринг
    function renderDynamicChild(child, el) {
        const placeholder = document.createComment("effect");
        el.appendChild(placeholder);

        let currentNode = placeholder;

        const update = () => {
            CURRENT_EFFECT = update;
            const result = child();
            CURRENT_EFFECT = null;

            const node = normalizeNode(result);

            currentNode.replaceWith(node);
            currentNode = node;
        };

        update();
    }

    // Рендер списков
    function renderListChild(child, el) {
        const placeholder = document.createComment("each");
        el.appendChild(placeholder);

        let currentNodes = [];

        const update = () => {
            // Удаляем старые элементы
            currentNodes.forEach(unmount);
            currentNodes = [];

            const parent = placeholder.parentNode;
            if (!parent) return;

            const items = child.signal.value;

            for (const item of items) {
                const result = child.render(item);

                const node = result instanceof Node
                    ? result
                    : h(result[0], result[1]);

                currentNodes.push(node);
                parent.insertBefore(node, placeholder);
            }
        };

        update();

        child.signal._subscribe(update);

        placeholder.__cleanup ??= [];
        placeholder.__cleanup.push(() => {
            child.signal._unsubscribe(update);
        });
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

    function h(elementName, props = {}) {
        if (typeof elementName === 'function') {
            return dynamic(elementName);
        }
        const el = document.createElement(elementName)

        el.__cleanup = []

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
         * @prop_view { attrKey, attrValue } — ключ-значение — атрибута
         * 
         * @prop {object} props.on - слушатели событий
         * @prop_view { click: <function> }
         * 
         * @prop {array} props.children - добавление дочерних элементов
         * @prop_view children: [["название_тега", { props }], ["название_тега", { props }]] - создание дочерних элементов
         * 
         * @prop {object} props.dataset - инициализация data-атрибутов
         * @prop_view { dataKey, dataValue } — ключ-значение — атрибута
        */

        for (const [key, value] of Object.entries(props)) {
            switch (key) {
                case "css":
                    processCSS(value, el)
                    break
                case "text":
                    processText(value, el)
                    break
                case "className":
                    processClassName(value, el)
                    break
                case "id":
                    processId(value, el)
                    break
                case "on":
                    processEvents(value, el)
                    break
                case "attrs":
                    processAttrs(value, el)
                    break
                case "dataset":
                    processDataset(value, el)
                    break
                case "children":
                    processChildren(value, el)
                    break;
                default:
                    processDefault(value, key, el)
                    break
            }
        }
        return el
    }

    h.unmount = unmount
    h.signal = signal
    h.each = each

    window.h = h
})(window)