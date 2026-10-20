const STORAGE_KEY = "meuToDoTarefas";

const $ = (id) => document.getElementById(id);

const viewInfo = {
    today: {
        title: "Meu dia",
        icon: "☀",
        subtitle: "Organize o que precisa ser feito hoje."
    },
    important: {
        title: "Importante",
        icon: "☆",
        subtitle: "Suas tarefas prioritárias."
    },
    planned: {
        title: "Planejado",
        icon: "▦",
        subtitle: "Tarefas com data de entrega."
    },
    assigned: {
        title: "Atribuído a mim",
        icon: "♙",
        subtitle: "Atividades sob sua responsabilidade."
    },
    completed: {
        title: "Concluído",
        icon: "✓",
        subtitle: "Tudo o que você já finalizou."
    },
    all: {
        title: "Todas as tarefas",
        icon: "☰",
        subtitle: "Visualize todas as suas atividades."
    },
    distributors: {
        title: "Distribuidores",
        icon: "▤",
        subtitle: "Organize as tarefas por distribuidor."
    }
};

let tasks = loadTasks();
let currentView = "today";
let editingId = null;

function localDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadTasks() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch {
        alert("Não foi possível salvar. Verifique o espaço disponível no navegador.");
        return false;
    }
}

function escapeHTML(value = "") {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function formatDate(date) {
    if (!date) return "";

    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
}

function isOverdue(task) {
    return !task.completed && task.date && task.date < localDate();
}

function isToday(task) {
    return task.date === localDate();
}

function getVisibleTasks() {
    const search = $("search-input").value.trim().toLowerCase();
    const statusFilter = $("filter-status").value;

    return tasks.filter(task => {
        if (statusFilter === "pending" && task.completed) return false;
        if (statusFilter === "completed" && !task.completed) return false;

        if (search) {
            const searchable = [
                task.title,
                task.distributor,
                task.category,
                task.assignee,
                task.notes
            ].join(" ").toLowerCase();

            if (!searchable.includes(search)) return false;
        }

        switch (currentView) {
            case "today":
                return !task.completed && isToday(task);

            case "important":
                return !task.completed &&
                    (task.priority === "important" || task.priority === "urgent");

            case "planned":
                return !task.completed && Boolean(task.date) &&
                    task.date > localDate();

            case "assigned":
                return !task.completed &&
                    Boolean(task.assignee.trim());

            case "completed":
                return task.completed;

            case "distributors":
                return Boolean(task.distributor.trim());

            case "all":
            default:
                return true;
        }
    }).sort((a, b) => {
        if (a.completed !== b.completed) {
            return Number(a.completed) - Number(b.completed);
        }

        const priorityOrder = { urgent: 0, important: 1, normal: 2 };
        const priorityDifference =
            priorityOrder[a.priority] - priorityOrder[b.priority];

        if (priorityDifference !== 0) return priorityDifference;

        return (a.date || "9999-12-31").localeCompare(
            b.date || "9999-12-31"
        );
    });
}

function updateCounts() {
    $("count-today").textContent =
        tasks.filter(task => !task.completed && isToday(task)).length;

    $("count-important").textContent =
        tasks.filter(task =>
            !task.completed &&
            ["important", "urgent"].includes(task.priority)
        ).length;

    $("count-planned").textContent =
        tasks.filter(task =>
            !task.completed && task.date && task.date > localDate()
        ).length;

    $("count-completed").textContent =
        tasks.filter(task => task.completed).length;
}

function renderTasks() {
    const info = viewInfo[currentView];

    $("page-title").textContent = info.title;
    $("page-subtitle").textContent = info.subtitle;
    $("heading-icon").textContent = info.icon;
    $("breadcrumb-current").textContent = info.title.toUpperCase();

    document.querySelectorAll(".menu-item[data-view]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.view === currentView
        );
    });

    updateCounts();

    const visibleTasks = getVisibleTasks();
    const pending = visibleTasks.filter(task => !task.completed).length;

    $("task-summary").textContent =
        `${pending} ${pending === 1 ? "tarefa pendente" : "tarefas pendentes"}`;

    const container = $("task-groups");
    container.innerHTML = "";

    if (visibleTasks.length === 0) {
        $("empty-state").hidden = false;
        return;
    }

    $("empty-state").hidden = true;

    if (currentView === "distributors") {
        const groups = {};

        visibleTasks.forEach(task => {
            const name = task.distributor.trim() || "Sem distribuidor";

            if (!groups[name]) groups[name] = [];
            groups[name].push(task);
        });

        Object.keys(groups).sort().forEach(name => {
            addGroup(container, name, groups[name]);
        });

        return;
    }

    const overdue = visibleTasks.filter(isOverdue);
    const today = visibleTasks.filter(task =>
        !task.completed && isToday(task) && !isOverdue(task)
    );
    const completed = visibleTasks.filter(task => task.completed);
    const future = visibleTasks.filter(task =>
        !task.completed && task.date &&
        task.date > localDate()
    );
    const noDate = visibleTasks.filter(task =>
        !task.completed && !task.date
    );

    if (overdue.length) addGroup(container, "Atrasadas", overdue);
    if (today.length) addGroup(container, "Hoje", today);
    if (future.length) addGroup(container, "Próximas tarefas", future);
    if (noDate.length) addGroup(container, "Sem data", noDate);
    if (completed.length) addGroup(container, "Concluídas", completed);
}

