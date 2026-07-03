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

    function processCSS(o, el) {
        Object.entries(o).forEach(cssElement => {
            const [cssKey, cssValue] = cssElement
            if (isSignal(cssValue)) bind(cssValue, (v) => el.style[cssKey] = v, el)
            else { el.style[cssKey] = cssValue }
        })
    }

    function processEvents(o, el) {
        Object.entries(o).forEach((ar) => {
            const [event, fn] = ar
            el.addEventListener(event, fn)
        })
    }

    function processAttrs(o, el) {
        Object.entries(o).forEach((attritem) => {
            const [attrKey, attrValue] = attritem
            if (isSignal(attrValue)) bind(attrValue, v => el.setAttribute(attrKey, v), el)
            else el.setAttribute(attrKey, attrValue)
        })
    }

    function processDataset(o, el) {
        Object.entries(o).forEach((dataitem) => {
            const [dataKey, dataValue] = dataitem
            if (isSignal(dataValue)) bind(dataValue, v => el.dataset[dataKey] = v, el)
            else el.dataset[dataKey] = dataValue
        })
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
                    if (isSignal(value)) bind(value, v => el.textContent = v, el)
                    else el.textContent = value
                    break
                case "className":
                    if (isSignal(value)) bind(value, v => el.className = v, el)
                    else el.className = value
                    break
                case "id":
                    if (isSignal(value)) bind(value, v => el.id = v, el)
                    else el.id = value
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
                    value.forEach((child) => {
                        if (typeof child === 'function') {
                            // Рендер списков
                            if (child.__isEach) {
                                const placeholder = document.createComment("each");
                                el.appendChild(placeholder);

                                let nodes = [];

                                const update = () => {
                                    nodes.forEach(node => node.remove());
                                    nodes = [];

                                    child.signal.value.forEach(item => {
                                        const [tag, props] = child.render(item);

                                        const node = h(tag, props);

                                        nodes.push(node);

                                        placeholder.parentNode.insertBefore(node, placeholder);
                                    });
                                };

                                update();

                                child.signal._subscribe(update);

                                placeholder.__cleanup ??= [];
                                placeholder.__cleanup.push(() => {
                                    child.signal._unsubscribe(update);
                                });

                                continue;
                            }

                            const placeholder = document.createComment("effect");
                            el.appendChild(placeholder);
                            let currentNode = null;
                            const update = () => {
                                CURRENT_EFFECT = update;
                                const result = child();
                                CURRENT_EFFECT = null;
                                const node = Array.isArray(result)
                                    ? h(result[0], result[1])
                                    : result instanceof Node
                                        ? result
                                        : document.createTextNode(result);

                                if (currentNode) {
                                    currentNode.replaceWith(node);
                                } else {
                                    placeholder.replaceWith(node);
                                }

                                currentNode = node;
                            };
                            update();
                        }
                        else {
                            const [childTag, childProps] = child;
                            el.appendChild(h(childTag, childProps));
                        }
                    });
                    break;
                default:
                    if (isSignal(value)) bind(value, v => el[key] = v, el)
                    else el[key] = value
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