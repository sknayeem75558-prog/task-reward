async function adminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  if (!email || !password) {
    alert("Email এবং Password দিন।");
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({
    email: email,
    password: password
  });

  if (error) {
    alert("Login Error: " + error.message);
    return;
  }

  const user = data.user;

  const { data: profile, error: profileError } = await sb
    .from("profiles")
    .select("id, email, is_admin")
    .eq("id", user.id)
    .single();

  if (profileError) {
    alert("Profile Error: " + profileError.message);
    return;
  }

  if (profile.is_admin !== true) {
    await sb.auth.signOut();
    alert("এই account Admin নয়।");
    return;
  }

  document.getElementById("adminLoginSection").style.display = "none";
  document.getElementById("adminSection").style.display = "block";

  await loadPending();
  await loadRequests();
}


async function createTask() {
  const title = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDescription").value.trim();
  const reward_points = Number(
    document.getElementById("taskReward").value
  );

  if (!title || !reward_points) {
    alert("Task title এবং reward points দিন।");
    return;
  }

  const { error } = await sb
    .from("tasks")
    .insert({
      title: title,
      description: description,
      reward_points: reward_points,
      active: true
    });

  if (error) {
    alert("Task Error: " + error.message);
    return;
  }

  alert("Task তৈরি হয়েছে ✅");

  document.getElementById("taskTitle").value = "";
  document.getElementById("taskDescription").value = "";
  document.getElementById("taskReward").value = "";
}


async function loadPending() {
  const box = document.getElementById("pending");

  const { data, error } = await sb
    .from("submissions")
    .select(`
      id,
      proof,
      status,
      created_at,
      profiles(email),
      tasks(title, reward_points)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    box.innerHTML = "<p>" + escapeHtml(error.message) + "</p>";
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = "<p>Pending submission নেই।</p>";
    return;
  }

  box.innerHTML = data.map(item => `
    <div class="task-card">
      <h3>${escapeHtml(item.tasks?.title || "Task")}</h3>

      <p>
        User:
        ${escapeHtml(item.profiles?.email || "")}
      </p>

      <p>
        Reward:
        ${item.tasks?.reward_points || 0} Points
      </p>

      <p>
        Proof:
        ${escapeHtml(item.proof || "")}
      </p>

      <button onclick="review('${item.id}', 'approve')">
        Approve
      </button>

      <button onclick="review('${item.id}', 'reject')">
        Reject
      </button>
    </div>
  `).join("");
}


async function review(id, action) {
  const { error } = await sb.rpc(
    "review_submission",
    {
      p_submission_id: id,
      p_action: action
    }
  );

  if (error) {
    alert("Review Error: " + error.message);
    return;
  }

  alert("Submission " + action + " হয়েছে ✅");

  await loadPending();
}


async function loadRequests() {
  const box = document.getElementById("requests");

  const { data, error } = await sb
    .from("reward_requests")
    .select(`
      id,
      points,
      method,
      account,
      status,
      created_at,
      profiles(email)
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    box.innerHTML = "<p>" + escapeHtml(error.message) + "</p>";
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = "<p>Pending reward request নেই।</p>";
    return;
  }

  box.innerHTML = data.map(item => `
    <div class="request-card">

      <h3>${item.points} Points</h3>

      <p>
        User:
        ${escapeHtml(item.profiles?.email || "")}
      </p>

      <p>
        Method:
        ${escapeHtml(item.method || "")}
      </p>

      <p>
        Account:
        ${escapeHtml(item.account || "")}
      </p>

      <button onclick="rewardReview('${item.id}', 'paid')">
        Mark Paid
      </button>

      <button onclick="rewardReview('${item.id}', 'rejected')">
        Reject
      </button>

    </div>
  `).join("");
}


async function rewardReview(id, status) {
  const { error } = await sb
    .from("reward_requests")
    .update({
      status: status
    })
    .eq("id", id);

  if (error) {
    alert("Reward Error: " + error.message);
    return;
  }

  alert("Reward request " + status + " হয়েছে ✅");

  await loadRequests();
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
