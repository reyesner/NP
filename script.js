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