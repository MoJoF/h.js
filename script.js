document.addEventListener("DOMContentLoaded", function () {
    // const count = h.signal(0);

    // document.body.appendChild(
    //     h("span", { id: 'status' })
    // )

    // const app = h("main", {
    //     css: {
    //         padding: "30px",
    //         display: "flex",
    //         flexDirection: "column",
    //         gap: "15px"
    //     },

    //     children: [
    //         ["h1", { text: "h.js Demo" }],

    //         ["button", {
    //             text: () => `Нажато ${count.value} раз`,
    //             on: { click() { count.value++; } }
    //         }],

    //         // ИСПРАВЛЕНО: Добавили параграфы прямо в дерево, чтобы они отрендерились
    //         ["p", { text: "Первый анимированный параграф" }],
    //         ["p", { text: "Второй анимированный параграф" }],

    //         () => count.value >= 5
    //             ? ["div", {
    //                 text: "🎉 Отлично! Нажми сюда для анимации",
    //                 css: { cursor: "pointer", fontWeight: "bold", color: "green" },
    //                 on: {
    //                     click: () => {
    //                         // Находит созданные выше теги 'p' и запускает плагин
    //                         h.attachAll('p', {
    //                             animate: {
    //                                 duration: 500,
    //                                 transform: 'translateX(100px)',
    //                                 onUpdate: ({ progress }) => h.attach('#status', { text: () => (progress * 100).toFixed(2) + '%' }),
    //                                 onStart: () => h.attach('#status', { text: 'Start' }),
    //                                 onComplete: () => h.attach('#status', { text: 'Complete' })
    //                             }
    //                         })
    //                     }
    //                 }
    //             }]
    //             : ["div", { text: "Продолжайте нажимать..." }]
    //     ]
    // });

    // document.body.appendChild(app);

    // // Теперь эта строка успешно свяжет сигнал со всеми параграфами p
    // h.attachAll('p', { text: () => `Счетчик в тексте: ${count.value}` });

    // const name = h.signal('Max')
    // h.watchSource(count, (newValue, oldValue) => console.log(`Значение count изменено с ${oldValue} на ${newValue}`))
    // const all = h.computed(() => count.value + ' ' + name.value)
    // document.body.appendChild(h('h1', { text: all }))


    // const items = h.signal([
    //     { id: 1, text: 'a' },
    //     { id: 2, text: 'b' },
    //     { id: 3, text: 'c' },
    // ])

    // const list = h('ul', {
    //     children: h.each(items, (item) => ['li', { text: item.text }], item => item.id)
    // })
    // document.body.appendChild(list)

    
    
    // const nameLocal = h.persisted('name', 'Max', { storage: sessionStorage })
    
    // document.body.appendChild(h('input', { on: { input: (e) => nameLocal.value === 'delete' ? nameLocal.destroy() : nameLocal.value = e.target.value } }))
    
    // // Переставляем местами первый и последний — без keyFn все 3 <li> пересоздались бы.
    // // С keyFn — все три ноды переиспользуются, просто physically переставляются местами в DOM.
    // items.value = [
    //     { id: 3, text: 'c' },
    //     { id: 2, text: 'b' },
    //     { id: 1, text: 'a' },
    // ]

    // const f = h.resource(() => fetch('https://jsonplaceholder.typicode.com/todos/').then(resp => resp.json()))

    // const TodosList = () => {
    //     const state = f.value

    //     if (state.loading) return h('p', { text: 'Загрузка' })
    //     if (state.error) return h('p', { text: 'Ошибка загрузки' })
        
    //     /**
    //      * title
    //      * completed
    //      */

    //     return h('ul', { children: state.data.map(todo => ['li', { children: [
    //         ['input', { type: 'checkbox', checked: todo.completed }],
    //         ['label', { text: todo.title }]
    //     ] }]) })
    // }

    // document.body.appendChild(h(TodosList))

    h.canvas.init('canvas', { width: window.innerWidth, height: window.innerHeight })
    const R = h.canvas.rect({ x: 10, y: 10, w: 200, h: 250, r: 10, color: 'blue' })

    const xText = h.canvas.text({ x: 1760, y: 35, text: 'x:', font: "20px 'Trebuchet MS'" })
    const xInput = h.canvas.input({ x: 1790, y: 30, w: 100, h: 30, onUpdate: (value) => { R.x = value } })

    const yText = h.canvas.text({ x: 1760, y: 75, text: 'y:', font: "20px 'Trebuchet MS'" })
    const yInput = h.canvas.input({ x: 1790, y: 70, w: 100, h: 30, onUpdate: (value) => { R.y = value } })

    const rText = h.canvas.text({ x: 1760, y: 115, text: 'r:', font: "20px 'Trebuchet MS'" })
    const rInput = h.canvas.input({ x: 1790, y: 110, w: 100, h: 30, onUpdate: (value) => { R.r = value } })

    const colorText = h.canvas.text({ x: 1730, y: 155, text: 'Цвет:', font: "20px 'Trebuchet MS'" })
    const colorInput = h.canvas.input({ x: 1790, y: 150, w: 100, h: 30, onUpdate: (value) => { R.color = value } })

    const wText = h.canvas.text({ x: 1700, y: 195, text: 'Ширина:', font: "20px 'Trebuchet MS'" })
    const wInput = h.canvas.input({ x: 1790, y: 190, w: 100, h: 30, onUpdate: (value) => { R.w = value } })
});