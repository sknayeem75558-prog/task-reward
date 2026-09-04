async function adminLogin() {
  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  if (!email || !password) {
    alert("Email এবং Password দিন।");
    return;
  }

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert("Login Error: " + error.message);
    return;
  }

  const userId = data.user.id;

  const { data: profiles, error: profileError } = await sb
    .from("profiles")
    .select("id,is_admin")
    .eq("id", userId)
    .limit(1);

  if (profileError) {
    alert("Profile Error: " + profileError.message);
    return;
  }

  if (!profiles || profiles.length === 0) {
    alert("এই account-এর profile পাওয়া যায়নি।");
    return;
  }

  if (profiles[0].is_admin !== true) {
    await sb.auth.signOut();
    alert("এই account Admin নয়।");
    return;
  }

  document.getElementById("adminLoginSection").style.display = "none";
  document.getElementById("adminSection").style.display = "block";

  await loadPending();
  await loadRequests();
}
if (!title || !reward_points) {
    alert("Task title এবং reward points দিন।");
    return;
  }

  const { error } = await sb.from("tasks").insert({
    title,
    description,
    reward_points,
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
    .select("id,proof,status,profiles(email),tasks(title,reward_points)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    box.innerHTML = "<p>" + error.message + "</p>";
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = "<p>Pending submission নেই।</p>";
    return;
  }

  box.innerHTML = data.map(x => `
    <div class="task-card">
      <b>${escapeHtml(x.tasks?.title || "Task")}</b>
      <p>User: ${escapeHtml(x.profiles?.email || "")}</p>
      <p>Proof: ${escapeHtml(x.proof)}</p>
      <button onclick="review('${x.id}','approve')">
        Approve
      </button>
      <button onclick="review('${x.id}','reject')">
        Reject
      </button>
    </div>
  `).join("");
}

async function review(id, action) {
  const { error } = await sb.rpc("review_submission", {
    p_submission_id: id,
    p_action: action
  });

  if (error) {
    alert(error.message);
    return;
  }

  await loadPending();
}

async function loadRequests() {
  const box = document.getElementById("requests");

  const { data, error } = await sb
    .from("reward_requests")
    .select("id,points,method,account,status,profiles(email)")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    box.innerHTML = "<p>" + error.message + "</p>";
    return;
  }

  if (!data || data.length === 0) {
    box.innerHTML = "<p>Pending reward request নেই।</p>";
    return;
  }

  box.innerHTML = data.map(x => `
    <div class="request-card">
      <b>${x.points} Points</b>
      <p>User: ${escapeHtml(x.profiles?.email || "")}</p>
      <p>Method: ${escapeHtml(x.method)}</p>
      <p>Account: ${escapeHtml(x.account)}</p>
      <button onclick="rewardReview('${x.id}','paid')">
        Mark Paid
      </button>
      <button onclick="rewardReview('${x.id}','rejected')">
        Reject
      </button>
    </div>
  `).join("");
}

async function rewardReview(id, status) {
  const { error } = await sb
    .from("reward_requests")
    .update({ status })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

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
