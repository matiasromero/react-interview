export type Lang = 'en' | 'es'

export const messages = {
  en: {
    'app.title': 'todos · a soft place to plan',
    'header.todayIs': 'Today is {date}',

    'addList.placeholder': 'new list',
    'addList.aria': 'Create a new list',
    'addList.nameAria': 'New list name',
    'addList.submit': 'Create list',

    'addTodo.placeholder': 'add a task...',
    'addTodo.aria': 'New task',
    'addTodo.submit': 'Add',

    'listCard.openAria': 'Open list {name}',
    'listCard.renameAria': 'Rename list',
    'listCard.dblClickHint': 'Double-click to rename',

    'activePanel.noTasks': 'no tasks yet',
    'activePanel.doneOfConnector': 'of',
    'activePanel.doneSuffix': 'done',
    'activePanel.allClear': 'all clear',
    'activePanel.addFirst': 'add your first task above',
    'activePanel.renameTitle': 'Rename (or double-click title)',
    'activePanel.renameAriaName': 'Rename list {name}',
    'activePanel.deleteTitle': 'Delete list',
    'activePanel.deleteAriaName': 'Delete list {name}',

    'lists.heading': 'Your lists',
    'lists.aria': 'Your lists',
    'lists.hint': 'double-click a card to rename',

    'empty.noLists': 'no lists yet',
    'empty.startWithOne': 'start with one above',

    'undo.deletedList': 'Deleted "{name}"',
    'undo.deletedItem': 'Deleted "{description}"',
    'undo.button': 'Undo',

    'theme.system': 'system',
    'theme.light': 'light',
    'theme.dark': 'dark',
    'theme.toggleAria': 'Theme: {current}. Click for next.',

    'lang.en': 'English',
    'lang.es': 'Spanish',
    'lang.toggleAria': 'Switch to {target}',

    'connection.connected': 'Live · connected',
    'connection.reconnecting': 'Reconnecting…',
    'connection.disconnected': 'Offline · changes will sync on reconnect',
  },
  es: {
    'app.title': 'tareas · un lugar tranquilo para planear',
    'header.todayIs': 'Hoy es {date}',

    'addList.placeholder': 'lista nueva',
    'addList.aria': 'Crear una lista nueva',
    'addList.nameAria': 'Nombre de la lista nueva',
    'addList.submit': 'Crear lista',

    'addTodo.placeholder': 'agregar una tarea...',
    'addTodo.aria': 'Tarea nueva',
    'addTodo.submit': 'Agregar',

    'listCard.openAria': 'Abrir lista {name}',
    'listCard.renameAria': 'Renombrar lista',
    'listCard.dblClickHint': 'Doble click para renombrar',

    'activePanel.noTasks': 'sin tareas aún',
    'activePanel.doneOfConnector': 'de',
    'activePanel.doneSuffix': 'hechas',
    'activePanel.allClear': 'todo listo',
    'activePanel.addFirst': 'agregá tu primera tarea arriba',
    'activePanel.renameTitle': 'Renombrar (o doble click en el título)',
    'activePanel.renameAriaName': 'Renombrar lista {name}',
    'activePanel.deleteTitle': 'Eliminar lista',
    'activePanel.deleteAriaName': 'Eliminar lista {name}',

    'lists.heading': 'Tus listas',
    'lists.aria': 'Tus listas',
    'lists.hint': 'doble click en una tarjeta para renombrar',

    'empty.noLists': 'sin listas aún',
    'empty.startWithOne': 'empezá con una arriba',

    'undo.deletedList': 'Eliminada "{name}"',
    'undo.deletedItem': 'Eliminada "{description}"',
    'undo.button': 'Deshacer',

    'theme.system': 'sistema',
    'theme.light': 'claro',
    'theme.dark': 'oscuro',
    'theme.toggleAria': 'Tema: {current}. Click para el siguiente.',

    'lang.en': 'Inglés',
    'lang.es': 'Español',
    'lang.toggleAria': 'Cambiar a {target}',

    'connection.connected': 'En vivo · conectado',
    'connection.reconnecting': 'Reconectando…',
    'connection.disconnected': 'Sin conexión · se sincronizará al reconectar',
  },
} as const satisfies Record<Lang, Record<string, string>>

export type MessageKey = keyof (typeof messages)['en']
