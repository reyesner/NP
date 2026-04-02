import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "https://sgoujlmsnyxravwowdag.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3VqbG1zbnl4cmF2d293ZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzEzMTAsImV4cCI6MjA5MDU0NzMxMH0.YL0ySMYZZhcvurRAQc-Fo7zeJhxSUijUONodP4pk1JA";

const supabase = createClient(supabaseUrl, supabaseKey);



let currentColumn = null;
let draggedTask = null;


async function loadTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*');

  if (error) {
    console.error(error);
    return;
  }

  data.forEach(taskData => {
    const column = document.querySelector(
      `[data-status="${taskData.status}"]`
    );

    if (column) {
      const taskEl = createTaskElement(taskData);
      column.appendChild(taskEl);
    }
  });
}


document.addEventListener('DOMContentLoaded', () => {
  loadTasks();
  const toggler = document.getElementsByClassName('caret');
  for (let i = 0; i < toggler.length; i++) {
    toggler[i].addEventListener('click', function () {
      this.parentElement.querySelector('.nested').classList.toggle('active');
      this.classList.toggle('caret-down');
    });
  }

  // Add button
  document.querySelectorAll(".add-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    currentColumn = this.parentElement;

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  });
});

// Element id 

document.getElementById("saveTask").addEventListener("click", async () => {
  const title = document.getElementById("taskTitle").value;
  if (!title) return;

  const { data, error } = await supabase
    .from('tasks')
    .insert([
      { title: title, status: currentColumn.dataset.status }
    ])
    .select(); // important

  if (error) {
    console.error(error);
    return;
  }

  const task = createTaskElement(data[0]); // use real DB data
  currentColumn.appendChild(task);

  document.getElementById("taskTitle").value = "";

  bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
});

// Allow columns to receive tasks
document.querySelectorAll(".column").forEach(col => {
  col.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

col.addEventListener("drop", async () => {
  if (draggedTask) {
    col.appendChild(draggedTask);

    await supabase
      .from('Dataset Keys')
      .update({ status: col.dataset.status })
      .eq('id', draggedTask.dataset.id);
  }
});
});

});


//////////////////////////////////


// Add drag behavior to tasks
function addDragEvents(task) {
  task.addEventListener("dragstart", () => {
    draggedTask = task;
  });
}




// Create task element with delete button

function createTaskElement(taskData) {
  const task = document.createElement("div");
  task.className = "task d-flex justify-content-between align-items-center";
  task.draggable = true;

  task.dataset.id = taskData.id; // important

  const span = document.createElement("span");
  span.textContent = taskData.title;

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✕";
  deleteBtn.className = "btn btn-sm btn-danger";

deleteBtn.onclick = async () => {
  const confirmDelete = confirm("Are you sure you want to delete this task?");
  if (!confirmDelete) return;

  task.remove();

  await supabase
    .from('tasks')
    .delete()
    .eq('id', task.dataset.id);
};

  task.appendChild(span);
  task.appendChild(deleteBtn);

  addDragEvents(task);
  return task;
}

window.createTaskElement = createTaskElement;

