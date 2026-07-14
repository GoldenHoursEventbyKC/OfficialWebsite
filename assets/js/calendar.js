const monthYear = document.getElementById("monthYear");
const calendarDays = document.getElementById("calendarDays");
const bookedList = document.getElementById("bookedList");
const availableList = document.getElementById("availableList");
const selectedDateText = document.getElementById("selectedDate");
const calendarStatus = document.getElementById("calendarStatus");
const googleCalendarEmbed = document.getElementById("googleCalendarEmbed");
const googleCalendarFrame = document.getElementById("googleCalendarFrame");
const calendarContainer = document.querySelector(".calendar-container");
const bookingPanel = document.querySelector(".booking-panel");

let currentDate = new Date();
let bookings = {};
let defaultSlots = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

async function loadBookings() {
  try {
    const data = await apiFetch("/api/calendar/events");
    bookings = {};
    for (const [date, items] of Object.entries(data.bookings || {})) {
      bookings[date] = items.map((item) =>
        typeof item === "string" ? item : item.slot,
      );
    }
    if (data.defaultSlots) defaultSlots = data.defaultSlots;
  } catch (err) {
    console.warn("Could not load Google Calendar events:", err.message);
    showGoogleCalendarEmbed();
  }
  renderCalendar();
}

function showGoogleCalendarEmbed() {
  const calendarId =
    typeof CONFIG !== "undefined" ? CONFIG.GOOGLE_CALENDAR_ID : "";
  if (!calendarId || !googleCalendarEmbed || !googleCalendarFrame) {
    if (calendarStatus) {
      calendarStatus.textContent =
        "Calendar unavailable. Please check the Google Calendar setup.";
      calendarStatus.style.display = "block";
    }
    return;
  }

  const timeZone =
    typeof CONFIG !== "undefined" && CONFIG.GOOGLE_CALENDAR_TIMEZONE
      ? CONFIG.GOOGLE_CALENDAR_TIMEZONE
      : "Asia/Manila";
  const params = new URLSearchParams({
    src: calendarId,
    ctz: timeZone,
    mode: "MONTH",
    showTitle: "0",
    showPrint: "0",
    showTabs: "0",
    showCalendars: "0",
    showTz: "0",
  });

  googleCalendarFrame.src = `https://calendar.google.com/calendar/embed?${params.toString()}`;
  googleCalendarEmbed.hidden = false;
  if (calendarContainer) calendarContainer.hidden = true;
  if (bookingPanel) bookingPanel.hidden = true;
  if (calendarStatus) {
    calendarStatus.textContent = "Live Google Calendar is displayed below.";
    calendarStatus.style.display = "block";
  }
}

function renderCalendar() {
  calendarDays.innerHTML = "";

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  monthYear.textContent = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDays.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dayBox = document.createElement("div");
    dayBox.classList.add("day");
    dayBox.textContent = day;

    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (bookings[dateKey]?.length) {
      dayBox.classList.add("has-bookings");
    }

    dayBox.addEventListener("click", () => showBookings(dateKey));
    calendarDays.appendChild(dayBox);
  }
}

function showBookings(date) {
  selectedDateText.textContent = `Schedule for ${date}`;
  bookedList.innerHTML = "";
  availableList.innerHTML = "";

  const booked = bookings[date] || [];

  if (booked.length === 0) {
    const li = document.createElement("li");
    li.textContent = "No bookings";
    li.style.opacity = "0.6";
    bookedList.appendChild(li);
  } else {
    booked.forEach((slot) => {
      const li = document.createElement("li");
      li.textContent = slot;
      bookedList.appendChild(li);
    });
  }

  defaultSlots.forEach((slot) => {
    if (!booked.includes(slot)) {
      const li = document.createElement("li");
      li.textContent = slot;
      availableList.appendChild(li);
    }
  });

  if (availableList.children.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Fully booked";
    li.style.opacity = "0.6";
    availableList.appendChild(li);
  }
}

document.getElementById("prevMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

loadBookings();
