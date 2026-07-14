if (requireAdminPage()) {
  const form = document.getElementById("bookingForm");
  const table = document.getElementById("bookingTable");
  let events = [];

  async function loadEvents() {
    try {
      const data = await apiFetch("/api/calendar/events");
      events = (data.events || []).map((e) => {
        const start = new Date(e.start.dateTime);
        const end = new Date(e.end.dateTime);
        const date = e.start.dateTime.slice(0, 10);
        const fmt = (d) => {
          let h = d.getHours();
          const m = d.getMinutes();
          const ampm = h >= 12 ? "PM" : "AM";
          h = h % 12 || 12;
          return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
        };
        const parts = (e.summary || "").split(" — ");
        return {
          id: e.id,
          event: parts[0] || e.summary,
          client: parts[1] || "",
          date,
          time: `${fmt(start)} - ${fmt(end)}`,
        };
      });
      renderBookings();
    } catch (err) {
      table.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
    }
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const booking = {
      event: document.getElementById("eventName").value,
      client: document.getElementById("clientName").value,
      date: document.getElementById("eventDate").value,
      time: document.getElementById("timeSlot").value,
    };

    try {
      await apiFetch("/api/calendar/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAdminHeaders(),
        },
        body: JSON.stringify(booking),
      });
      form.reset();
      await loadEvents();
    } catch (err) {
      alert(err.message);
    }
  });

  function renderBookings() {
    if (events.length === 0) {
      table.innerHTML =
        '<tr><td colspan="5">No bookings yet. Add one using the form.</td></tr>';
      return;
    }

    table.innerHTML = events
      .map(
        (booking) => `
        <tr>
          <td>${escapeHtml(booking.event)}</td>
          <td>${escapeHtml(booking.client)}</td>
          <td>${booking.date}</td>
          <td>${escapeHtml(booking.time)}</td>
          <td>
            <button class="delete-btn" data-id="${booking.id}">Delete</button>
          </td>
        </tr>`,
      )
      .join("");

    table.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", () => deleteBooking(btn.dataset.id));
    });
  }

  async function deleteBooking(id) {
    if (!confirm("Delete this booking from Google Calendar?")) return;
    try {
      await apiFetch(`/api/calendar/events/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      await loadEvents();
    } catch (err) {
      alert(err.message);
    }
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  loadEvents();
}
