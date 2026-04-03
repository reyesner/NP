import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "https://sgoujlmsnyxravwowdag.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3VqbG1zbnl4cmF2d293ZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzEzMTAsImV4cCI6MjA5MDU0NzMxMH0.YL0ySMYZZhcvurRAQc-Fo7zeJhxSUijUONodP4pk1JA";

const supabase = createClient(supabaseUrl, supabaseKey);



let currentColumn = null;
let draggedTask = null;
let editingTaskId = null;
let taskToDeleteId = null;
let taskElementToDelete = null;
let board = null;

// USER (CLIENT)

async function initUser() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("getUser error:", userError);
  }

  if (userData?.user) {
    return userData.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    console.error("Anonymous sign-in failed:", error);
    return null;
  }

  return data?.user ?? null;
}



async function loadTasks() {
    document.querySelectorAll(".column").forEach(col => {
    col.querySelectorAll(".task").forEach(task => task.remove());
  });

  if (!window.currentUser) {
    console.error("loadTasks: currentUser is missing");
    return;
  }

  const { data, error } = await supabase
    .from('Dataset Keys')
    .select('*')
    .eq('user_id', window.currentUser.id); //  FILTER

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



document.addEventListener('DOMContentLoaded', async  () => {

  const user = await initUser();
  console.log("initUser returned:", user);

  if (!user) {
    console.error("No user available. App setup stopped.");
    return;
  }

  window.currentUser = user;

  board = document.querySelector(".board");

  console.log("Current user:", window.currentUser.id);

  await loadTasks();

  // loadTasks();
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

// DELETE BUTTON 

document.getElementById("confirmDelete").addEventListener("click", async () => {
  if (!taskToDeleteId) return;

  // Remove from UI
  taskElementToDelete.remove();

  // Remove from Supabase
  await supabase
    .from('Dataset Keys')
    .delete()
    .eq('id', taskToDeleteId);

  // Reset
  taskToDeleteId = null;
  taskElementToDelete = null;

  bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
});

// ELEMENT ID (SAVE TASK)

document.getElementById("saveTask").addEventListener("click", async () => {
  const title = document.getElementById("taskTitle").value;
  const description = document.getElementById("taskDescription").value;
  const priority = document.getElementById("taskPriority").value;
  const dueDate = document.getElementById("taskDueDate").value;

  if (!title.trim()) return;

  if (!window.currentUser) {
    console.error("Cannot save task: currentUser is missing");
    return;
  }

  let data, error;

  if (editingTaskId) {
    ({ data, error } = await supabase
      .from('Dataset Keys')
      .update({
        title,
        description,
        priority,
        due_date: dueDate
      })
      .eq('id', editingTaskId)
      .eq('user_id', window.currentUser.id)
      .select());
  } else {
    ({ data, error } = await supabase
      .from('Dataset Keys')
      .insert([{
        title,
        description,
        priority,
        due_date: dueDate,
        status: currentColumn.dataset.status,
        user_id: window.currentUser.id
      }])
      .select());
  }

  if (error) {
    console.error("Save task error:", error);
    return;
  }

  await loadTasks();

  editingTaskId = null;
  bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
});



// ELEMENT ID (TASK MODAL)


document.getElementById("taskModal").addEventListener("hidden.bs.modal", () => {
  editingTaskId = null;
  currentColumn = null;
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDescription").value = "";
  document.getElementById("taskPriority").value = "";
  document.getElementById("taskDueDate").value = "";
});

// EDIT FROM TASK DETAILS MODAL

document.getElementById("editFromDetail").addEventListener("click", () => {
  const modalEl = document.getElementById('detailModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  // Fill form with current values
  document.getElementById("taskTitle").value = document.getElementById("detailTitle").textContent;
  document.getElementById("taskDescription").value = document.getElementById("detailDescription").textContent;
  document.getElementById("taskPriority").value = document.getElementById("detailPriority").textContent.toLowerCase();
  document.getElementById("taskDueDate").value = document.getElementById("detailDueDate").textContent;

  const editModal = new bootstrap.Modal(document.getElementById('taskModal'));
  editModal.show();
});

});


//////////////////////////////////


// Create task element with delete/edit button


function createTaskElement(taskData) {
  const task = document.createElement("div");
  task.className = "task p-2";
  task.draggable = false;
  task.dataset.id = taskData.id;

if (taskData.priority) {
  task.classList.add(taskData.priority);
}

  // DRAG BUTTON LOGIC
  
  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  dragHandle.textContent = "⋮⋮";



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

  editBtn.addEventListener("pointerdown", (e) => e.stopPropagation());

  editBtn.onclick = () => {
    editingTaskId = task.dataset.id;

    document.getElementById("taskTitle").value = taskData.title;
    document.getElementById("taskDescription").value = taskData.description || "";
    document.getElementById("taskPriority").value = taskData.priority || "";
    document.getElementById("taskDueDate").value = taskData.due_date || "";

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  };

  // DELETE BUTTON LOGIC


  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "✕";
  deleteBtn.className = "btn btn-sm btn-danger float-end";

  deleteBtn.addEventListener("pointerdown", (e) => e.stopPropagation());


  deleteBtn.onclick = () => {
  taskToDeleteId = task.dataset.id;
  taskElementToDelete = task;

  const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
  modal.show();
};


  // DRAG DETAILS LOGIC 

    task.onclick = (e) => {
    if (e.target.tagName === "BUTTON") return;
    if (e.target.closest(".drag-handle")) return;

    document.getElementById("detailTitle").textContent = taskData.title;
    document.getElementById("detailDescription").textContent = taskData.description || "No description";
    document.getElementById("detailPriority").textContent = taskData.priority || "None";
    document.getElementById("detailDueDate").textContent = taskData.due_date || "None";

    editingTaskId = taskData.id;

    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
  };

  // APPENDS ELEMENTS TO TASK

  task.appendChild(dragHandle);
  task.appendChild(editBtn);
  task.appendChild(deleteBtn);
  task.appendChild(title);
  task.appendChild(meta);

  addPointerDrag(task, dragHandle)
  return task;
}


window.createTaskElement = createTaskElement;


// POINTER DRAG 

function addPointerDrag(task, handle) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let startBoardScrollLeft = 0;
  let currentClientX = 0;
  let autoScrollFrame = null;
  let originalColumn = null;

  function clearHighlights() {
    document.querySelectorAll(".column").forEach(col => {
      col.classList.remove("drop-target");
    });
  }

  function stopAutoScroll() {
    if (autoScrollFrame) {
      cancelAnimationFrame(autoScrollFrame);
      autoScrollFrame = null;
    }
  }

  // AUTO SCROLL LOGIC

//   function autoScroll() {
//   if (!isDragging || !board) return;

//   const boardRect = board.getBoundingClientRect();
//   const edgeThreshold = 110;
//   let scrollAmount = 0;

//   if (currentClientX > boardRect.right - edgeThreshold) {
//     scrollAmount = 18;
//   } else if (currentClientX < boardRect.left + edgeThreshold) {
//     scrollAmount = -18;
//   }

//   if (scrollAmount !== 0) {
//     board.scrollLeft += scrollAmount;
//   }

//   autoScrollFrame = requestAnimationFrame(autoScroll);
// }
  function autoScroll() {
    if (!isDragging || !board) return;

    const boardRect = board.getBoundingClientRect();
    const edgeThreshold = 70;
    const scrollSpeed = 14;

    if (currentClientX > boardRect.right - edgeThreshold) {
      board.scrollLeft += scrollSpeed;
    } else if (currentClientX < boardRect.left + edgeThreshold) {
      board.scrollLeft -= scrollSpeed;
    }

    autoScrollFrame = requestAnimationFrame(autoScroll);
  }

  function resetTaskStyles() {
    task.style.position = "";
    task.style.left = "";
    task.style.top = "";
    task.style.width = "";
    task.style.zIndex = "";
    task.style.pointerEvents = "";
  }

  handle.addEventListener("pointerdown", (e) => {
    if (!board) return;

    e.preventDefault();
    e.stopPropagation();

    isDragging = true;
    currentClientX = e.clientX;
    startBoardScrollLeft = board.scrollLeft;
    originalColumn = task.closest(".column");

    document.body.style.overflowY = "hidden";
    board.style.scrollBehavior = "auto";

    const rect = task.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    task.style.position = "fixed";
    task.style.left = `${rect.left}px`;
    task.style.top = `${rect.top}px`;
    task.style.width = `${rect.width}px`;
    task.style.zIndex = "1000";
    task.style.pointerEvents = "none";

    if (handle.setPointerCapture) {
      handle.setPointerCapture(e.pointerId);
    }

    stopAutoScroll();
    autoScrollFrame = requestAnimationFrame(autoScroll);
  });

  document.addEventListener("pointermove", (e) => {
    if (!isDragging || !board) return;

    currentClientX = e.clientX;

    const boardScrollDelta = board.scrollLeft - startBoardScrollLeft;

    task.style.left = `${e.clientX - offsetX - boardScrollDelta}px`;
    task.style.top = `${e.clientY - offsetY}px`;

    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    const column = elementBelow?.closest(".column");

    clearHighlights();

    if (column) {
      column.classList.add("drop-target");
    }
  });

  document.addEventListener("pointerup", async (e) => {
    if (!isDragging) return;
    isDragging = false;

    stopAutoScroll();
    document.body.style.overflowY = "";
    board.style.scrollBehavior = "";

    const elementBelow = document.elementFromPoint(e.clientX, e.clientY);
    const column = elementBelow?.closest(".column") || originalColumn;

    clearHighlights();
    resetTaskStyles();

    if (column) {
      column.appendChild(task);

      const { error } = await supabase
        .from('Dataset Keys')
        .update({ status: column.dataset.status })
        .eq('id', task.dataset.id)
        .eq('user_id', window.currentUser.id);

      if (error) {
        console.error("Drag update failed:", error);
      }
    }
  });

  document.addEventListener("pointercancel", () => {
    if (!isDragging) return;
    isDragging = false;

    stopAutoScroll();
    document.body.style.overflowY = "";
    board.style.scrollBehavior = "";

    clearHighlights();
    resetTaskStyles();

    if (originalColumn) {
      originalColumn.appendChild(task);
    }
  });
}