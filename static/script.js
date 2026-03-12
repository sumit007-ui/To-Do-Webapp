document.addEventListener('DOMContentLoaded', () => {
    const todoForm = document.getElementById('todo-form');
    const todoContainer = document.getElementById('todo-container');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const statTotal = document.getElementById('stat-total');
    const statCompleted = document.getElementById('stat-completed');
    
    // Modal Selectors
    const editModal = document.getElementById('editModal');
    const closeModal = document.getElementById('closeModal');
    const editForm = document.getElementById('edit-form');
    
    let todos = [];
    let currentFilter = 'all';

    // Fetch Initial Todos
    fetchTodos();

    todoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('todo-title').value.trim();
        const priority = document.getElementById('todo-priority').value;
        const category = document.getElementById('todo-category').value;
        const dueDate = document.getElementById('todo-due').value;

        if (!title) return;

        const newTodo = {
            title,
            priority,
            category,
            due_date: dueDate || null
        };

        try {
            const res = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newTodo)
            });
            const data = await res.json();
            todos.unshift(data);
            todoForm.reset();
            renderTodos();
        } catch (error) {
            console.error('Error adding todo:', error);
        }
    });

    // Close Modal
    closeModal.addEventListener('click', () => {
        editModal.classList.remove('show');
    });

    window.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.remove('show');
        }
    });

    // Edit Form submit
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-id').value;
        const title = document.getElementById('edit-title').value.trim();
        const priority = document.getElementById('edit-priority').value;
        const category = document.getElementById('edit-category').value;
        const dueDate = document.getElementById('edit-due').value;

        if (!title) return;

        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title,
                    priority,
                    category,
                    due_date: dueDate || null
                })
            });
            const updatedTodo = await res.json();
            todos = todos.map(todo => todo.id === updatedTodo.id ? updatedTodo : todo);
            editModal.classList.remove('show');
            renderTodos();
        } catch (error) {
            console.error('Error updating todo:', error);
        }
    });

    // Filtering
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderTodos();
        });
    });

    async function fetchTodos() {
        try {
            const res = await fetch('/api/todos');
            todos = await res.json();
            renderTodos();
        } catch (error) {
            console.error('Error fetching todos:', error);
        }
    }

    async function toggleComplete(id, currentStatus) {
        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: !currentStatus })
            });
            const updatedTodo = await res.json();
            todos = todos.map(todo => todo.id === updatedTodo.id ? updatedTodo : todo);
            renderTodos();
        } catch (error) {
            console.error('Error toggling complete:', error);
        }
    }

    async function deleteTodo(id) {
        try {
            await fetch(`/api/todos/${id}`, {
                method: 'DELETE'
            });
            todos = todos.filter(todo => todo.id !== id);
            renderTodos();
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
    }

    function openEditModal(id) {
        const todo = todos.find(t => t.id === id);
        if (!todo) return;
        
        document.getElementById('edit-id').value = todo.id;
        document.getElementById('edit-title').value = todo.title;
        document.getElementById('edit-priority').value = todo.priority;
        document.getElementById('edit-category').value = todo.category || 'General';
        document.getElementById('edit-due').value = todo.due_date || '';
        
        editModal.classList.add('show');
    }

    // Making functions globally available for inline onclick
    window.toggleComplete = toggleComplete;
    window.deleteTodo = deleteTodo;
    window.openEditModal = openEditModal;

    function renderTodos() {
        const filteredTodos = todos.filter(todo => {
            if (currentFilter === 'active') return !todo.completed;
            if (currentFilter === 'completed') return todo.completed;
            return true;
        });

        updateStats();

        if (filteredTodos.length === 0) {
            todoContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-check"></i>
                    <p>No tasks found. ${currentFilter === 'all' ? 'Add your first task above!' : 'Try a different filter.'}</p>
                </div>
            `;
            return;
        }

        todoContainer.innerHTML = filteredTodos.map(todo => `
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
                <div class="todo-content">
                    <label class="checkbox-wrapper">
                        <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleComplete(${todo.id}, ${todo.completed})">
                        <span class="checkmark"><i class="fas fa-check"></i></span>
                    </label>
                    <div class="todo-text">
                        <div class="todo-title">${escapeHTML(todo.title)}</div>
                        <div class="todo-meta">
                            <span class="badge badge-${todo.priority}">${todo.priority}</span>
                            <span class="badge badge-category">${escapeHTML(todo.category || 'General')}</span>
                            ${todo.due_date ? `<span><i class="far fa-calendar-alt"></i> ${todo.due_date}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="action-btn" onclick="openEditModal(${todo.id})" title="Edit Task">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteTodo(${todo.id})" title="Delete Task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    function updateStats() {
        statTotal.textContent = `${todos.length} items`;
        const completedCount = todos.filter(t => t.completed).length;
        statCompleted.textContent = `${completedCount} completed`;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag])
        );
    }
});