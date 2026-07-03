# h.js

> Минималистичная реактивная библиотека для создания пользовательских интерфейсов без Virtual DOM.

h.js позволяет создавать интерфейсы, используя обычный JavaScript и настоящий DOM. Вместо виртуального дерева библиотека обновляет только те элементы, которые действительно изменились.

---

# Почему h.js?

Большинство современных библиотек используют Virtual DOM или сложные шаблонизаторы.

h.js придерживается другого подхода:

* использует настоящий DOM;
* обновляет только изменившиеся элементы;
* не требует JSX;
* не использует шаблоны;
* не имеет зависимостей.

---

# Установка

Подключите библиотеку:

```html
<script src="h.js"></script>
```

После подключения становится доступен глобальный объект `h`.

---

# Создание первого элемента

Создадим простой заголовок.

```javascript
const title = h("h1", {
    text: "Добро пожаловать!"
});

document.body.appendChild(title);
```

Результат:

```html
<h1>Добро пожаловать!</h1>
```

---

# Добавление стилей

Стили передаются через объект `css`.

```javascript
const card = h("div", {
    text: "Карточка",
    css: {
        width: "200px",
        padding: "20px",
        background: "#3498db",
        color: "white",
        borderRadius: "10px"
    }
});

document.body.appendChild(card);
```

---

# Создание дочерних элементов

Для создания вложенных элементов используется свойство `children`.

```javascript
const app = h("main", {
    children: [
        ["h1", { text: "Главная страница" }],
        ["p", { text: "Это описание страницы." }],
        ["button", { text: "Нажми меня" }]
    ]
});

document.body.appendChild(app);
```

---

# События

Все обработчики передаются через объект `on`.

```javascript
const button = h("button", {
    text: "Нажми",
    on: { click() { alert("Кнопка нажата!"); }
    }
});

document.body.appendChild(button);
```

Можно использовать стрелочные функции.

```javascript
const button = h("button", {
    text: "Увеличить",
    on: { click: () => console.log("Click") }
});
```

---

# Signals

Signals — основной механизм реактивности.

Создадим счётчик.

```javascript
const count = h.signal(0);
```

Изменить значение можно так:

```javascript
count.value++;
```

Получить текущее значение:

```javascript
console.log(count.value);
```

---

# Реактивный текст

Передайте сигнал в свойство `text`.

```javascript
const count = h.signal(0);

const counter = h("span", { text: count });

document.body.appendChild(counter);
```

Теперь любое изменение

```javascript
count.value++;
```

автоматически обновит содержимое элемента.

---

# Вычисляемые значения

Вместо сигнала можно передать функцию.

```javascript
const count = h.signal(0);

const title = h("h1", {
    text: () => `Количество: ${count.value}`
});
```

При изменении сигнала функция автоматически выполнится снова.

---

# Реактивные стили

Любое CSS-свойство тоже может быть вычисляемым.

```javascript
const online = h.signal(false);

const status = h("div", {
    text: "Статус",
    css: { color: () => online.value ? "green" : "red" }
});
```

---

# Несколько сигналов

Вычисляемые функции могут использовать несколько сигналов одновременно.

```javascript
const firstName = h.signal("Иван");
const lastName = h.signal("Петров");

const user = h("h2", {
    text: () => `${firstName.value} ${lastName.value}`
});
```

Изменение любого сигнала автоматически обновит текст.

---

# Условный рендеринг

В `children` можно передать функцию.

```javascript
const logged = h.signal(false);

const app = h("main", {
    children: [
        () =>
            logged.value
                ? ["h2", { text: "Добро пожаловать!" }]
                : ["button", { text: "Войти" }]
    ]
});
```

При изменении `logged.value` библиотека заменит только этот участок DOM.

---

# Реактивные списки

Создадим список задач.

```javascript
const tasks = h.signal([
    "Изучить HTML",
    "Изучить CSS",
    "Изучить JavaScript"
]);

const list = h("ul", {
    children: h.each(tasks, task => 
        ["li", { text: task }]
    )
});

document.body.appendChild(list);
```

Добавление новой задачи:

```javascript
tasks.value = [
    ...tasks.value,
    "Изучить TypeScript"
];
```

Список автоматически обновится.

---

# Комплексный пример

```javascript
const count = h.signal(0);

const app = h("main", {
    css: {
        padding: "30px",
        display: "flex",
        flexDirection: "column",
        gap: "15px"
    },

    children: [
        ["h1", { text: "h.js Demo" }],
        ["button", {
            text: () => `Нажато ${count.value} раз`,
            on: { click() { count.value++; } }
        }],

        () => count.value >= 5
            ? ["div", { text: "🎉 Отлично!" }]
            : ["div", { text: "Продолжайте нажимать..." }]
    ]
});

document.body.appendChild(app);
```

---

# API

| Метод                    | Описание                            |
| ------------------------ | ----------------------------------- |
| `h(tag, props)`          | Создать DOM-элемент                 |
| `h.signal(value)`        | Создать реактивный сигнал           |
| `h.each(signal, render)` | Реактивный рендер списка            |
| `h.unmount(element)`     | Удалить элемент и очистить подписки |

---

# Лицензия

MIT
