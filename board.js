const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzlCrYSyD72xh2X1qjGFx7AW2pIsRFFox2FZKhbi4TSUGNy8G_6T4k_oTbdkzQbpcjD/exec";

const TOKEN = "my-secret-goat-token-2026";

async function submitPost() {
  const name = document.getElementById("posterName").value.trim();
  const message = document.getElementById("postMessage").value.trim();
  const status = document.getElementById("postStatus");

  if (!name || !message) {
    status.textContent = "Please enter your name and a message.";
    return;
  }

  status.textContent = "Posting...";

  const params = new URLSearchParams({
    action: "addPost",
    name: name,
    message: message,
    token: TOKEN
  });

  try {
    const response = await fetch(SCRIPT_URL + "?" + params.toString());
    const result = await response.json();

    if (!result.ok) {
      status.textContent = result.error || "Post failed.";
      return;
    }

    document.getElementById("postMessage").value = "";
    status.textContent = "Posted!";

    await loadPosts();

    setTimeout(() => {
      status.textContent = "";
    }, 1500);

  } catch (error) {
    console.error(error);
    status.textContent = "Post failed.";
  }
}

async function loadPosts() {
  const postsDiv = document.getElementById("posts");

  postsDiv.innerHTML = "<p>Loading posts...</p>";

  const params = new URLSearchParams({
    action: "getPosts"
  });

  try {
    const response = await fetch(SCRIPT_URL + "?" + params.toString());
    const result = await response.json();

    if (!result.ok) {
      postsDiv.innerHTML = "<p>Could not load posts.</p>";
      return;
    }

    if (result.posts.length === 0) {
      postsDiv.innerHTML = "<p>No posts yet.</p>";
      return;
    }

    let html = "";

    result.posts.forEach(post => {
      html += `
        <div class="post">
          <h3>${escapeHTML(post.name)}</h3>
          <p>${escapeHTML(post.message)}</p>
          <small>${new Date(post.timestamp).toLocaleString()}</small>
        </div>
      `;
    });

    postsDiv.innerHTML = html;

  } catch (error) {
    console.error(error);
    postsDiv.innerHTML = "<p>Could not load posts.</p>";
  }
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadPosts();
