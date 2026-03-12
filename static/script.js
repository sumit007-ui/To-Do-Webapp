document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const todoList = document.getElementById('todo-list');
    const addBtn = document.getElementById('add-btn');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const editModal = document.getElementById('editModal');
    const editInput = document.getElementById('edit-input');
    const editPriority = document.getElementById('edit-priority');
    const editCategory = document.getElementById('edit-category');
    const editDueDate = document.getElementById('edit-due-date');
    const saveBtn = document.querySelector('.save-btn');
    const prioritySelect = document.getElementById('priority-select');
    const categoryInput = document.getElementById('category-input');
    const dueDateInput = document.getElementById('due-date-input');
    
    let currentFilter = 'all';
    let currentEditId = null;

    // Initial fetch
    fetchTodos();

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
            fetchTodos();
        });
    });

    // Modal handling
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if(e.target === editModal) closeModal();
    });
    saveBtn.addEventListener('click', saveEdit);

    async function fetchTodos() {
        try {
            const response = await fetch('/api/todos');
            const todos = await response.json();
            renderTodos(todos);
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    }

    async function addTodo() {
        const text = todoInput.value.trim();
        if(text === '') {
            todoInput.classList.add('error');
            setTimeout(() => todoInput.classList.remove('error'), 500);
            return;
        }
        
        const data = {
            title: text,
            priority: prioritySelect.value,
            category: categoryInput.value || 'General',
            due_date: dueDateInput.value || null
        };

        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if(response.ok) {
                todoInput.value = '';
                categoryInput.value = '';
                dueDateInput.value = '';
                fetchTodos();
            }
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    }

    async function toggleComplete(id, completed) {
        try {
            await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !completed })
            });
            fetchTodos();
        } catch (error) {
            console.error('Error toggling complete:', error);
        }
    }

    async function deleteTodo(id) {
        // Removed confirm() for direct deletion as requested
        try {
            const response = await fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            });
            if(response.ok) {
                fetchTodos();
            }
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }

    function openEditModal(todo) {
        currentEditId = todo.id;
        editInput.value = todo.title;
        editPriority.value = todo.priority;
        editCategory.value = todo.category;
        editDueDate.value = todo.due_date || '';
        editModal.style.display = 'flex';
    }

    async function saveEdit() {
        const data = {
            title: editInput.value.trim(),
            priority: editPriority.value,
            category: editCategory.value,
            due_date: editDueDate.value || null
        };

        try {
            const response = await fetch(`/api/todos/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if(response.ok) {
                fetchTodos();
                closeModal();
            }
        } catch (error) {
            console.error('Error saving edit:', error);
        }
    }

    function closeModal() {
        editModal.style.display = 'none';
        currentEditId = null;
    }

    function renderTodos(todos) {
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

        filteredTodos.forEach(todo => {
            const todoItem = document.createElement('div');
            todoItem.className = `todo-item ${todo.completed ? 'completed' : ''} priority-${todo.priority}`;
            todoItem.innerHTML = `
                <button class="complete-btn action-btn">
                    <i class="fas fa-${todo.completed ? 'check-circle' : 'circle'}"></i>
                </button>
                <div class="todo-content">
                    <span class="todo-text">${todo.title}</span>
                    <div class="todo-meta">
                        <span class="category-tag"><i class="fas fa-tag"></i> ${todo.category}</span>
                        ${todo.due_date ? `<span class="due-date"><i class="fas fa-calendar"></i> ${todo.due_date}</span>` : ''}
                        <span class="priority-badge">${todo.priority}</span>
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="edit-btn action-btn" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn action-btn" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            todoItem.querySelector('.complete-btn').onclick = () => toggleComplete(todo.id, todo.completed);
            todoItem.querySelector('.edit-btn').onclick = () => openEditModal(todo);
            todoItem.querySelector('.delete-btn').onclick = () => deleteTodo(todo.id);
            
            todoList.appendChild(todoItem);
        });

        updateStats(todos);
    }

    function updateStats(todos) {
        document.getElementById('total-tasks').textContent = 
            `${todos.length} ${todos.length === 1 ? 'task' : 'tasks'}`;
        const completed = todos.filter(todo => todo.completed).length;
        document.getElementById('completed-tasks').textContent = 
            `${completed} completed`;
    }
});