function addGroup(container, title, groupTasks) {
    const section = document.createElement("section");
    section.className = "task-group";

    const heading = document.createElement("h2");
    heading.className = "group-heading";
    heading.textContent = title;
    section.appendChild(heading);

    groupTasks.forEach(task => {
        section.appendChild(createTaskCard(task));
    });

    container.appendChild(section);
}

function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "task-card" + (task.completed ? " is-completed" : "");

    let priorityLabel = "";

    if (task.priority === "urgent") {
        priorityLabel = '<span class="task-tag urgent">Urgente</span>';
    } else if (task.priority === "important") {
        priorityLabel = '<span class="task-tag important">Importante</span>';
    }

    let dateLabel = "";

    if (task.date) {
        const overdueClass = isOverdue(task) ? " overdue" : "";
        const prefix = isOverdue(task) ? "Atrasada: " : "Prazo: ";

        dateLabel = `<span class="task-date${overdueClass}">${
            prefix + escapeHTML(formatDate(task.date))
        }</span>`;
    }

    const distributor = task.distributor
        ? `<span>${escapeHTML(task.distributor)}</span>`
        : "";

    const category = task.category
        ? `<span class="task-tag">${escapeHTML(task.category)}</span>`
        : "";

    const assignee = task.assignee
        ? `<span>Responsável: ${escapeHTML(task.assignee)}</span>`
        : "";

    card.innerHTML = `
        <input class="task-check" type="checkbox"
            aria-label="Marcar tarefa como concluída"
            ${task.completed ? "checked" : ""}>

        <div class="task-main" role="button" tabindex="0"
            aria-label="Ver detalhes de ${escapeHTML(task.title)}">
            <div class="task-title">${escapeHTML(task.title)}</div>
            <div class="task-meta">
                ${priorityLabel}
                ${dateLabel}
                ${category}
                ${distributor}
                ${assignee}
            </div>
        </div>

        <div class="task-actions">
            <button type="button" class="task-action edit-task"
                aria-label="Editar tarefa" title="Editar">✎</button>
            <button type="button" class="task-action delete-task"
                aria-label="Excluir tarefa" title="Excluir">×</button>
        </div>
    `;

    card.querySelector(".task-check").addEventListener("change", event => {
        task.completed = event.target.checked;
        task.completedAt = task.completed ? localDate() : null;
        saveTasks();
        renderTasks();
    });

    const main = card.querySelector(".task-main");

    main.addEventListener("click", () => showDetails(task));

    main.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            showDetails(task);
        }
    });

    card.querySelector(".edit-task").addEventListener("click", () => {
        openEditor(task);
    });

    card.querySelector(".delete-task").addEventListener("click", () => {
        if (confirm(`Deseja excluir a tarefa "${task.title}"?`)) {
            tasks = tasks.filter(item => item.id !== task.id);
            saveTasks();
            renderTasks();
        }
    });

    return card;
}

