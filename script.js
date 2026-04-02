import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "https://sgoujlmsnyxravwowdag.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3VqbG1zbnl4cmF2d293ZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzEzMTAsImV4cCI6MjA5MDU0NzMxMH0.YL0ySMYZZhcvurRAQc-Fo7zeJhxSUijUONodP4pk1JA";

const supabase = createClient(supabaseUrl, supabaseKey);



let currentColumn = null;
let draggedTask = null;
let editingTaskId = null;

async function loadTasks() {
  const { data, error } = await supabase
    .from('Dataset Keys')
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


  // ADD BUTTON 


  document.querySelectorAll(".add-btn").forEach(btn => {
  btn.addEventListener("click", function () {
    currentColumn = this.parentElement;

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  });
});

// ELEMENT ID (SAVE TASK)

document.getElementById("saveTask").addEventListener("click", async () => {
  const title = document.getElementById("taskTitle").value;
  const description = document.getElementById("taskDescription").value;
  const priority = document.getElementById("taskPriority").value;
  const dueDate = document.getElementById("taskDueDate").value;

  if (!title.trim()) return;

  const { data, error } = await supabase
    .from('Dataset Keys')
    .insert([
      {
        title: title,
        status: currentColumn.dataset.status,
        priority: priority,
        due_date: dueDate,
        description: description
      }
    ])
    .select();

  if (error) {
    console.error(error);
    return;
  }

  const task = createTaskElement(data[0]);
  currentColumn.appendChild(task);

  editingTaskId = null;

  bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
});

// ELEMENT ID (TASK MODAL)

document.getElementById("taskModal").addEventListener("hidden.bs.modal", () => {
  editingTaskId = null;

  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDescription").value = "";
  document.getElementById("taskPriority").value = "";
  document.getElementById("taskDueDate").value = "";
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


// Create task element with delete/edit button


function createTaskElement(taskData) {
  const task = document.createElement("div");
  task.className = "task p-2";
  task.draggable = true;

  task.dataset.id = taskData.id;

  const title = document.createElement("div");
  title.textContent = taskData.title;

  const meta = document.createElement("small");
  meta.className = "text-muted";

  meta.textContent = `
    ${taskData.priority || "No priority"} 
    ${taskData.due_date ? "• Due: " + taskData.due_date : ""}
  `;


  // EDIT BUTTON LOGIC

  const editBtn = document.createElement("button");
  editBtn.textContent = "✏️";
  editBtn.className = "btn btn-sm btn-warning me-1";


  editBtn.onclick = () => {
    editingTaskId = task.dataset.id;

    document.getElementById("taskTitle").value = taskData.title;
    document.getElementById("taskDescription").value = taskData.description || "";
    document.getElementById("taskPriority").value = taskData.priority || "";
    document.getElementById("taskDueDate").value = taskData.due_date || "";

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  };

  // DELETE 


  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✕";
  deleteBtn.className = "btn btn-sm btn-danger float-end";

  deleteBtn.onclick = async () => {
    const confirmDelete = confirm("Are you sure?");
    if (!confirmDelete) return;

    task.remove();

    await supabase
      .from('Dataset Keys')
      .delete()
      .eq('id', task.dataset.id);
  };

  // const btnContainer = document.createElement("div");
  task.appendChild(editBtn);
  task.appendChild(deleteBtn);
  task.appendChild(title);
  task.appendChild(meta);

  addDragEvents(task);
  return task;
}

if (taskData.priority) {
  task.classList.add(taskData.priority);
}


window.createTaskElement = createTaskElement;

