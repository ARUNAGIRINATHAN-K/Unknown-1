document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.getElementById('menu-toggle');
    const wrapper = document.getElementById('wrapper');
    const projectsView = document.getElementById('projects-view');
    const boardView = document.getElementById('board-view');
    const analyticsView = document.getElementById('analytics-view');
    const logoutBtn = document.getElementById('logout-btn');

    const navBoards = document.getElementById('nav-boards');
    const navAnalytics = document.getElementById('nav-analytics');

    let currentProjectId = null;
    let pollInterval = null;
    let taskChart = null;

    // Toggle Sidebar
    menuToggle.addEventListener('click', function () {
        wrapper.classList.toggle('toggled');
    });

    // --- Dark Mode ---
    const themeToggle = document.getElementById('theme-toggle');
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    themeToggle.addEventListener('click', function () {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        }
    });

    // --- Search ---
    const searchInput = document.getElementById('task-search');
    if (searchInput) {
        searchInput.addEventListener('input', function (e) {
            const term = e.target.value.toLowerCase();
            const tasks = document.querySelectorAll('.task-card');

            tasks.forEach(task => {
                const title = task.innerText.toLowerCase();
                if (title.includes(term)) {
                    task.classList.remove('d-none');
                } else {
                    task.classList.add('d-none');
                }
            });
        });
    }

    // Navigation
    if (navBoards) {
        navBoards.addEventListener('click', function (e) {
            e.preventDefault();
            showProjects();
            setActiveNav(navBoards);
        });
    }

    if (navAnalytics) {
        navAnalytics.addEventListener('click', function (e) {
            e.preventDefault();
            loadAnalytics();
            setActiveNav(navAnalytics);
        });
    }

    function setActiveNav(activeEl) {
        document.querySelectorAll('.list-group-item').forEach(el => el.classList.remove('active'));
        activeEl.classList.add('active');
    }

    // Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function (e) {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }

    // --- Analytics Logic ---
    function loadAnalytics() {
        if (pollInterval) clearInterval(pollInterval);
        projectsView.classList.add('d-none');
        boardView.classList.add('d-none');
        analyticsView.classList.remove('d-none');

        if (!currentProjectId) {
            const container = document.querySelector('#analytics-view .card-body');
            if (container) container.innerHTML = '<div class="alert alert-info">Please select a project from the Boards view to see its analytics.</div>';
            return;
        }

        fetch(`api/analytics.php?project_id=${currentProjectId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderChart(data.data);
                }
            });
    }

    function renderChart(data) {
        // Update Stats
        document.getElementById('stat-total').innerText = data.summary.total;
        document.getElementById('stat-completed').innerText = data.summary.completed;
        document.getElementById('stat-overdue').innerText = data.summary.overdue;
        document.getElementById('stat-rate').innerText = data.summary.rate + '%';

        // Distribution Chart (Bar)
        const ctxBar = document.getElementById('taskChart');
        // Destroy existing chart if it exists (using a global/stored variable would be better, but quick fix: assume canvas is cleared/reused)
        // Actually, Chart.js re-use on same canvas ID needs explicit destroy.
        // Simplified: We removed the re-creation of HTML, so we must manage the instance.
        if (window.myTaskChart) window.myTaskChart.destroy();

        const distData = data.distribution;
        const labels = distData.map(item => item.status);
        const counts = distData.map(item => item.count);

        window.myTaskChart = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '# of Tasks',
                    data: counts,
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.5)',
                        'rgba(255, 206, 86, 0.5)',
                        'rgba(75, 192, 192, 0.5)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: { y: { beginAtZero: true } }
            }
        });

        // Completion Chart (Doughnut)
        const ctxDoughnut = document.getElementById('completionChart');
        if (window.myCompletionChart) window.myCompletionChart.destroy();

        window.myCompletionChart = new Chart(ctxDoughnut, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Remaining'],
                datasets: [{
                    data: [data.summary.completed, data.summary.total - data.summary.completed],
                    backgroundColor: ['#198754', '#e9ecef'],
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });

        // Upcoming Tasks List
        const upcomingList = document.getElementById('upcoming-list');
        upcomingList.innerHTML = '';
        if (data.upcoming && data.upcoming.length > 0) {
            data.upcoming.forEach(task => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <span>${task.title}</span>
                    <span class="badge bg-warning text-dark">${new Date(task.due_date).toLocaleDateString()}</span>
                `;
                upcomingList.appendChild(li);
            });
        } else {
            upcomingList.innerHTML = '<li class="list-group-item text-muted">No upcoming tasks.</li>';
        }
    }

    // --- Projects Logic ---

    function loadProjects() {
        fetch('api/projects.php')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const projectsList = document.getElementById('projects-list');
                    projectsList.innerHTML = '';

                    if (data.data.length === 0) {
                        projectsList.innerHTML = '<div class="col-12 text-center text-muted">No projects found. Create one to get started!</div>';
                        return;
                    }

                    data.data.forEach(project => {
                        const col = document.createElement('div');
                        col.className = 'col-md-3 mb-4';
                        col.innerHTML = `
                        <div class="card h-100 shadow-sm project-card" onclick="loadProject(${project.id}, '${project.title.replace(/'/g, "\\'")}')">
                            <div class="card-body">
                                <h5 class="card-title">${project.title}</h5>
                                <p class="card-text text-muted">${project.description || 'No description'}</p>
                            </div>
                        </div>
                    `;
                        projectsList.appendChild(col);
                    });
                } else {
                    if (data.message === 'Unauthorized') {
                        window.location.href = 'index.html';
                    }
                }
            })
            .catch(error => console.error('Error:', error));
    }

    window.showProjects = function () {
        if (pollInterval) clearInterval(pollInterval);
        boardView.classList.add('d-none');
        if (analyticsView) analyticsView.classList.add('d-none');
        projectsView.classList.remove('d-none');
        loadProjects();
    };

    const createProjectForm = document.getElementById('create-project-form');
    if (createProjectForm) {
        createProjectForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const title = document.getElementById('project-title').value;
            const description = document.getElementById('project-desc').value;

            fetch('api/projects.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, description })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const modal = bootstrap.Modal.getInstance(document.getElementById('createProjectModal'));
                        modal.hide();
                        document.getElementById('create-project-form').reset();
                        loadProjects();
                    } else {
                        alert(data.message);
                    }
                });
        });
    }

    // --- Board Logic ---

    window.loadProject = function (projectId, projectTitle) {
        currentProjectId = projectId;
        projectsView.classList.add('d-none');
        if (analyticsView) analyticsView.classList.add('d-none');
        boardView.classList.remove('d-none');
        document.getElementById('board-title').innerText = projectTitle;

        fetchBoardData();

        // Start Polling (every 5 seconds)
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(fetchBoardData, 5000);
    };

    function fetchBoardData() {
        if (!currentProjectId) return;

        fetch(`api/tasks.php?project_id=${currentProjectId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    renderBoard(data.data);
                }
            });
    }

    function renderBoard(lists) {
        const boardContainer = document.getElementById('board-container');
        boardContainer.innerHTML = '';

        lists.forEach(list => {
            const listEl = document.createElement('div');
            listEl.className = 'kanban-list';
            listEl.dataset.listId = list.id;

            // Allow dropping on list
            listEl.ondragover = allowDrop;
            listEl.ondrop = drop;

            listEl.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h6 class="fw-bold mb-0">${list.title}</h6>
                    <i class="fas fa-ellipsis-h text-muted cursor-pointer"></i>
                </div>
                <div class="tasks-container" id="list-${list.id}" style="min-height: 50px;">
                    ${list.tasks.map(task => `
                        <div class="task-card" draggable="true" ondragstart="drag(event)" id="task-${task.id}" data-id="${task.id}" 
                             onclick="openTaskModal(${task.id}, '${task.title.replace(/'/g, "\\'")}', '${(task.description || '').replace(/'/g, "\\'")}', '${task.due_date || ''}')">
                            ${task.title}
                            ${task.due_date ? `<br><small class="text-muted"><i class="fas fa-clock"></i> ${new Date(task.due_date).toLocaleDateString()}</small>` : ''}
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-sm btn-light text-start text-muted mt-2" onclick="addTask(${list.id})">
                    <i class="fas fa-plus me-2"></i>Add a card
                </button>
            `;
            boardContainer.appendChild(listEl);
        });
    }

    window.addTask = function (listId) {
        const title = prompt("Enter task title:");
        if (title) {
            fetch('api/tasks.php?action=create_task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ list_id: listId, title: title })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        fetchBoardData();
                    } else {
                        alert(data.message);
                    }
                });
        }
    };

    // --- Task Details (Edit/Delete) ---
    const editTaskModalEl = document.getElementById('editTaskModal');
    let editTaskModal = null;
    if (editTaskModalEl) {
        editTaskModal = new bootstrap.Modal(editTaskModalEl);
    }

    const editTaskForm = document.getElementById('edit-task-form');
    const deleteTaskBtn = document.getElementById('delete-task-btn');

    // Open Modal
    window.openTaskModal = function (id, title, description, dueDate) {
        if (!editTaskModal) return;
        document.getElementById('edit-task-id').value = id;
        document.getElementById('edit-task-title').value = title;
        document.getElementById('edit-task-desc').value = description || '';
        document.getElementById('edit-task-due').value = dueDate || '';
        editTaskModal.show();
    };

    // Save Changes
    if (editTaskForm) {
        editTaskForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const id = document.getElementById('edit-task-id').value;
            const title = document.getElementById('edit-task-title').value;
            const description = document.getElementById('edit-task-desc').value;
            const dueDate = document.getElementById('edit-task-due').value;

            fetch('api/tasks.php?action=update_task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: id, title, description, due_date: dueDate })
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        editTaskModal.hide();
                        fetchBoardData();
                    } else {
                        alert(data.message);
                    }
                });
        });
    }

    // Delete Task
    if (deleteTaskBtn) {
        deleteTaskBtn.addEventListener('click', function () {
            if (confirm('Are you sure you want to delete this task?')) {
                const id = document.getElementById('edit-task-id').value;
                fetch('api/tasks.php?action=delete_task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task_id: id })
                })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            editTaskModal.hide();
                            fetchBoardData();
                        } else {
                            alert(data.message);
                        }
                    });
            }
        });
    }

    // --- Drag and Drop ---

    window.allowDrop = function (ev) {
        ev.preventDefault();
    };

    window.drag = function (ev) {
        ev.dataTransfer.setData("text", ev.target.id);
    };

    window.drop = function (ev) {
        ev.preventDefault();
        var data = ev.dataTransfer.getData("text");
        var draggedElement = document.getElementById(data);

        // Find the closest task container (list)
        var targetList = ev.target.closest('.kanban-list');
        var tasksContainer = targetList.querySelector('.tasks-container');

        if (tasksContainer) {
            tasksContainer.appendChild(draggedElement);

            // Update backend
            const taskId = draggedElement.getAttribute('data-id');
            const listId = targetList.getAttribute('data-list-id');

            fetch('api/tasks.php?action=move_task', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: taskId, list_id: listId })
            })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        alert('Failed to move task: ' + data.message);
                    } else {
                        // Update analytics if visible? For now, polling will handle it eventually, 
                        // but if we are on analytics page it's hidden anyway.
                        // If we wanted to be super fancy we could update local counts.
                    }
                });
        }
    };

    // Initial Load
    if (projectsView && !projectsView.classList.contains('d-none')) {
        loadProjects();
    }
});
