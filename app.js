// State
let currentDate = new Date();
let selectedDate = null;
let tasks = JSON.parse(localStorage.getItem('tasks')) || {};

// DOM Elements
const monthYearEl = document.getElementById('monthYear');
const calendarEl = document.getElementById('calendar');
const activeTaskListEl = document.getElementById('activeTaskList');
const completedTaskListEl = document.getElementById('completedTaskList');
const completedSection = document.getElementById('completedSection');
const completedHeader = document.getElementById('completedHeader');
const taskInput = document.getElementById('taskInput');
const priorityInput = document.getElementById('priorityInput');
const selectedDateLabel = document.getElementById('selectedDateLabel');

// Recurrence Elements
const isRecurringCb = document.getElementById('isRecurring');
const recurrenceOptions = document.getElementById('recurrenceOptions');
const repeatFreq = document.getElementById('repeatFreq');
const customDaysSelector = document.getElementById('customDaysSelector');
const recurrenceEndDate = document.getElementById('recurrenceEndDate');

// Settings Elements
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const settingsModal = document.getElementById('settingsModal');
const exportBtn = document.getElementById('exportBtn');
const importFile = document.getElementById('importFile');

function init() {
    renderCalendar();
    const todayKey = getDateKey(new Date());
    selectDate(todayKey);
    
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    recurrenceEndDate.value = getDateKey(nextMonth);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').then(reg => reg.update());
    }
}

function getDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function renderCalendar() {
    calendarEl.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearEl.innerText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = getDateKey(new Date());

    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(d => {
        const div = document.createElement('div');
        div.className = 'day-name';
        div.innerText = d;
        calendarEl.appendChild(div);
    });

    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'day empty';
        calendarEl.appendChild(div);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const div = document.createElement('div');
        div.className = 'day';
        div.innerText = i;
        
        const cellDate = new Date(year, month, i);
        const cellKey = getDateKey(cellDate);
        div.dataset.date = cellKey;

        if (cellKey === selectedDate) div.classList.add('active');
        
        const dayTasks = tasks[cellKey] || [];
        if (dayTasks.length > 0) {
            const hasIncomplete = dayTasks.some(t => !t.completed);
            const isPast = cellKey < todayKey;

            if (isPast && hasIncomplete) div.classList.add('past-incomplete');
            else div.classList.add('has-tasks');
        }

        div.addEventListener('click', () => selectDate(cellKey));
        calendarEl.appendChild(div);
    }
}

function selectDate(dateKey) {
    selectedDate = dateKey;
    const [y, m, d] = dateKey.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    selectedDateLabel.innerText = dateObj.toLocaleDateString('default', { weekday: 'short', month: 'long', day: 'numeric' });
    renderCalendar();
    renderTasks();
}

