import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = "https://sgoujlmsnyxravwowdag.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnb3VqbG1zbnl4cmF2d293ZGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NzEzMTAsImV4cCI6MjA5MDU0NzMxMH0.YL0ySMYZZhcvurRAQc-Fo7zeJhxSUijUONodP4pk1JA";

const supabase = createClient(supabaseUrl, supabaseKey);

// GLOBAL VARIABLES

let currentColumn = null;
let draggedTask = null;
let editingTaskId = null;
let taskToDeleteId = null;
let taskElementToDelete = null;
let board = null;

// USER (CLIENT)

async function initUser() {
  
  // CHECK FOR EXISTING USER

  const { data: userData, error: userError } = await supabase.auth.getUser();

  // LOG ANY ERROR FROM GETTING USER

  if (userError) {
    console.error("getUser error:", userError);
  }

  // IF USER EXISTS, RETURN IT

  if (userData?.user) {
    return userData.user;
  }

  // IF NO USER, SIGN IN ANONYMOUSLY

  const { data, error } = await supabase.auth.signInAnonymously();

  // LOG ANY ERROR FROM ANONYMOUS SIGN-IN

  if (error) {
    console.error("Anonymous sign-in failed:", error);
    return null;
  }

  // RETURN THE NEWLY SIGNED-IN USER

  return data?.user ?? null;
}



async function loadTasks() {

  // CLEAR EXISTING TASKS FROM UI

    document.querySelectorAll(".column").forEach(col => {
    col.querySelectorAll(".task").forEach(task => task.remove());
  });

  // CHECK FOR CURRENT USER

  if (!window.currentUser) {
    console.error("loadTasks: currentUser is missing");
    return;
  }

  // FETCH TASKS FOR CURRENT USER

  const { data, error } = await supabase
    .from('Dataset Keys')
    .select('*')
    .eq('user_id', window.currentUser.id); //  FILTER

  // LOG ANY ERROR FROM FETCHING TASKS

  if (error) {
    console.error(error);
    return;
  }

  // APPEND TASKS TO CORRECT COLUMNS

  data.forEach(taskData => {
    const column = document.querySelector(
      `[data-status="${taskData.status}"]`
    );

    // SAFEGUARD: CHECK IF COLUMN EXISTS BEFORE APPENDING

    if (column) {
      const taskEl = createTaskElement(taskData);
      column.appendChild(taskEl);
    }
  });
}

// INITIALIZATION

document.addEventListener('DOMContentLoaded', async  () => {

  // INITIALIZE USER AND LOG RESULT

  const user = await initUser();
  console.log("initUser returned:", user);

  // SAFEGUARD: CHECK IF USER WAS SUCCESSFULLY INITIALIZED BEFORE PROCEEDING

  if (!user) {
    console.error("No user available. App setup stopped.");
    return;
  }

  // STORE CURRENT USER IN GLOBAL VARIABLE

  window.currentUser = user;

  // SELECT BOARD ELEMENT

  board = document.querySelector(".board");

  // LOG CURRENT USER ID FOR DEBUGGING

  console.log("Current user:", window.currentUser.id);

  // LOAD TASKS FOR CURRENT USER

  await loadTasks();

  // NESTED LIST TOGGLER LOGIC

  const toggler = document.getElementsByClassName('caret');
  for (let i = 0; i < toggler.length; i++) {
    toggler[i].addEventListener('click', function () {
      this.parentElement.querySelector('.nested').classList.toggle('active');
      this.classList.toggle('caret-down');
    });
  }


  // ADD BUTTON // 


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

  // GET VALUES FROM FORM FIELDS

  const title = document.getElementById("taskTitle").value;
  const description = document.getElementById("taskDescription").value;
  const priority = document.getElementById("taskPriority").value;
  const dueDate = document.getElementById("taskDueDate").value;
  const taskError = document.getElementById("taskError");
  taskError.style.display = "none";
  taskError.textContent = "";

  // VALIDATION LOGIC
  // REMOVE RED HIGHLIGHT FROM ALL FIELDS BEFORE CHECKING

  document.getElementById("taskTitle").classList.remove("is-invalid");
  document.getElementById("taskPriority").classList.remove("is-invalid");
  document.getElementById("taskDueDate").classList.remove("is-invalid");

  // CHECK IF REQUIRED FIELDS ARE MISSING

  if (!title.trim() || !priority || !dueDate) {

    // ADD RED HIGHLIGHT TO MISSING FIELDS

    document.getElementById("taskTitle").classList.toggle("is-invalid", !title.trim());
    document.getElementById("taskPriority").classList.toggle("is-invalid", !priority);
    document.getElementById("taskDueDate").classList.toggle("is-invalid", !dueDate);

    const missingFields = [];

    // CHECK WHICH FIELDS ARE MISSING AND ADD TO ERROR MESSAGE

    if (!title.trim()) missingFields.push("title");
    if (!priority) missingFields.push("priority");
    if (!dueDate) missingFields.push("due date");

    taskError.textContent = `Please fill in: ${missingFields.join(", ")}.`;
    taskError.style.display = "block";
    return;
  }

  // SAFEGUARD: CHECK IF CURRENT USER EXISTS BEFORE SAVING

  if (!window.currentUser) {
    console.error("Cannot save task: currentUser is missing");
    return;
  }

  // SAVE OR UPDATE TASK IN SUPABASE

  let data, error;

  // IF EDITING, UPDATE EXISTING TASK; OTHERWISE, INSERT NEW TASK

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

  // LOG ANY ERROR FROM SAVING TASK

  if (error) {
    console.error("Save task error:", error);
    return;
  }

  // RELOAD TASKS TO REFLECT CHANGES

  await loadTasks();

  // RESET FORM AND STATE

  editingTaskId = null;
  bootstrap.Modal.getInstance(document.getElementById('taskModal')).hide();
});



