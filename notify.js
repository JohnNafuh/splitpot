// splitpot notification bell
// Load after supabase.js. Adds a bell with a live unread count to the top bar.
(function () {
  if (!window.sb) return;

  const style = document.createElement("style");
  style.textContent = `
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .bell {
      position: relative;
      display: grid;
      place-items: center;
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      color: var(--chalk);
    }
    .bell[aria-current="page"] {
      color: var(--brass);
    }
    .bell svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .bell-count {
      position: absolute;
      top: 1px;
      right: -2px;
      display: grid;
      place-items: center;
      min-width: 18px;
      height: 18px;
      padding: 0 5px;
      border-radius: 999px;
      background: var(--brass);
      color: var(--felt-deep);
      font-size: 0.7rem;
      font-weight: 800;
      line-height: 1;
    }
    .bell-count[hidden] {
      display: none;
    }
  `;
  document.head.append(style);

  let me = null;
  let countEl = null;
  let bell = null;

  function mount() {
    const topbar = document.querySelector(".topbar");
    if (!topbar) return false;

    let right = topbar.querySelector(".topbar-right");
    if (!right) {
      right = document.createElement("div");
      right.className = "topbar-right";
      topbar.append(right);
    }

    bell = document.createElement("a");
    bell.className = "bell";
    bell.href = "notifications.html";
    bell.setAttribute("aria-label", "Notifications");
    if (window.location.pathname.endsWith("notifications.html")) {
      bell.setAttribute("aria-current", "page");
    }
    bell.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/>' +
      '<path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>' +
      "</svg>";

    countEl = document.createElement("span");
    countEl.className = "bell-count";
    countEl.hidden = true;
    bell.append(countEl);

    right.prepend(bell);
    return true;
  }

  async function refresh() {
    if (!me || !countEl) return;

    const { count, error } = await sb
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", me)
      .is("read_at", null);

    if (error) return;

    const unread = count || 0;
    countEl.textContent = unread > 9 ? "9+" : String(unread);
    countEl.hidden = unread === 0;
    bell.setAttribute("aria-label", unread ? "Notifications, " + unread + " unread" : "Notifications");
  }

  window.splitpotRefreshBell = refresh;

  (async () => {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return;

    me = session.user.id;
    if (!mount()) return;
    await refresh();

    sb.channel("bell-" + me)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: "user_id=eq." + me }, refresh)
      .subscribe();
  })();
})();