function renderTasks() {
    activeTaskListEl.innerHTML = '';
    completedTaskListEl.innerHTML = '';
    
    const dateTasks = tasks[selectedDate] || [];
    let completedCount = 0;

    dateTasks.forEach((task, index) => {
        const li = document.createElement('li');
        const prio = task.priority || 'medium';

        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            
            <select class="list-priority ${prio}" onchange="updateTaskPriority(${index}, this.value)">
                <option value="low" ${prio === 'low' ? 'selected' : ''}>Low</option>
                <option value="medium" ${prio === 'medium' ? 'selected' : ''}>Med</option>
                <option value="high" ${prio === 'high' ? 'selected' : ''}>High</option>
            </select>

            <input type="text" class="task-text" value="${task.text}" onchange="updateTaskText(${index}, this.value)">

            <button class="delete-btn" onclick="deleteTask(${index})">✕</button>
        `;

        if (task.completed) {
            completedCount++;
            completedTaskListEl.appendChild(li);
        } else {
            activeTaskListEl.appendChild(li);
        }
    });

    if (completedCount > 0) {
        completedSection.style.display = 'block';
        completedHeader.innerText = `Completed (${completedCount})`;
    } else {
        completedSection.style.display = 'none';
    }
}

function addTask() {
    const text = taskInput.value.trim();
    const priority = priorityInput.value;

    if (!text || !selectedDate) return;

    if (isRecurringCb.checked) {
        const endDateVal = recurrenceEndDate.value;
        if (!endDateVal) { alert("Please select an end date"); return; }
        
        const freq = repeatFreq.value;
        const [sy, sm, sd] = selectedDate.split('-').map(Number);
        const start = new Date(sy, sm - 1, sd);
        const [ey, em, ed] = endDateVal.split('-').map(Number);
        const end = new Date(ey, em - 1, ed);

        if (end < start) { alert("End date cannot be before start date."); return; }

        let allowedDays = [];
        if (freq === 'custom') {
            document.querySelectorAll('#customDaysSelector input:checked').forEach(cb => allowedDays.push(parseInt(cb.value)));
            if (allowedDays.length === 0) { alert("Select at least one day."); return; }
        }

        let loopDate = new Date(start);
        while (loopDate <= end) {
            const currentKey = getDateKey(loopDate);
            let shouldAdd = false;

            if (freq === 'daily') shouldAdd = true;
            else if (freq === 'weekly') { if (loopDate.getDay() === start.getDay()) shouldAdd = true; }
            else if (freq === 'monthly') { if (loopDate.getDate() === start.getDate()) shouldAdd = true; }
            else if (freq === 'custom') { if (allowedDays.includes(loopDate.getDay())) shouldAdd = true; }

            if (shouldAdd) {
                saveTaskToDate(currentKey, text, priority);
            }
            loopDate.setDate(loopDate.getDate() + 1);
        }
        
        isRecurringCb.checked = false;
        recurrenceOptions.classList.add('hidden');
    } else {
        saveTaskToDate(selectedDate, text, priority);
    }
    
    saveData();
    taskInput.value = '';
    priorityInput.value = 'medium';
    priorityInput.className = 'priority-select medium'; 
    renderTasks();
    renderCalendar();
}

function saveTaskToDate(dateKey, text, priority) {
    if (!tasks[dateKey]) tasks[dateKey] = [];
    tasks[dateKey].push({ text, completed: false, priority: priority });
}

window.toggleTask = (index) => {
    tasks[selectedDate][index].completed = !tasks[selectedDate][index].completed;
    saveData();
    renderTasks();
    renderCalendar();
};

window.deleteTask = (index) => {
    tasks[selectedDate].splice(index, 1);
    if (tasks[selectedDate].length === 0) delete tasks[selectedDate];
    saveData();
    renderTasks();
    renderCalendar();
};

window.updateTaskPriority = (index, newPriority) => {
    tasks[selectedDate][index].priority = newPriority;
    saveData();
    renderTasks();
};

window.updateTaskText = (index, newText) => {
    tasks[selectedDate][index].text = newText;
    saveData();
};

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// --- NEW DATA MANAGEMENT FUNCTIONS ---

function toggleSettings() {
    settingsModal.classList.toggle('hidden');
}

function exportData() {
    // Convert data to JSON string
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tasks));
    const downloadAnchor = document.createElement('a');
    
    // Create filename like: taskcal_backup_2023-10-25.json
    const dateStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `taskcal_backup_${dateStr}.json`);
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedTasks = JSON.parse(e.target.result);
            // Basic validation: check if it's an object
            if (typeof importedTasks === 'object' && importedTasks !== null) {
                tasks = importedTasks;
                saveData();
                renderCalendar();
                renderTasks();
                toggleSettings(); // Close modal
                alert("Data restored successfully!");
            } else {
                alert("Invalid file format.");
            }
        } catch (err) {
            console.error(err);
            alert("Error reading file. Make sure it's a valid JSON backup.");
        }
    };
    reader.readAsText(file);
    // Reset input so same file can be selected again if needed
    event.target.value = '';
}

// Event Listeners
document.getElementById('prevMonth').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
document.getElementById('nextMonth').addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
document.getElementById('addTaskBtn').addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addTask(); });

priorityInput.addEventListener('change', (e) => {
    priorityInput.className = `priority-select ${e.target.value}`;
});

isRecurringCb.addEventListener('change', (e) => {
    recurrenceOptions.classList.toggle('hidden', !e.target.checked);
});
repeatFreq.addEventListener('change', (e) => {
    customDaysSelector.classList.toggle('hidden', e.target.value !== 'custom');
});

// Settings Listeners
settingsBtn.addEventListener('click', toggleSettings);
closeSettingsBtn.addEventListener('click', toggleSettings);
// Close modal if clicking outside content
settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) toggleSettings();
});
exportBtn.addEventListener('click', exportData);
importFile.addEventListener('change', importData);

init();