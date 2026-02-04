const API_URL = "http://localhost:3000"; // Update this to your backend URL

// --- 1. COOKIE HELPERS ---
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function deleteCookie(name) {
    document.cookie = name + '=; Max-Age=-99999999;';
}

// --- 2. UI HELPERS ---
function toggleAuthForm(type) {
    document.getElementById('login-form').style.display = type === 'login' ? 'block' : 'none';
    document.getElementById('register-form').style.display = type === 'register' ? 'block' : 'none';
}

function updateUI() {
    const token = getCookie('authToken');
    if (token) {
        document.getElementById('auth-screen').style.display = 'none';
        document.getElementById('todo-screen').style.display = 'block';
        fetchTodos();
    } else {
        document.getElementById('auth-screen').style.display = 'block';
        document.getElementById('todo-screen').style.display = 'none';
    }
}

// --- 3. API ACTIONS ---

// REGISTER & LOGIN
document.getElementById('register-form').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const password = document.getElementById('reg-password').value;

    const res = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    if (res.ok) alert("Account created! Now login.");
};

document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
        setCookie('authToken', data.token, 1);
        updateUI();
    } else {
        alert("Login failed");
    }
};

// CREATE TODO
document.getElementById('todo-form').onsubmit = async (e) => {
    e.preventDefault();
    const title = document.getElementById('todo-title').value;
    const description = document.getElementById('todo-desc').value;

    await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getCookie('authToken')}`
        },
        body: JSON.stringify({ title, description })
    });
    e.target.reset();
    fetchTodos();
};

// READ TODOS
async function fetchTodos() {
    const res = await fetch(`${API_URL}/todos`, {
        headers: { 'Authorization': `Bearer ${getCookie('authToken')}` }
    });
    const todos = await res.json();
    const list = document.getElementById('todo-list');
    list.innerHTML = '';

    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <span><strong>${todo.title}</strong></span>
            <small>${todo.description || ''}</small>
            <div class="todo-controls">
                <button onclick="toggleComplete('${todo._id}', ${!todo.completed})">
                    ${todo.completed ? 'Undo' : 'Complete'}
                </button>
                <button onclick="editTodo('${todo._id}', '${todo.title}')">Edit</button>
                <button onclick="deleteTodo('${todo._id}')" class="btn-danger">Delete</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// UPDATE & DELETE
async function toggleComplete(id, status) {
    await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getCookie('authToken')}`
        },
        body: JSON.stringify({ completed: status })
    });
    fetchTodos();
}

async function editTodo(id, oldTitle) {
    const newTitle = prompt("Edit Title:", oldTitle);
    if (!newTitle) return;
    await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getCookie('authToken')}`
        },
        body: JSON.stringify({ title: newTitle })
    });
    fetchTodos();
}

async function deleteTodo(id) {
    if (confirm("Delete this task?")) {
        await fetch(`${API_URL}/todos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getCookie('authToken')}` }
        });
        fetchTodos();
    }
}

// LOGOUT
document.getElementById('logout-btn').onclick = () => {
    deleteCookie('authToken');
    updateUI();
};

// Start the app & maintain state on refresh
updateUI();