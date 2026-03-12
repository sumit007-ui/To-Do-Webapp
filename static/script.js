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
    
    // Pro Features Selectors
    const searchInput = document.getElementById('search-input');
    const sortSelect = document.getElementById('sort-select');
    const analyticsBtn = document.getElementById('analytics-btn');
    const exportBtn = document.getElementById('export-btn');
    const analyticsModal = document.getElementById('analyticsModal');
    const closeAnalyticsModal = document.getElementById('closeAnalyticsModal');
    
    let todos = [];
    let currentFilter = 'all';
    let currentSearchTerm = '';
    let currentSortBy = 'newest';
    let chartInstance = null;


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
        if (e.target === analyticsModal) {
            analyticsModal.classList.remove('show');
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

    // Searching
    searchInput.addEventListener('input', (e) => {
        currentSearchTerm = e.target.value.toLowerCase();
        renderTodos();
    });

    // Sorting
    sortSelect.addEventListener('change', (e) => {
        currentSortBy = e.target.value;
        renderTodos();
    });

    // Export CSV
    exportBtn.addEventListener('click', () => {
        if (todos.length === 0) {
            alert("No tasks to export!");
            return;
        }
        const headers = ["ID", "Title", "Category", "Priority", "Completed", "Due Date", "Date Created"];
        const csvContent = [
            headers.join(","),
            ...todos.map(t => `"${t.id}","${t.title}","${t.category}","${t.priority}","${t.completed}","${t.due_date || ''}","${t.date_created || ''}"`)
        ].join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "pro_tasks_export.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Analytics Modal
    analyticsBtn.addEventListener('click', () => {
        analyticsModal.classList.add('show');
        renderChart();
    });

    closeAnalyticsModal.addEventListener('click', () => {
        analyticsModal.classList.remove('show');
    });

    function renderChart() {
        const ctx = document.getElementById('productivityChart').getContext('2d');
        
        const completedCount = todos.filter(t => t.completed).length;
        const totalCount = todos.length;
        
        document.getElementById('stat-completion-rate').textContent = totalCount ? Math.round((completedCount/totalCount)*100) + '%' : '0%';
        
        const categories = {};
        todos.forEach(t => {
            const cat = t.category || 'General';
            categories[cat] = (categories[cat] || 0) + 1;
        });
        
        let topCat = '-';
        let max = 0;
        for (const [cat, count] of Object.entries(categories)) {
            if (count > max) { max = count; topCat = cat; }
        }
        document.getElementById('stat-top-category').textContent = topCat;

        if (chartInstance) {
            chartInstance.destroy();
        }
        
        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: ['#00F0FF', '#5200FF', '#FF3B30', '#34C759', '#FF9500'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { color: '#fff' } }
                }
            }
        });
    }

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
        let filteredTodos = todos.filter(todo => {
            if (currentFilter === 'active') return !todo.completed;
            if (currentFilter === 'completed') return todo.completed;
            return true;
        });

        if (currentSearchTerm) {
            filteredTodos = filteredTodos.filter(todo => 
                todo.title.toLowerCase().includes(currentSearchTerm) || 
                (todo.category && todo.category.toLowerCase().includes(currentSearchTerm))
            );
        }
        
        filteredTodos.sort((a, b) => {
            if (currentSortBy === 'newest') return b.id - a.id;
            if (currentSortBy === 'oldest') return a.id - b.id;
            if (currentSortBy === 'due-date') {
                if (!a.due_date) return 1;
                if (!b.due_date) return -1;
                return new Date(a.due_date) - new Date(b.due_date);
            }
            if (currentSortBy === 'priority') {
                const p = { 'high': 3, 'medium': 2, 'low': 1 };
                return (p[b.priority] || 0) - (p[a.priority] || 0);
            }
            return 0;
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
            <div class="todo-item priority-${todo.priority} ${todo.completed ? 'completed' : ''}">
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