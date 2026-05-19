/* ==========================================================================
   AETHER CORE APPLICATION SCRIPT — SPA ENGINE & API CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Application States
    let currentTab = 'dashboard';
    let todosState = [];
    let categoriesState = [];
    let activitiesState = [];
    let dashboardStatsState = {};
    
    // Focus Timer State
    let focusTimerDuration = 25 * 60; // 25 minutes
    let focusTimerRemaining = focusTimerDuration;
    let timerInterval = null;
    let isFocusActive = false;
    let activeFocusSessionId = null;

    // Calendar state
    let currentDate = new Date();
    let selectedDateStr = formatDateStr(new Date());

    // Chart.js global reference
    let velocityChartInstance = null;

    // Grab elements
    const sidebar = document.getElementById('app-sidebar-navigation');
    const sidebarCollapseBtn = document.getElementById('sidebar-collapse-btn-id');
    const dynamicTitle = document.getElementById('dynamic-section-title');
    const dynamicSubtitle = document.getElementById('dynamic-section-subtitle');
    const navItems = document.querySelectorAll('.nav-item');
    const dashboardDatePill = document.getElementById('dashboard-date-pill-text');

    /* Initialize Application */
    initApp();

    async function initApp() {
        // Load date on dashboard
        if (dashboardDatePill) {
            const options = { weekday: 'long', month: 'short', day: 'numeric' };
            dashboardDatePill.textContent = new Date().toLocaleDateString('en-US', options);
        }

        // Sidebar Collapse trigger
        if (sidebarCollapseBtn && sidebar) {
            sidebarCollapseBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
            });
        }

        // SPA Navigation bindings
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const nextTab = item.dataset.tab;
                if (nextTab === currentTab) return;

                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                // Trigger GSAP Swapping
                if (window.anims && window.anims.switchTabView) {
                    window.anims.switchTabView(`view-${currentTab}`, `view-${nextTab}`, () => {
                        currentTab = nextTab;
                        updateNavbarHeaders();
                        loadTabContent();
                    });
                } else {
                    document.getElementById(`view-${currentTab}`).classList.remove('active');
                    document.getElementById(`view-${nextTab}`).classList.add('active');
                    currentTab = nextTab;
                    updateNavbarHeaders();
                    loadTabContent();
                }
            });
        });

        // Initialize Forms and Modals
        setupModals();
        setupFocusTimer();
        setupSettingsView();

        // Initial Data Loads (runs concurrently)
        await Promise.all([
            fetchProfile(),
            fetchCategories(),
            fetchTodos(),
            fetchActivities(),
            fetchDashboardStats(),
            fetchAIInsights()
        ]);

        // Rendering dashboards
        renderDashboardWidgets();
        
        // Hide loader if page content is resolved
        setTimeout(() => {
            const preloader = document.getElementById('cinematic-preloader-id');
            if (preloader && !preloader.classList.contains('fade-out')) {
                preloader.classList.add('fade-out');
                if (window.anims && window.anims.revealDashboard) {
                    setTimeout(() => window.anims.revealDashboard(), 400);
                }
            }
        }, 1000);

        // Start heartbeat sync every 12 seconds
        setInterval(heartbeatSync, 12000);
    }

    /* Update page headers dynamically */
    function updateNavbarHeaders() {
        const headerInfo = {
            dashboard: { title: 'Workspace Dashboard', subtitle: 'Chronological summary of your productivity flow.' },
            tasks: { title: 'All Tasks Chamber', subtitle: 'Search, filter, and organize granular todo items.' },
            kanban: { title: 'Kanban Column Board', subtitle: 'Interactive board designed to optimize velocity.' },
            calendar: { title: 'Interactive Calendar', subtitle: 'Plan dates and review monthly thermal heatmaps.' },
            projects: { title: 'Workspace Categories', subtitle: 'Organize related projects and track completion weights.' },
            settings: { title: 'System Settings', subtitle: 'Configure display name, theme overrides, and session states.' }
        };

        const config = headerInfo[currentTab];
        if (config) {
            dynamicTitle.textContent = config.title;
            dynamicSubtitle.textContent = config.subtitle;
        }
    }

    /* Load respective tab contents */
    function loadTabContent() {
        if (currentTab === 'tasks') {
            renderTasksList();
        } else if (currentTab === 'kanban') {
            renderKanbanBoard();
        } else if (currentTab === 'calendar') {
            renderCalendarGrid();
        } else if (currentTab === 'projects') {
            renderCategoriesGrid();
        } else if (currentTab === 'dashboard') {
            renderDashboardWidgets();
            fetchAIInsights();
            fetchActivities();
        }
    }

    /* Heartbeat background sync */
    async function heartbeatSync() {
        try {
            const resTodos = await fetch('/api/todos');
            const dataTodos = await resTodos.json();
            todosState = dataTodos;

            const resStats = await fetch('/api/stats/dashboard');
            const dataStats = await resStats.json();
            dashboardStatsState = dataStats;

            if (currentTab === 'dashboard') {
                renderDashboardWidgets();
            } else if (currentTab === 'tasks') {
                renderTasksList();
            } else if (currentTab === 'kanban') {
                renderKanbanBoard();
            } else if (currentTab === 'calendar') {
                renderCalendarGrid();
            } else if (currentTab === 'projects') {
                renderCategoriesGrid();
            }
        } catch (e) {
            console.warn('Sync heartbeat offline', e);
        }
    }

    /* ==========================================================================
       API ENDPOINTS CLIENT FUNCTIONS
       ========================================================================== */

    async function fetchProfile() {
        try {
            const res = await fetch('/api/auth/profile');
            if (res.ok) {
                const user = await res.json();
                document.getElementById('sidebar-user-name').textContent = user.display_name;
                document.getElementById('sidebar-avatar-img').src = user.avatar_url;
                
                // Prefill settings form
                document.getElementById('settings-profile-email').value = user.email;
                document.getElementById('settings-profile-name').value = user.display_name;

                // Sync accent preference
                if (user.accent_color) {
                    document.documentElement.style.setProperty('--accent-light', user.accent_color);
                    // Match select buttons
                    const activeDot = document.querySelector(`.accent-dot[data-color="${user.accent_color}"]`);
                    if (activeDot) {
                        document.querySelectorAll('.accent-dot').forEach(d => d.classList.remove('active'));
                        activeDot.classList.add('active');
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching profile details', e);
        }
    }

    async function fetchTodos() {
        try {
            const res = await fetch('/api/todos');
            todosState = await res.json();
        } catch (e) {
            console.error('Error loading tasks', e);
        }
    }

    async function fetchCategories() {
        try {
            const res = await fetch('/api/categories');
            categoriesState = await res.json();
            updateCategoryDropdowns();
        } catch (e) {
            console.error('Error loading projects', e);
        }
    }

    async function fetchActivities() {
        try {
            const res = await fetch('/api/activities');
            activitiesState = await res.json();
        } catch (e) {
            console.error('Error loading log', e);
        }
    }

    async function fetchDashboardStats() {
        try {
            const res = await fetch('/api/stats/dashboard');
            dashboardStatsState = await res.json();
        } catch (e) {
            console.error('Error loading bento stats', e);
        }
    }

    async function fetchAIInsights() {
        const container = document.getElementById('ai-insights-wrapper-id');
        if (!container) return;

        try {
            const res = await fetch('/api/ai/insights');
            const insights = await res.json();
            
            container.innerHTML = insights.map(ins => `
                <div class="ai-insight-item">
                    <div class="insight-icon-wrap ${ins.type}">
                        <i class="fa-solid ${ins.type === 'success' ? 'fa-circle-check' : ins.type === 'warning' ? 'fa-triangle-exclamation' : 'fa-wand-magic-sparkles'}"></i>
                    </div>
                    <div class="insight-meta">
                        <div class="insight-title-line">
                            <h4 class="insight-title">${ins.title}</h4>
                            <span class="insight-metric-pill">${ins.metric}</span>
                        </div>
                        <p class="insight-description">${ins.description}</p>
                    </div>
                </div>
            `).join('');

            if (window.anims && window.anims.refreshHoverTargets) {
                window.anims.refreshHoverTargets();
            }
        } catch (e) {
            container.innerHTML = `<p class="no-reminders-msg">AI Insights offline.</p>`;
        }
    }

    function updateCategoryDropdowns() {
        const modalTaskCategory = document.getElementById('modal-task-category');
        const editTaskCategory = document.getElementById('edit-modal-task-category');
        const tasksFilterCategory = document.getElementById('tasks-filter-category');

        if (!modalTaskCategory || !editTaskCategory) return;

        const optionsHtml = `<option value="">General</option>` + 
            categoriesState.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');

        modalTaskCategory.innerHTML = optionsHtml;
        editTaskCategory.innerHTML = optionsHtml;

        if (tasksFilterCategory) {
            tasksFilterCategory.innerHTML = `<option value="all">All Categories</option>` + 
                categoriesState.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
        }
    }

    /* ==========================================================================
       DASHBOARD BENTO CARD GRAPHICS RENDERING
       ========================================================================== */

    function renderDashboardWidgets() {
        // 1. Streak Widget
        const streakCount = document.getElementById('widget-streak-count');
        if (streakCount) {
            streakCount.textContent = dashboardStatsState.streak || 0;
        }

        // 2. Goal Progress circle ring
        const fillRing = document.getElementById('dashboard-progress-ring-fill');
        const ringText = document.getElementById('dashboard-progress-ring-text');
        const statsSubText = document.getElementById('dashboard-completed-stats-text');

        if (fillRing && ringText) {
            const completionRate = dashboardStatsState.completion_rate || 0;
            // Circle circumference = 2 * PI * r = 2 * 3.1415 * 40 = 251.2
            const offset = 251.2 - (251.2 * completionRate) / 100;
            fillRing.style.strokeDashoffset = offset;
            ringText.textContent = `${completionRate}%`;
            
            if (statsSubText) {
                statsSubText.textContent = `${dashboardStatsState.completed_tasks || 0} of ${dashboardStatsState.total_tasks || 0} resolved`;
            }
        }

        // 3. Focus total counter
        const focusMinsText = document.getElementById('focus-total-accumulated-mins');
        if (focusMinsText) {
            focusMinsText.textContent = `Flow block: ${dashboardStatsState.focus_minutes || 0} mins`;
        }

        // 4. Overdue/Today Reminders list
        renderSmartReminders();

        // 5. Activities Log Timeline
        renderActivitiesTimeline();

        // 6. Draw Chart
        renderVelocityChart();
    }

    function renderSmartReminders() {
        const wrap = document.getElementById('dashboard-reminders-list-id');
        if (!wrap) return;

        const overdueTasks = todosState.filter(todo => {
            if (todo.completed) return false;
            if (!todo.due_date) return false;
            return new Date(todo.due_date) < new Date().setHours(0,0,0,0);
        });

        if (overdueTasks.length === 0) {
            wrap.innerHTML = `<p class="no-reminders-msg"><i class="fa-solid fa-square-check" style="color: #34C759;"></i> Agenda is fully clear.</p>`;
            return;
        }

        wrap.innerHTML = overdueTasks.map(task => `
            <div class="reminder-item">
                <span class="reminder-title" title="${task.title}">${task.title}</span>
                <span class="badge badge-accent">Overdue</span>
            </div>
        `).join('');
    }

    function renderActivitiesTimeline() {
        const wrap = document.getElementById('dashboard-activities-timeline-id');
        if (!wrap) return;

        if (activitiesState.length === 0) {
            wrap.innerHTML = `
                <div class="timeline-empty">
                    <p>No actions logged in the chamber yet.</p>
                </div>
            `;
            return;
        }

        wrap.innerHTML = activitiesState.map(log => {
            let dotClass = 'created';
            if (log.action_type === 'task_complete') dotClass = 'completed';
            if (log.action_type === 'focus_session') dotClass = 'timer';

            return `
                <div class="timeline-row">
                    <div class="timeline-marker-dot ${dotClass}"></div>
                    <div class="timeline-meta-wrap">
                        <span class="timeline-action-details">${log.details}</span>
                        <span class="timeline-time-label">${log.time_relative}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function renderVelocityChart() {
        const ctx = document.getElementById('dashboard-productivity-chart-canvas');
        if (!ctx) return;

        const chartData = dashboardStatsState.weekly_chart || { labels: [], data: [] };

        if (velocityChartInstance) {
            velocityChartInstance.destroy();
        }

        const isLight = document.body.classList.contains('light-theme');
        const gridColor = isLight ? 'rgba(30, 27, 58, 0.06)' : 'rgba(0, 229, 255, 0.04)';
        const textColor = isLight ? '#1E1B3A' : '#8C8BA0';

        velocityChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Resolved Tasks',
                    data: chartData.data,
                    borderColor: '#00E5FF',
                    backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#00E5FF',
                    pointBorderColor: '#06050A',
                    pointBorderWidth: 1.5,
                    pointRadius: 4.5,
                    pointHoverRadius: 6.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: {
                            color: textColor,
                            stepSize: 1,
                            precision: 0,
                            font: { family: 'Outfit', size: 10 }
                        }
                    }
                }
            }
        });
    }

    /* ==========================================================================
       VIEW 2: GRANULAR TASKS TABLE / GRID LAYOUT ENGINE
       ========================================================================== */

    const searchInput = document.getElementById('tasks-search-input-id');
    const prioritySelect = document.getElementById('tasks-filter-priority');
    const categorySelect = document.getElementById('tasks-filter-category');
    const viewListBtn = document.getElementById('view-switch-list-btn');
    const viewGridBtn = document.getElementById('view-switch-grid-btn');
    const listWrapper = document.getElementById('tasks-list-content-wrapper');
    const hybridViewport = document.getElementById('tasks-hybrid-viewport');

    let taskSearchQuery = '';
    let taskPriorityFilter = 'all';
    let taskCategoryFilter = 'all';

    // Set filters triggers
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            taskSearchQuery = e.target.value.toLowerCase();
            renderTasksList();
        });
    }

    if (prioritySelect) {
        prioritySelect.addEventListener('change', (e) => {
            taskPriorityFilter = e.target.value;
            renderTasksList();
        });
    }

    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            taskCategoryFilter = e.target.value;
            renderTasksList();
        });
    }

    if (viewListBtn && viewGridBtn && hybridViewport) {
        viewListBtn.addEventListener('click', () => {
            viewGridBtn.classList.remove('active');
            viewListBtn.classList.add('active');
            hybridViewport.className = 'tasks-hybrid-layout list-mode';
            renderTasksList();
        });

        viewGridBtn.addEventListener('click', () => {
            viewListBtn.classList.remove('active');
            viewGridBtn.classList.add('active');
            hybridViewport.className = 'tasks-hybrid-layout grid-mode';
            renderTasksList();
        });
    }

    function renderTasksList() {
        if (!listWrapper) return;

        let filtered = todosState.filter(todo => {
            const matchesSearch = todo.title.toLowerCase().includes(taskSearchQuery) || 
                                  (todo.description && todo.description.toLowerCase().includes(taskSearchQuery)) ||
                                  (todo.tags && todo.tags.some(t => t.toLowerCase().includes(taskSearchQuery)));
            
            const matchesPriority = taskPriorityFilter === 'all' || todo.priority === taskPriorityFilter;
            
            const matchesCategory = taskCategoryFilter === 'all' || 
                                     (taskCategoryFilter === '' && !todo.category_id) || 
                                     (todo.category_id && todo.category_id.toString() === taskCategoryFilter);

            return matchesSearch && matchesPriority && matchesCategory;
        });

        if (filtered.length === 0) {
            listWrapper.innerHTML = `
                <div class="empty-state" style="padding: 4rem; text-align: center;">
                    <i class="fa-solid fa-circle-nodes" style="font-size: 2.2rem; margin-bottom: 1rem; color: var(--accent-earth);"></i>
                    <p style="font-size: 0.95rem; color: var(--accent-earth);">No tasks found match the query.</p>
                </div>
            `;
            return;
        }

        listWrapper.innerHTML = filtered.map(todo => {
            const tagsHtml = todo.tags && todo.tags.length > 0 ? 
                `<div class="task-tags-row">${todo.tags.map(t => `<span class="tag-pill">${t}</span>`).join('')}</div>` : '';

            const isOverdue = todo.due_date && !todo.completed && new Date(todo.due_date) < new Date().setHours(0,0,0,0);
            const dateStr = todo.due_date ? todo.due_date : 'No Due Date';

            return `
                <div class="task-item-row ${todo.completed ? 'completed' : ''}" id="task-row-${todo.id}">
                    <div class="task-checkbox-container">
                        <div class="round-checkbox">
                            <input type="checkbox" id="check-${todo.id}" ${todo.completed ? 'checked' : ''} onchange="window.appAPI.toggleTodo(${todo.id}, ${todo.completed})">
                            <label for="check-${todo.id}"><i class="fa-solid fa-check"></i></label>
                        </div>
                    </div>
                    <div class="task-text-meta">
                        <span class="task-title">${todo.title}</span>
                        ${todo.description ? `<span class="task-desc">${todo.description}</span>` : ''}
                        ${tagsHtml}
                    </div>
                    <div class="col-category">
                        <span class="category-indicator-pill">
                            <span class="category-dot" style="background-color: ${todo.category_color};"></span>
                            <span>${todo.category_name}</span>
                        </span>
                    </div>
                    <div class="col-priority">
                        <span class="priority-flag-pill ${todo.priority}">
                            <i class="fa-solid fa-flag"></i> <span>${todo.priority}</span>
                        </span>
                    </div>
                    <div class="col-date">
                        <span class="due-date-display ${isOverdue ? 'overdue' : ''}">
                            <i class="fa-solid fa-calendar-day"></i> <span>${dateStr}</span>
                        </span>
                    </div>
                    <div class="row-actions-wrap">
                        <button class="action-icon-btn" onclick="window.appAPI.openEditTaskModal(${todo.id})" title="Edit Task"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="action-icon-btn delete-btn" onclick="window.appAPI.deleteTodo(${todo.id})" title="Delete Task"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        if (window.anims && window.anims.refreshHoverTargets) {
            window.anims.refreshHoverTargets();
        }
    }

    /* ==========================================================================
       VIEW 3: KANBAN COLUMN DRAG AND DROP ENGINE
       ========================================================================== */

    function renderKanbanBoard() {
        const cols = ['todo', 'progress', 'review', 'done'];
        
        cols.forEach(col => {
            const wrap = document.getElementById(`kanban-cards-${col}`);
            const countPill = document.getElementById(`kanban-count-${col}`);
            if (!wrap) return;

            const colTasks = todosState.filter(t => t.column_state === col);
            countPill.textContent = colTasks.length;

            if (colTasks.length === 0) {
                wrap.innerHTML = `
                    <div class="kanban-empty-cue" style="padding: 1.5rem; text-align: center; border: 1.5px dashed var(--border-glass); border-radius: var(--corner-radius-sm); color: var(--accent-earth); font-size: 0.8rem;">
                        Column Clear
                    </div>
                `;
            } else {
                wrap.innerHTML = colTasks.map(todo => `
                    <div class="kanban-task-card" draggable="true" id="kanban-card-${todo.id}" data-id="${todo.id}">
                        <h4 class="kanban-card-title">${todo.title}</h4>
                        ${todo.description ? `<p style="font-size:0.8rem; color: var(--accent-earth); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${todo.description}</p>` : ''}
                        <div class="kanban-card-meta">
                            <span class="kanban-card-category">
                                <span class="category-dot" style="background-color: ${todo.category_color}; width:6px; height:6px;"></span>
                                <span>${todo.category_name}</span>
                            </span>
                            ${todo.due_date ? `<span class="kanban-card-date"><i class="fa-solid fa-calendar-day" style="font-size:0.7rem;"></i> ${todo.due_date}</span>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        });

        setupDragAndDrop();
    }

    function setupDragAndDrop() {
        const cards = document.querySelectorAll('.kanban-task-card');
        const columns = document.querySelectorAll('.kanban-column');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.dataset.id);
                card.style.opacity = '0.4';
                card.style.transform = 'scale(0.98)';
            });

            card.addEventListener('dragend', () => {
                card.style.opacity = '1';
                card.style.transform = 'none';
            });
        });

        columns.forEach(col => {
            col.addEventListener('dragover', (e) => {
                e.preventDefault();
                col.style.background = 'rgba(0, 229, 255, 0.03)';
            });

            col.addEventListener('dragleave', () => {
                col.style.background = 'none';
            });

            col.addEventListener('drop', async (e) => {
                e.preventDefault();
                col.style.background = 'none';

                const todoId = e.dataTransfer.getData('text/plain');
                const columnState = col.dataset.column;

                if (todoId && columnState) {
                    try {
                        const targetCompleted = columnState === 'done';
                        const res = await fetch(`/api/todos/${todoId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                column_state: columnState,
                                completed: targetCompleted
                            })
                        });
                        if (res.ok) {
                            // Celebrate if dragged to Done!
                            if (columnState === 'done') {
                                triggerTaskCelebration();
                            }
                            await fetchTodos();
                            await fetchDashboardStats();
                            await fetchActivities();
                            renderKanbanBoard();
                        }
                    } catch (err) {
                        console.error('Error shifting card columns', err);
                    }
                }
            });
        });

        if (window.anims && window.anims.refreshHoverTargets) {
            window.anims.refreshHoverTargets();
        }
    }

    /* ==========================================================================
       VIEW 4: FULL INTERACTIVE CALENDAR ENGINE
       ========================================================================== */

    const calendarGrid = document.getElementById('calendar-days-grid-id');
    const calendarMonthYearText = document.getElementById('calendar-month-year-text');
    const calendarPrevBtn = document.getElementById('calendar-prev-month-btn');
    const calendarNextBtn = document.getElementById('calendar-next-month-btn');
    const plannerDateText = document.getElementById('planner-selected-date-text');
    const plannerEventsList = document.getElementById('planner-events-list-id');

    if (calendarPrevBtn && calendarNextBtn) {
        calendarPrevBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            renderCalendarGrid();
        });

        calendarNextBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            renderCalendarGrid();
        });
    }

    function renderCalendarGrid() {
        if (!calendarGrid) return;

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // Month Names
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        calendarMonthYearText.textContent = `${monthNames[month]} ${year}`;

        // Get first day of month and total days
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevLastDay = new Date(year, month, 0).getDate();

        let cellsHtml = '';

        // 1. Previous Month days pad
        for (let x = firstDayIndex; x > 0; x--) {
            const dayNum = prevLastDay - x + 1;
            cellsHtml += `<div class="calendar-day-cell inactive"><span class="day-number">${dayNum}</span></div>`;
        }

        // 2. Current Month days
        const todayDate = new Date();
        for (let i = 1; i <= totalDays; i++) {
            const dateObj = new Date(year, month, i);
            const dateStr = formatDateStr(dateObj);
            const isToday = dateObj.toDateString() === todayDate.toDateString();
            
            // Collect tasks due on this date
            const dayTasks = todosState.filter(todo => todo.due_date === dateStr);
            const cellClass = isToday ? 'calendar-day-cell today' : 'calendar-day-cell';
            
            // Build dots
            let dotsHtml = '';
            if (dayTasks.length > 0) {
                dotsHtml = `<div class="cell-events-dots">` + 
                    dayTasks.map(t => `<span class="event-dot ${t.priority}"></span>`).join('') + 
                    `</div>`;
            }

            cellsHtml += `
                <div class="${cellClass}" onclick="window.appAPI.selectCalendarDay('${dateStr}')">
                    <span class="day-number">${i}</span>
                    ${dotsHtml}
                </div>
            `;
        }

        // Calculate remaining cells grid fill to complete standard 42 slots
        const totalGridCells = firstDayIndex + totalDays;
        const nextMonthPad = 42 - totalGridCells;
        for (let j = 1; j <= nextMonthPad; j++) {
            cellsHtml += `<div class="calendar-day-cell inactive"><span class="day-number">${j}</span></div>`;
        }

        calendarGrid.innerHTML = cellsHtml;

        // Render agenda details
        renderPlannerAgenda();
    }

    function selectCalendarDay(dateStr) {
        selectedDateStr = dateStr;
        
        const dateObj = new Date(dateStr);
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        plannerDateText.textContent = dateObj.toLocaleDateString('en-US', options);

        renderPlannerAgenda();
    }

    function renderPlannerAgenda() {
        if (!plannerEventsList) return;

        const dayTasks = todosState.filter(todo => todo.due_date === selectedDateStr);

        if (dayTasks.length === 0) {
            plannerEventsList.innerHTML = `<p class="no-events-msg">No tasks scheduled for this day.</p>`;
            return;
        }

        plannerEventsList.innerHTML = dayTasks.map(task => `
            <div class="planner-event-item">
                <span class="planner-event-title">${task.title}</span>
                <div class="planner-event-meta">
                    <span class="category-indicator-pill">
                        <span class="category-dot" style="background-color: ${task.category_color}; width:6px; height:6px;"></span>
                        <span>${task.category_name}</span>
                    </span>
                    <span class="priority-flag-pill ${task.priority}" style="font-size:0.7rem;">
                        <i class="fa-solid fa-flag"></i> ${task.priority}
                    </span>
                </div>
            </div>
        `).join('');
    }

    /* Helper: format date object to YYYY-MM-DD */
    function formatDateStr(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /* ==========================================================================
       VIEW 5: CATEGORIES / PROJECTS GRID AND PROGRESS RINGS
       ========================================================================== */

    const categoriesGrid = document.getElementById('categories-grid-container');

    function renderCategoriesGrid() {
        if (!categoriesGrid) return;

        if (categoriesState.length === 0) {
            categoriesGrid.innerHTML = `
                <div class="empty-state" style="padding:4rem; text-align:center; grid-column: 1 / -1;">
                    <p style="color: var(--accent-earth);">No custom categories established.</p>
                </div>
            `;
            return;
        }

        categoriesGrid.innerHTML = categoriesState.map(cat => {
            // Circumference of progress = 2 * PI * r = 2 * 3.1415 * 40 = 251.2
            const offset = 251.2 - (251.2 * cat.progress_percentage) / 100;
            
            return `
                <div class="category-card glass">
                    <button class="action-icon-btn delete-btn category-delete-btn" onclick="window.appAPI.deleteCategory(${cat.id})" title="Delete Category"><i class="fa-solid fa-trash-can"></i></button>
                    <div class="category-card-header">
                        <h3 class="category-title">
                            <span class="category-accent-dot" style="background-color: ${cat.color};"></span>
                            <span>${cat.name}</span>
                        </h3>
                    </div>
                    <div class="category-card-body">
                        <div class="category-progress-meta">
                            <span class="category-tasks-stat">${cat.completed_tasks} / ${cat.total_tasks} Tasks</span>
                            <span class="category-tasks-sublabel">Completion Weight</span>
                        </div>
                        <div class="progress-ring-sm">
                            <svg viewBox="0 0 100 100" class="ring-svg">
                                <circle cx="50" cy="50" r="40" class="ring-bg"></circle>
                                <circle cx="50" cy="50" r="40" class="ring-fill" style="stroke: ${cat.color}; stroke-dashoffset: ${offset};"></circle>
                            </svg>
                            <div class="ring-center-value" style="font-size: 0.95rem; font-weight:700;">${cat.progress_percentage}%</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (window.anims && window.anims.refreshHoverTargets) {
            window.anims.refreshHoverTargets();
        }
    }

    /* ==========================================================================
       VIEW 6: SETTINGS WORKSPACE CONTROLLER
       ========================================================================== */

    function setupSettingsView() {
        const accentDots = document.querySelectorAll('.accent-dot');
        accentDots.forEach(dot => {
            dot.addEventListener('click', async () => {
                accentDots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                
                const color = dot.dataset.color;
                document.documentElement.style.setProperty('--accent-light', color);

                // Save to server
                try {
                    await fetch('/api/auth/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ accent_color: color })
                    });
                } catch (e) {
                    console.error('Error saving accent color preference', e);
                }
            });
        });

        // Theme controllers
        const themeDarkBtn = document.getElementById('theme-switch-dark');
        const themeLightBtn = document.getElementById('theme-switch-light');

        if (themeDarkBtn && themeLightBtn) {
            themeDarkBtn.addEventListener('click', () => {
                themeLightBtn.classList.remove('active');
                themeDarkBtn.classList.add('active');
                document.body.classList.remove('light-theme');
                saveThemePreference('dark');
            });

            themeLightBtn.addEventListener('click', () => {
                themeDarkBtn.classList.remove('active');
                themeLightBtn.classList.add('active');
                document.body.classList.add('light-theme');
                saveThemePreference('light');
            });
        }

        // Profile details form submit
        const profileForm = document.getElementById('settings-profile-form');
        if (profileForm) {
            profileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const display_name = document.getElementById('settings-profile-name').value.trim();

                try {
                    const res = await fetch('/api/auth/profile', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ display_name })
                    });
                    if (res.ok) {
                        const user = await res.json();
                        document.getElementById('sidebar-user-name').textContent = user.display_name;
                        showToast('Workspace credentials updated successfully.', 'success');
                    }
                } catch (err) {
                    console.error('Error saving profile settings', err);
                }
            });
        }
    }

    async function saveThemePreference(theme) {
        try {
            await fetch('/api/auth/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme_preference: theme })
            });
        } catch (e) {
            console.error('Error updating theme preference', e);
        }
    }

    /* ==========================================================================
       FOCUS FLOW CHAMBER TIMER ENGINE
       ========================================================================== */

    const timerCountdown = document.getElementById('focus-timer-countdown');
    const timerStartBtn = document.getElementById('focus-timer-start-btn');
    const timerStopBtn = document.getElementById('focus-timer-stop-btn');
    const timerResetBtn = document.getElementById('focus-timer-reset-btn');
    const focusDialFill = document.getElementById('focus-dial-fill-svg');
    const navFocusText = document.getElementById('nav-focus-timer-text');
    const navPulse = document.querySelector('.focus-pulse-dot');

    function setupFocusTimer() {
        if (!timerStartBtn) return;

        timerStartBtn.addEventListener('click', startFocusTimer);
        timerStopBtn.addEventListener('click', stopFocusTimer);
        timerResetBtn.addEventListener('click', resetFocusTimer);
    }

    async function startFocusTimer() {
        isFocusActive = true;
        timerStartBtn.disabled = true;
        timerStopBtn.disabled = false;
        if (navPulse) navPulse.classList.add('active');

        // Log session start on server
        try {
            const res = await fetch('/api/focus/start', { method: 'POST' });
            const data = await res.json();
            activeFocusSessionId = data.id;
        } catch (e) {
            console.error('Session registry failed', e);
        }

        timerInterval = setInterval(() => {
            focusTimerRemaining--;
            updateFocusTimerDisplay();

            if (focusTimerRemaining <= 0) {
                // Focus complete celebration!
                clearInterval(timerInterval);
                triggerTaskCelebration();
                stopFocusTimer();
            }
        }, 1000);
    }

    async function stopFocusTimer() {
        isFocusActive = false;
        timerStartBtn.disabled = false;
        timerStopBtn.disabled = true;
        if (navPulse) navPulse.classList.remove('active');

        clearInterval(timerInterval);

        // Log session stop on server
        if (activeFocusSessionId) {
            try {
                await fetch('/api/focus/stop', { method: 'POST' });
                activeFocusSessionId = null;
                await fetchDashboardStats();
                await fetchActivities();
                renderDashboardWidgets();
            } catch (e) {
                console.error('Session termination registry failed', e);
            }
        }
    }

    function resetFocusTimer() {
        stopFocusTimer();
        focusTimerRemaining = focusTimerDuration;
        updateFocusTimerDisplay();
    }

    function updateFocusTimerDisplay() {
        const mins = String(Math.floor(focusTimerRemaining / 60)).padStart(2, '0');
        const secs = String(focusTimerRemaining % 60).padStart(2, '0');
        const timeStr = `${mins}:${secs}`;

        if (timerCountdown) timerCountdown.textContent = timeStr;
        if (navFocusText) navFocusText.textContent = timeStr;

        // Circle stroke math
        // Total dasharray = 251.2
        if (focusDialFill) {
            const progressRatio = focusTimerRemaining / focusTimerDuration;
            const offset = 251.2 * (1 - progressRatio);
            focusDialFill.style.strokeDashoffset = offset;
        }
    }

    /* ==========================================================================
       MODALS FORM BINDINGS (QUICK ADD, EDIT AND PROJECTS)
       ========================================================================== */

    function setupModals() {
        // 1. Quick Task Modals
        const quickAddBtn = document.getElementById('navbar-quick-add-btn');
        const quickAddOverlay = document.getElementById('quick-add-modal-overlay-id');
        const quickCloseBtn = document.getElementById('quick-add-modal-close-btn');
        const quickForm = document.getElementById('quick-add-todo-form');

        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => {
                quickAddOverlay.classList.add('show');
            });
        }

        if (quickCloseBtn) {
            quickCloseBtn.addEventListener('click', () => {
                quickAddOverlay.classList.remove('show');
                quickForm.reset();
            });
        }

        // Close on background overlay click
        window.addEventListener('click', (e) => {
            if (e.target === quickAddOverlay) {
                quickAddOverlay.classList.remove('show');
                quickForm.reset();
            }
            if (e.target === editOverlay) {
                editOverlay.classList.remove('show');
            }
            if (e.target === createCatOverlay) {
                createCatOverlay.classList.remove('show');
            }
        });

        // AI auto-categorization listener
        const quickTitleInput = document.getElementById('modal-task-title');
        const quickCategorySelect = document.getElementById('modal-task-category');
        const aiAssistStatus = document.getElementById('modal-ai-assist-status');

        if (quickTitleInput) {
            let aiTypingTimeout = null;
            quickTitleInput.addEventListener('input', () => {
                if (aiAssistStatus) {
                    aiAssistStatus.innerHTML = `<i class="fa-solid fa-microchip fa-spin"></i> <span>AI analysis...</span>`;
                }

                clearTimeout(aiTypingTimeout);
                aiTypingTimeout = setTimeout(async () => {
                    const text = quickTitleInput.value.trim();
                    if (text.length > 3) {
                        try {
                            const res = await fetch('/api/ai/categorize', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ title: text })
                            });
                            const predict = await res.json();
                            if (predict.category_id) {
                                quickCategorySelect.value = predict.category_id;
                                if (aiAssistStatus) {
                                    aiAssistStatus.innerHTML = `<i class="fa-solid fa-sparkles text-glow" style="color:#00E5FF;"></i> <span>Auto-sorted to ${predict.name}</span>`;
                                }
                            } else {
                                if (aiAssistStatus) {
                                    aiAssistStatus.innerHTML = `<i class="fa-solid fa-microchip"></i> <span>AI sorted to General</span>`;
                                }
                            }
                        } catch (e) {
                            // Offline
                        }
                    } else {
                        if (aiAssistStatus) {
                            aiAssistStatus.innerHTML = `<i class="fa-solid fa-microchip"></i> <span>AI Assistant Standby</span>`;
                        }
                    }
                }, 800);
            });
        }

        // Submitting new task Form
        if (quickForm) {
            quickForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const title = document.getElementById('modal-task-title').value.trim();
                const description = document.getElementById('modal-task-desc').value.trim();
                const priority = document.getElementById('modal-task-priority').value;
                const category_id = document.getElementById('modal-task-category').value;
                const due_date = document.getElementById('modal-task-due').value;
                const tags = document.getElementById('modal-task-tags').value.trim();

                const taskPayload = {
                    title,
                    description: description || null,
                    priority,
                    category_id: category_id ? parseInt(category_id) : null,
                    due_date: due_date || null,
                    tags: tags || null
                };

                try {
                    const res = await fetch('/api/todos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(taskPayload)
                    });
                    if (res.ok) {
                        quickAddOverlay.classList.remove('show');
                        quickForm.reset();
                        
                        // Sync & update interface
                        await fetchTodos();
                        await fetchDashboardStats();
                        await fetchActivities();
                        loadTabContent();
                    }
                } catch (err) {
                    console.error('Error creating task', err);
                }
            });
        }

        // 2. Edit Task Modal Setup
        const editOverlay = document.getElementById('edit-task-modal-overlay-id');
        const editCloseBtn = document.getElementById('edit-task-modal-close-btn');
        const editForm = document.getElementById('edit-todo-form');

        if (editCloseBtn) {
            editCloseBtn.addEventListener('click', () => {
                editOverlay.classList.remove('show');
            });
        }

        if (editForm) {
            editForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = document.getElementById('edit-task-id').value;
                const title = document.getElementById('edit-modal-task-title').value.trim();
                const description = document.getElementById('edit-modal-task-desc').value.trim();
                const priority = document.getElementById('edit-modal-task-priority').value;
                const category_id = document.getElementById('edit-modal-task-category').value;
                const due_date = document.getElementById('edit-modal-task-due').value;
                const tags = document.getElementById('edit-modal-task-tags').value.trim();

                const payload = {
                    title,
                    description: description || null,
                    priority,
                    category_id: category_id ? parseInt(category_id) : null,
                    due_date: due_date || null,
                    tags: tags || null
                };

                try {
                    const res = await fetch(`/api/todos/${id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        editOverlay.classList.remove('show');
                        editForm.reset();
                        
                        await fetchTodos();
                        await fetchDashboardStats();
                        await fetchActivities();
                        loadTabContent();
                    }
                } catch (err) {
                    console.error('Error updating task detail', err);
                }
            });
        }

        // 3. Category/Project Create Modal Setup
        const createCatBtn = document.getElementById('create-category-btn-id');
        const createCatOverlay = document.getElementById('create-cat-modal-overlay-id');
        const createCatCloseBtn = document.getElementById('create-cat-modal-close-btn');
        const createCatForm = document.getElementById('create-cat-form-id');

        if (createCatBtn) {
            createCatBtn.addEventListener('click', () => {
                createCatOverlay.classList.add('show');
            });
        }

        if (createCatCloseBtn) {
            createCatCloseBtn.addEventListener('click', () => {
                createCatOverlay.classList.remove('show');
            });
        }

        // Dynamic Color select inside Category create
        const catColorDots = document.querySelectorAll('#new-cat-color-wrap .accent-dot');
        let selectedCategoryColor = '#00E5FF';

        catColorDots.forEach(dot => {
            dot.addEventListener('click', () => {
                catColorDots.forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                selectedCategoryColor = dot.dataset.color;
            });
        });

        if (createCatForm) {
            createCatForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('new-cat-name').value.trim();

                try {
                    const res = await fetch('/api/categories', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name, color: selectedCategoryColor })
                    });
                    if (res.ok) {
                        createCatOverlay.classList.remove('show');
                        createCatForm.reset();
                        
                        await fetchCategories();
                        renderCategoriesGrid();
                    }
                } catch (err) {
                    console.error('Error creating custom Category', err);
                }
            });
        }
    }

    /* Open the Edit Task dialog prefilled */
    function openEditTaskModal(id) {
        const todo = todosState.find(t => t.id === id);
        if (!todo) return;

        document.getElementById('edit-task-id').value = todo.id;
        document.getElementById('edit-modal-task-title').value = todo.title;
        document.getElementById('edit-modal-task-desc').value = todo.description || '';
        document.getElementById('edit-modal-task-priority').value = todo.priority;
        document.getElementById('edit-modal-task-category').value = todo.category_id || '';
        document.getElementById('edit-modal-task-due').value = todo.due_date || '';
        document.getElementById('edit-modal-task-tags').value = todo.tags ? todo.tags.join(', ') : '';

        const editOverlay = document.getElementById('edit-task-modal-overlay-id');
        if (editOverlay) {
            editOverlay.classList.add('show');
        }
    }

    /* Toggle check resolution */
    async function toggleTodo(id, currentStatus) {
        try {
            const res = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed: !currentStatus })
            });
            if (res.ok) {
                if (!currentStatus) {
                    triggerTaskCelebration();
                }
                await fetchTodos();
                await fetchDashboardStats();
                await fetchActivities();
                loadTabContent();
            }
        } catch (e) {
            console.error('Error toggling resolution state', e);
        }
    }

    /* Delete task */
    async function deleteTodo(id) {
        // Delete immediately without native alert dialogs

        try {
            const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchTodos();
                await fetchDashboardStats();
                await fetchActivities();
                loadTabContent();
            }
        } catch (e) {
            console.error('Error deleting task', e);
        }
    }

    /* Delete Category */
    async function deleteCategory(id) {
        // Delete immediately without native alert dialogs

        try {
            const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
            if (res.ok) {
                await fetchCategories();
                await fetchTodos();
                await fetchDashboardStats();
                await fetchActivities();
                renderCategoriesGrid();
            }
        } catch (e) {
            console.error('Error deleting category', e);
        }
    }

    /* Confetti popping trigger */
    function triggerTaskCelebration() {
        if (typeof confetti === 'function') {
            confetti({
                particleCount: 80,
                spread: 60,
                origin: { y: 0.8 },
                colors: ['#00E5FF', '#E5C158', '#8C8BA0', '#1E1B3A']
            });
        }
    }

    /* Custom Non-blocking Toast system */
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notification glass ${type}`;
        toast.innerHTML = `
            <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        // GSAP animate reveal
        gsap.fromTo(toast, 
            { opacity: 0, y: 30, scale: 0.9 },
            { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" }
        );
        
        // Autoremove
        setTimeout(() => {
            gsap.to(toast, {
                opacity: 0,
                y: -20,
                scale: 0.95,
                duration: 0.4,
                ease: "power2.in",
                onComplete: () => {
                    toast.remove();
                }
            });
        }, 3000);
    }

    // Export API functions for window scopes in HTML elements onclick
    window.appAPI = {
        toggleTodo,
        deleteTodo,
        deleteCategory,
        openEditTaskModal,
        selectCalendarDay
    };
});
