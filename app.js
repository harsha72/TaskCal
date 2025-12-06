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
const selectedDateLabel = document.getElementById('selectedDateLabel');

// Initialize
function init() {
    renderCalendar();
    const todayKey = getDateKey(new Date());
    selectDate(todayKey);
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js');
    }
}

function getDateKey(date) {
    return date.toISOString().split('T')[0];
}

function renderCalendar() {
    calendarEl.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearEl.innerText = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => {
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
        const cellKey = new Date(cellDate.getTime() - (cellDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        div.dataset.date = cellKey;

        if (cellKey === selectedDate) div.classList.add('active');
        
        // Check if there are any pending tasks to show visual indicator
        if (tasks[cellKey] && tasks[cellKey].length > 0) {
            // Optional: You could check if all are completed to remove the dot, 
            // but currently it shows dot if ANY task exists.
            div.classList.add('has-tasks');
        }

        div.addEventListener('click', () => selectDate(cellKey));
        calendarEl.appendChild(div);
    }
}

function selectDate(dateKey) {
    selectedDate = dateKey;
    const dateObj = new Date(dateKey);
    // Format date nicely (e.g., "Mon, Oct 25")
    selectedDateLabel.innerText = dateObj.toLocaleDateString('default', { weekday: 'short', month: 'long', day: 'numeric' });
    renderCalendar();
    renderTasks();
}

function renderTasks() {
    // Clear both lists
    activeTaskListEl.innerHTML = '';
    completedTaskListEl.innerHTML = '';
    
    const dateTasks = tasks[selectedDate] || [];

    // Counters
    let completedCount = 0;

    // Loop through all tasks for this date
    dateTasks.forEach((task, index) => {
        const li = document.createElement('li');
        
        // HTML structure for the list item
        li.innerHTML = `
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${index})">
            <span>${task.text}</span>
            <button class="delete-btn" onclick="deleteTask(${index})">✕</button>
        `;

        if (task.completed) {
            completedCount++;
            completedTaskListEl.appendChild(li);
        } else {
            activeTaskListEl.appendChild(li);
        }
    });

    // Handle Completed Section Visibility
    if (completedCount > 0) {
        completedSection.style.display = 'block';
        completedHeader.innerText = `Completed (${completedCount})`;
    } else {
        completedSection.style.display = 'none';
    }
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text || !selectedDate) return;

    if (!tasks[selectedDate]) tasks[selectedDate] = [];
    tasks[selectedDate].push({ text, completed: false });
    
    saveData();
    taskInput.value = '';
    renderTasks();
    renderCalendar();
}

window.toggleTask = (index) => {
    // Toggle the specific task
    tasks[selectedDate][index].completed = !tasks[selectedDate][index].completed;
    saveData();
    renderTasks(); // Re-render to move it to the other list
};

window.deleteTask = (index) => {
    tasks[selectedDate].splice(index, 1);
    if (tasks[selectedDate].length === 0) delete tasks[selectedDate];
    saveData();
    renderTasks();
    renderCalendar();
};

function saveData() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
});
document.getElementById('addTaskBtn').addEventListener('click', addTask);

// Allow "Enter" key to add task
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

init();