function openEditor(task = null, quickTitle = "") {
    editingId = task ? task.id : null;

    $("form-title").textContent = task ? "Editar tarefa" : "Nova tarefa";
    $("detail-title").value = task ? task.title : quickTitle;
    $("detail-distributor").value = task ? task.distributor : "";
    $("detail-date").value = task ? task.date : "";
    $("detail-priority").value = task ? task.priority : "normal";
    $("detail-category").value = task ? task.category : "Trabalho";
    $("detail-assignee").value = task ? task.assignee : "";
    $("detail-notes").value = task ? task.notes : "";

    $("details-form").hidden = false;
    $("details-form").scrollIntoView({ behavior: "smooth", block: "start" });
    $("detail-title").focus();
}

function closeEditor() {
    editingId = null;
    $("details-form").hidden = true;
    $("details-form").reset();
}

function showDetails(task) {
    const fields = [
        ["Tarefa", task.title],
        ["Distribuidor / projeto", task.distributor || "Não informado"],
        ["Data de entrega", task.date ? formatDate(task.date) : "Sem data"],
        ["Prioridade", {
            normal: "Normal",
            important: "Importante",
            urgent: "Urgente"
        }[task.priority] || "Normal"],
        ["Categoria", task.category || "Não informada"],
        ["Responsável", task.assignee || "Não informado"],
        ["Status", task.completed ? "Concluída" : "Pendente"],
        ["Observações", task.notes || "Sem observações"]
    ];

    $("dialog-content").innerHTML = fields.map(([label, value]) => `
        <div class="dialog-line">
            <span class="dialog-label">${escapeHTML(label)}</span>
            <div class="dialog-value">${escapeHTML(value)}</div>
        </div>
    `).join("");

    $("dialog-content").innerHTML += `
        <div class="form-actions">
            <button type="button" class="secondary-button" id="dialog-edit">
                Editar
            </button>
        </div>
    `;

    $("dialog-edit").addEventListener("click", () => {
        $("task-dialog").close();
        openEditor(task);
    });

    $("task-dialog").showModal();
}

$("task-form").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("task-title").value.trim();
    if (!title) return;

    $("task-title").value = "";
    openEditor(null, title);
});

$("details-form").addEventListener("submit", event => {
    event.preventDefault();

    const title = $("detail-title").value.trim();
    if (!title) return;

    const existing = tasks.find(task => task.id === editingId);

    const taskData = {
        id: existing ? existing.id : createId(),
        title,
        distributor: $("detail-distributor").value.trim(),
        date: $("detail-date").value,
        priority: $("detail-priority").value,
        category: $("detail-category").value,
        assignee: $("detail-assignee").value.trim(),
        notes: $("detail-notes").value.trim(),
        completed: existing ? existing.completed : false,
        completedAt: existing ? existing.completedAt : null,
        createdAt: existing ? existing.createdAt : localDate()
    };

    if (existing) {
        tasks = tasks.map(task =>
            task.id === editingId ? taskData : task
        );
    } else {
        tasks.push(taskData);
    }

    saveTasks();
    closeEditor();
    renderTasks();
});

$("cancel-edit").addEventListener("click", closeEditor);
$("cancel-edit-bottom").addEventListener("click", closeEditor);
$("close-dialog").addEventListener("click", () => $("task-dialog").close());

document.querySelectorAll(".menu-item[data-view], .logo[data-view]")
    .forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            currentView = button.dataset.view;
            $("search-input").value = "";
            $("filter-status").value = "all";
            closeEditor();
            renderTasks();
        });
    });

$("search-input").addEventListener("input", renderTasks);
$("filter-status").addEventListener("change", renderTasks);

$("export-button").addEventListener("click", () => {
    const blob = new Blob(
        [JSON.stringify(tasks, null, 2)],
        { type: "application/json;charset=utf-8" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `minhas-tarefas-${localDate()}.json`;
    link.click();

    URL.revokeObjectURL(url);
});

$("current-date").textContent = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
}).format(new Date());

renderTasks();