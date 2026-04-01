import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "https://sgoujlmsnyxravwowdag.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3VqbG1zbnl4cmF2d293ZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzEzMTAsImV4cCI6MjA5MDU0NzMxMH0.YL0ySMYZZhcvurRAQc-Fo7zeJhxSUijUONodP4pk1JA";

const supabase = createClient(supabaseUrl, supabaseKey);

async function loadUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('*');

  if (error) {
    console.error(error);
  } else {
    console.log(data);
  }
}

loadUsers();

document.addEventListener('DOMContentLoaded', () => {
  const toggler = document.getElementsByClassName('caret');
  for (let i = 0; i < toggler.length; i++) {
    toggler[i].addEventListener('click', function () {
      this.parentElement.querySelector('.nested').classList.toggle('active');
      this.classList.toggle('caret-down');
    });
  }
});


////////////////////////////////

function addTask(button) {
  const text = prompt("Enter task:");
  if (!text) return;

  const task = document.createElement("div");
  task.className = "task";
  task.draggable = true;
  task.textContent = text;

  // Edit on click
  task.onclick = () => {
    const newText = prompt("Edit task:", task.textContent);
    if (newText) task.textContent = newText;
  };

  addDragEvents(task);

  button.parentElement.appendChild(task);
}


// ////////////////////////////////
let draggedTask = null;

// Add drag behavior to tasks
function addDragEvents(task) {
  task.addEventListener("dragstart", () => {
    draggedTask = task;
  });
}

// Allow columns to receive tasks
document.querySelectorAll(".column").forEach(col => {
  col.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  col.addEventListener("drop", () => {
    if (draggedTask) {
      col.appendChild(draggedTask);
    }
  });
});

document.querySelectorAll(".add-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    addTask(this);
  });
});

window.addTask = addTask;


// Create task element with delete button

function createTaskElement(text) {
  const task = document.createElement("div");
  task.className = "task d-flex justify-content-between align-items-center";
  task.draggable = true;

  const span = document.createElement("span");
  span.textContent = text;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✕";
  deleteBtn.className = "btn btn-sm btn-danger";

  deleteBtn.onclick = () => {
    task.remove();

    // OPTIONAL: delete from Supabase
    // await supabase.from('tasks').delete().eq('id', taskId);
  };

  task.appendChild(span);
  task.appendChild(deleteBtn);

  addDragEvents(task);
  return task;
}

window.createTaskElement = createTaskElement;


// Modal logic

let currentColumn = null;

document.querySelectorAll(".add-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    currentColumn = this.parentElement;

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  });
});

document.getElementById("saveTask").addEventListener("click", async () => {
  const title = document.getElementById("taskTitle").value;

  if (!title) return;

  const task = createTaskElement(title);
  currentColumn.appendChild(task);

  // ✅ Save to Supabase
  await supabase.from('tasks').insert([
    { title: title, status: currentColumn.dataset.status }
  ]);

  document.getElementById("taskTitle").value = "";

  bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
});