// ELEMENT ID (TASK MODAL)


document.getElementById("taskModal").addEventListener("hidden.bs.modal", () => {

  // RESET FORM FIELDS AND ERROR MESSAGES

  editingTaskId = null;
  currentColumn = null;
  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDescription").value = "";
  document.getElementById("taskPriority").value = "";
  document.getElementById("taskDueDate").value = "";
  document.getElementById("taskError").textContent = "";
  document.getElementById("taskError").style.display = "none";
});


// EDIT FROM TASK DETAILS MODAL


document.getElementById("editFromDetail").addEventListener("click", () => {

  // CLOSE DETAILS MODAL

  const modalEl = document.getElementById('detailModal');
  const modal = bootstrap.Modal.getInstance(modalEl);
  modal.hide();

  // PREFILL EDIT FORM WITH CURRENT TASK DETAILS

  document.getElementById("taskTitle").value = document.getElementById("detailTitle").textContent;
  document.getElementById("taskDescription").value = document.getElementById("detailDescription").textContent;
  document.getElementById("taskPriority").value = document.getElementById("detailPriority").textContent.toLowerCase();
  document.getElementById("taskDueDate").value = document.getElementById("detailDueDate").textContent;

  // OPEN EDIT MODAL

  const editModal = new bootstrap.Modal(document.getElementById('taskModal'));
  editModal.show();
});

});


// Create task element with delete/edit button


function createTaskElement(taskData) {

  // CREATE TASK CONTAINER

  const task = document.createElement("div");
  task.className = "task p-2";
  task.draggable = false;
  task.dataset.id = taskData.id;

  // APPLY PRIORITY CLASS FOR STYLING

if (taskData.priority) {
  task.classList.add(taskData.priority);
}

  // DRAG HANDLE
  
  const dragHandle = document.createElement("div");
  dragHandle.className = "drag-handle";
  dragHandle.textContent = "⋮⋮";

  // TASK TITLE AND META

  const title = document.createElement("div");
  title.textContent = taskData.title;

  const meta = document.createElement("small");
  meta.className = "text-muted";

  // COMBINE PRIORITY AND DUE DATE INTO META TEXT

  meta.textContent = `
    ${taskData.priority || "No priority"} 
    ${taskData.due_date ? "• Due: " + taskData.due_date : ""}
  `;


  // EDIT BUTTON 

  const editBtn = document.createElement("button");
  editBtn.textContent = "✏️";
  editBtn.className = "btn btn-sm btn-warning me-1";

  editBtn.addEventListener("pointerdown", (e) => e.stopPropagation());

  // OPEN EDIT MODAL AND PREFILL WITH TASK DATA

  editBtn.onclick = () => {
    editingTaskId = task.dataset.id;

    document.getElementById("taskTitle").value = taskData.title;
    document.getElementById("taskDescription").value = taskData.description || "";
    document.getElementById("taskPriority").value = taskData.priority || "";
    document.getElementById("taskDueDate").value = taskData.due_date || "";

    const modal = new bootstrap.Modal(document.getElementById('taskModal'));
    modal.show();
  };


  // DELETE BUTTON LOGIC & OPEN DELETE CONFIRMATION MODAL


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

  // TASK DETAILS MODAL LOGIC
  // OPEN DETAILS MODAL AND DISPLAY TASK INFO
  // SAFEGUARD: PREVENT OPENING DETAILS MODAL IF CLICKED ON BUTTONS OR DRAG HANDLE

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

  // GLOBAL VARIABLES FOR DRAGGING STATE AND POSITION

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  let startBoardScrollLeft = 0;
  let currentClientX = 0;
  let autoScrollFrame = null;
  let originalColumn = null;

  // FUNCTION TO CLEAR DROP TARGET HIGHLIGHTS FROM ALL COLUMNS

  function clearHighlights() {
    document.querySelectorAll(".column").forEach(col => {
      col.classList.remove("drop-target");
    });
  }

  // FUNCTION TO STOP AUTO SCROLLING WHEN DRAG ENDS

  function stopAutoScroll() {
    if (autoScrollFrame) {
      cancelAnimationFrame(autoScrollFrame);
      autoScrollFrame = null;
    }
  }

  // FUNCTION TO AUTO SCROLL BOARD WHEN DRAGGING NEAR EDGES

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

  // FUNCTION TO RESET TASK STYLES AFTER DRAG ENDS

  function resetTaskStyles() {
    task.style.position = "";
    task.style.left = "";
    task.style.top = "";
    task.style.width = "";
    task.style.zIndex = "";
    task.style.pointerEvents = "";
  }

  // POINTER DOWN EVENT TO START DRAGGING

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

  // POINTER MOVE EVENT TO UPDATE TASK POSITION AND HIGHLIGHT DROP TARGETS

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

  // POINTER UP EVENT TO DROP TASK INTO NEW COLUMN AND UPDATE STATUS IN SUPABASE

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

  // POINTER CANCEL EVENT TO HANDLE INTERRUPTED DRAG (E.G. ESC KEY, SYSTEM INTERRUPT)

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