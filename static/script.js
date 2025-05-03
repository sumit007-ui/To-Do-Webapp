document.addEventListener('DOMContentLoaded', () => {
    let todos = JSON.parse(localStorage.getItem('todos')) || [];
    
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const addBtn = document.getElementById('add-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const editModal = document.getElementById('editModal');
    const editInput = document.getElementById('edit-input');
    const saveBtn = document.querySelector('.save-btn');
    
    let currentFilter = 'all';
    let currentEditIndex = -1;

    // Initial render
    renderTodos();

    // Add todo
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') addTodo();
    });

    // Filter todos
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });

    // Todo actions
    todoList.addEventListener('click', (e) => {
        const todoItem = e.target.closest('.todo-item');
        if(!todoItem) return;
        
        const index = Array.from(todoList.children).indexOf(todoItem);
        
        if(e.target.closest('.complete-btn')) {
            toggleComplete(index);
        }
        if(e.target.closest('.edit-btn')) {
            openEditModal(index);
        }
        if(e.target.closest('.delete-btn')) {
            deleteTodo(index);
        }
    });

    // Modal handling
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if(e.target === editModal) closeModal();
    });
    saveBtn.addEventListener('click', saveEdit);

    function addTodo() {
        const text = todoInput.value.trim();
        if(text === '') {
            todoInput.classList.add('error');
            setTimeout(() => todoInput.classList.remove('error'), 500);
            return;
        }
        
        todos.push({ text, completed: false });
        saveTodos();
        renderTodos();
        todoInput.value = '';
    }

    function toggleComplete(index) {
        todos[index].completed = !todos[index].completed;
        saveTodos();
        renderTodos();
    }

    function deleteTodo(index) {
        if(confirm('Are you sure you want to delete this task?')) {
            todos.splice(index, 1);
            saveTodos();
            renderTodos();
        }
    }

    function openEditModal(index) {
        currentEditIndex = index;
        editInput.value = todos[index].text;
        editModal.style.display = 'flex';
    }

    function saveEdit() {
        todos[currentEditIndex].text = editInput.value.trim();
        saveTodos();
        renderTodos();
        closeModal();
    }

    function closeModal() {
        editModal.style.display = 'none';
        currentEditIndex = -1;
    }

    function renderTodos() {
        todoList.innerHTML = '';
        const filteredTodos = todos.filter(todo => {
            if(currentFilter === 'active') return !todo.completed;
            if(currentFilter === 'completed') return todo.completed;
            return true;
        });

        if(filteredTodos.length === 0) {
            todoList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No tasks found</p>
                </div>
            `;
            return;
        }

        filteredTodos.forEach((todo, index) => {
            const todoItem = document.createElement('div');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : ''}`;
            todoItem.innerHTML = `
                <button class="complete-btn action-btn">
                    <i class="fas fa-${todo.completed ? 'check-circle' : 'circle'}"></i>
                </button>
                <span class="todo-text">${todo.text}</span>
                <div class="todo-actions">
                    <button class="edit-btn action-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn action-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            todoList.appendChild(todoItem);
        });

        updateStats();
    }

    function updateStats() {
        document.getElementById('total-tasks').textContent = 
            `${todos.length} ${todos.length === 1 ? 'task' : 'tasks'}`;
        const completed = todos.filter(todo => todo.completed).length;
        document.getElementById('completed-tasks').textContent = 
            `${completed} completed`;
    }

    function saveTodos() {
        localStorage.setItem('todos', JSON.stringify(todos));
    }
});