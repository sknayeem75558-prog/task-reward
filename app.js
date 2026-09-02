// TaskEarn - User App

let currentUser = null;

// Show message
function showMsg(message, type = "info") {
  const box = document.getElementById("message");
  if (!box) {
    alert(message);
    return;
  }

  box.textContent = message;
  box.style.display = "block";
  box.className = "message " + type;
}

// Register
async function register() {
  const email = document.getElementById("regEmail")?.value.trim();
  const password = document.getElementById("regPassword")?.value;

  if (!email || !password) {
    showMsg("Email এবং Password দিন।", "error");
    return;
  }

  if (password.length < 6) {
    showMsg("Password কমপক্ষে ৬ অক্ষরের হতে হবে।", "error");
    return;
  }

  const { data, error } = await sb.auth.signUp({
    email: email,
    password: password
  });

  if (error) {
    showMsg(error.message, "error");
    return;
  }

  if (data.user) {
    showMsg("Account তৈরি হয়েছে! এখন Login করুন।", "success");
  }
}

// Login
async function login() {
  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) {
    showMsg("Email এবং Password দিন।", "error");
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    showMsg(error.message, "error");
    return;
  }

  currentUser = data.user;
  showMsg("Login সফল হয়েছে।", "success");

  await loadApp();
}

// Load app
async function loadApp() {
  const { data: { user } } = await sb.auth.getUser();

  if (!user) return;

  currentUser = user;

  const authSection = document.getElementById("authSection");
  const appSection = document.getElementById("appSection");

  if (authSection) authSection.style.display = "none";
  if (appSection) appSection.style.display = "block";

  await loadBalance();
  await loadTasks();
  await loadSubmissions();
}

// Load balance
async function loadBalance() {
  if (!currentUser) return;

  const { data, error } = await sb
    .from("profiles")
    .select("points,email")
    .eq("id", currentUser.id)
    .single();

  if (error) {
    console.error(error);
    return;
  }

  const points = document.getElementById("points");
  if (points) points.textContent = data.points || 0;
}

// Load tasks
async function loadTasks() {
  const container = document.getElementById("tasks");
  if (!container) return;

  const { data, error } = await sb
    .from("tasks")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = "<p>Task লোড করা যাচ্ছে না।</p>";
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>এখন কোনো Task নেই।</p>";
    return;
  }

  container.innerHTML = data.map(task => `
    <div class="task-card">
      <h3>${escapeHtml(task.title)}</h3>
      <p>${escapeHtml(task.description || "")}</p>
      <strong>Reward: ${task.reward_points} Points</strong>

      <input
        type="text"
        id="proof-${task.id}"
        placeholder="Task proof / link দিন"
      >

      <button onclick="submitProof('${task.id}')">
        Submit Task
      </button>
    </div>
  `).join("");
}

// Submit proof
async function submitProof(taskId) {
  if (!currentUser) {
    showMsg("আগে Login করুন।", "error");
    return;
  }

  const input = document.getElementById("proof-" + taskId);
  const proof = input?.value.trim();

  if (!proof) {
    showMsg("Task proof দিন।", "error");
    return;
  }

  const { error } = await sb
    .from("submissions")
    .insert({
      user_id: currentUser.id,
      task_id: taskId,
      proof: proof,
      status: "pending"
    });

  if (error) {
    showMsg(error.message, "error");
    return;
  }

  showMsg("Task জমা হয়েছে। Admin review করবে।", "success");

  if (input) input.value = "";

  await loadSubmissions();
}

// Load submissions
async function loadSubmissions() {
  const container = document.getElementById("submissions");
  if (!container || !currentUser) return;

  const { data, error } = await sb
    .from("submissions")
    .select(`
      id,
      proof,
      status,
      created_at,
      tasks (
        title,
        reward_points
      )
    `)
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = "<p>কোনো submission নেই।</p>";
    return;
  }

  container.innerHTML = data.map(item => `
    <div class="submission-card">
      <b>${escapeHtml(item.tasks?.title || "Task")}</b>
      <p>Reward: ${item.tasks?.reward_points || 0} Points</p>
      <p>Status: <strong>${escapeHtml(item.status)}</strong></p>
    </div>
  `).join("");
}

// Request reward
async function requestReward() {
  if (!currentUser) {
    showMsg("আগে Login করুন।", "error");
    return;
  }

  const points = Number(
    document.getElementById("rewardPoints")?.value
  );

  const method = document.getElementById("rewardMethod")?.value.trim();
  const account = document.getElementById("rewardAccount")?.value.trim();

  if (!points || points <= 0) {
    showMsg("সঠিক Points দিন।", "error");
    return;
  }

  if (!method || !account) {
    showMsg("Reward method এবং account দিন।", "error");
    return;
  }

  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("points")
    .eq("id", currentUser.id)
    .single();

  if (profileError) {
    showMsg(profileError.message, "error");
    return;
  }

  if (points > profile.points) {
    showMsg("আপনার পর্যাপ্ত Points নেই।", "error");
    return;
  }

  const { error } = await sb
    .from("reward_requests")
    .insert({
      user_id: currentUser.id,
      points: points,
      method: method,
      account: account,
      status: "pending"
    });

  if (error) {
    showMsg(error.message, "error");
    return;
  }

  showMsg("Reward request জমা হয়েছে।", "success");
}

// Logout
async function logout() {
  await sb.auth.signOut();
  location.reload();
}

// Escape HTML
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Check login when page loads
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { user } } = await sb.auth.getUser();

  if (user) {
    currentUser = user;
    await loadApp();
  }
});
