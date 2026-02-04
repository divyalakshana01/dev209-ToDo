const API_URL = "http://localhost:3000"; // Update this to your backend URL

// --- 1. COOKIE HELPERS ---
function setCookie(name, value, days) {
    if (!value) {
        console.error("FAILED TO SET COOKIE: Value is empty!");
        return;
    }
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + d.toUTCString();
    
    // We add path=/ so it works on all your pages
    document.cookie = `${name}=${value}; ${expires}; path=/; SameSite=Lax`;
    
    console.log("SUCCESS: Cookie set ->", document.cookie);
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
    console.log("Full Login Data:", data);

    if (data.token) {
        // 1. Save the token so we can use it for later API calls
        setCookie('authToken', data.token, 1);
        // 2. Refresh the UI to hide login and show the list
        updateUI();
        // 3. Fetch the actual tasks from the server
        fetchTodos();
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
    const token = getCookie('authToken');
    if (!token) return;

    const response = await fetch(`${API_URL}/todos`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    const todos = await response.json();
    const listElement = document.getElementById('todo-list');
    listElement.innerHTML = ''; 

    if (Array.isArray(todos)) {
        todos.forEach(todo => {
            const li = document.createElement('li');
            li.id = `item-${todo.id}`; // Unique ID for the row
            li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    
            // Initial static view
            renderTodoItem(li, todo);
    
            listElement.appendChild(li);
        });
    }
}

// Function for the normal view
function renderTodoItem(li, todo) {
    li.innerHTML = `
        <div class="todo-info">
            <strong style="${todo.completed ? 'text-decoration: line-through; color: #bcc0c4;' : ''}">
                ${todo.title}
            </strong>
            <p>${todo.description || ''}</p>
            <span class="status-badge" style="color: ${todo.completed ? '#42b72a' : '#f0ad4e'}">
                ${todo.completed ? 'COMPLETED' : 'PENDING'}
            </span>
        </div>
        <div class="todo-actions">
            <button onclick="toggleComplete('${todo.id}', ${!todo.completed})">
                ${todo.completed ? 'Undo' : 'Complete'}
            </button>
            <button onclick="showEditForm('${todo.id}')">Edit</button>
            <button onclick="deleteTodo('${todo.id}')" class="btn-danger">Delete</button>
        </div>
    `;
}

// Function to switch into the Edit Form view
async function showEditForm(id) {
    const li = document.getElementById(`item-${id}`);
    
    // Extract current text to pre-fill the form
    const currentTitle = li.querySelector('strong').innerText;
    const currentDesc = li.querySelector('p').innerText;

    li.innerHTML = `
        <div class="edit-form-inline">
            <input type="text" id="edit-title-${id}" value="${currentTitle}" class="inline-edit-input">
            <textarea id="edit-desc-${id}" class="inline-edit-input">${currentDesc}</textarea>
            <div class="todo-actions">
                <button onclick="saveEdit('${id}')" class="btn-success">Save</button>
                <button onclick="fetchTodos()" class="btn-secondary">Cancel</button>
            </div>
        </div>
    `;
}

async function saveEdit(id) {
    const newTitle = document.getElementById(`edit-title-${id}`).value;
    const newDesc = document.getElementById(`edit-desc-${id}`).value;
    const token = getCookie('authToken');

    const res = await fetch(`${API_URL}/todos/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token 
        },
        body: JSON.stringify({ 
            title: newTitle, 
            description: newDesc 
        })
    });

    if (res.ok) {
        fetchTodos(); // Refresh to show updated data
    } else {
        alert("Failed to save changes.");
    }
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