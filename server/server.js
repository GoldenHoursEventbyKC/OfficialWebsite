const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 3000;

const ROOT_DIR = path.join(__dirname, "..");
const GALLERY_JSON = path.join(ROOT_DIR, "assets", "data", "gallery.json");
const GALLERY_IMAGES = path.join(ROOT_DIR, "assets", "images", "gallery");

app.use(cors());
app.use(express.json());
app.use(express.static(ROOT_DIR));

const upload = multer({
  storage: multer.diskStorage({
    destination: GALLERY_IMAGES,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

function readGallery() {
  const raw = fs.readFileSync(GALLERY_JSON, "utf8");
  return JSON.parse(raw);
}

function writeGallery(data) {
  fs.writeFileSync(GALLERY_JSON, JSON.stringify(data, null, 2));
}

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected || token === expected) return next();
  res.status(401).json({ error: "Unauthorized" });
}

function getCalendarClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_PRIVATE_KEY?.trim()
    .replace(/,\s*$/, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n");
  const calendarId = process.env.GOOGLE_CALENDAR_ID?.trim();

  if (!email || !key || !calendarId) return null;

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return { calendar: google.calendar({ version: "v3", auth }), calendarId };
}

const DEFAULT_SLOTS = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

function slotToTimeRange(slot) {
  const map = {
    "8:00 AM - 10:00 AM": { start: "08:00", end: "10:00" },
    "10:00 AM - 12:00 PM": { start: "10:00", end: "12:00" },
    "12:00 PM - 2:00 PM": { start: "12:00", end: "14:00" },
    "2:00 PM - 4:00 PM": { start: "14:00", end: "16:00" },
    "4:00 PM - 6:00 PM": { start: "16:00", end: "18:00" },
  };
  return map[slot] || { start: "09:00", end: "11:00" };
}

function timeRangeToSlot(startDate, endDate) {
  const fmt = (d) => {
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
  };
  const slot = `${fmt(startDate)} - ${fmt(endDate)}`;
  return DEFAULT_SLOTS.includes(slot) ? slot : slot;
}

function eventsToBookings(events) {
  const bookings = {};
  for (const event of events) {
    if (!event.start?.dateTime) continue;
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const dateKey = start.toISOString().slice(0, 10);
    const slot = timeRangeToSlot(start, end);
    if (!bookings[dateKey]) bookings[dateKey] = [];
    bookings[dateKey].push({
      id: event.id,
      slot,
      summary: event.summary || "Booked",
      description: event.description || "",
    });
  }
  return bookings;
}

app.get("/api/health", (_req, res) => {
  const client = getCalendarClient();
  res.json({
    ok: true,
    googleCalendar: !!client,
  });
});

app.get("/api/calendar/events", async (req, res) => {
  const client = getCalendarClient();
  if (!client) {
    return res.status(503).json({
      error: "Google Calendar not configured. See server/.env.example",
    });
  }

  try {
    const timeMin = req.query.timeMin || new Date().toISOString();
    const timeMax =
      req.query.timeMax ||
      new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

    const response = await client.calendar.events.list({
      calendarId: client.calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    res.json({
      bookings: eventsToBookings(events),
      events: events.map((e) => ({
        id: e.id,
        summary: e.summary,
        description: e.description,
        start: e.start,
        end: e.end,
      })),
      defaultSlots: DEFAULT_SLOTS,
    });
  } catch (err) {
    console.error("Calendar fetch error:", err.message);
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

app.post("/api/calendar/events", requireAdmin, async (req, res) => {
  const client = getCalendarClient();
  if (!client) {
    return res.status(503).json({ error: "Google Calendar not configured" });
  }

  const { event, client: clientName, date, time } = req.body;
  if (!event || !clientName || !date || !time) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const range = slotToTimeRange(time);
    const startDateTime = `${date}T${range.start}:00`;
    const endDateTime = `${date}T${range.end}:00`;

    const response = await client.calendar.events.insert({
      calendarId: client.calendarId,
      requestBody: {
        summary: `${event} — ${clientName}`,
        description: `Client: ${clientName}\nEvent: ${event}\nTime Slot: ${time}`,
        start: { dateTime: startDateTime, timeZone: "Asia/Manila" },
        end: { dateTime: endDateTime, timeZone: "Asia/Manila" },
      },
    });

    res.json({ ok: true, event: response.data });
  } catch (err) {
    console.error("Calendar create error:", err.message);
    res.status(500).json({ error: "Failed to create calendar event" });
  }
});

app.delete("/api/calendar/events/:id", requireAdmin, async (req, res) => {
  const client = getCalendarClient();
  if (!client) {
    return res.status(503).json({ error: "Google Calendar not configured" });
  }

  try {
    await client.calendar.events.delete({
      calendarId: client.calendarId,
      eventId: req.params.id,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Calendar delete error:", err.message);
    res.status(500).json({ error: "Failed to delete calendar event" });
  }
});

app.get("/api/gallery", (_req, res) => {
  try {
    res.json(readGallery());
  } catch (err) {
    res.status(500).json({ error: "Failed to read gallery" });
  }
});

app.post("/api/gallery", requireAdmin, upload.single("image"), (req, res) => {
  try {
    const category = req.body.category || "polaroid-guestbook";
    const validCategories = [
      "polaroid-guestbook",
      "preshoot-gallery",
      "selfie-mirror",
    ];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    let url = req.body.url?.trim();
    if (req.file) {
      url = `/assets/images/gallery/${req.file.filename}`;
    }
    if (!url) {
      return res.status(400).json({ error: "Provide an image file or URL" });
    }

    const data = readGallery();
    const item = {
      id: Date.now().toString(),
      url,
      category,
    };
    data.items.push(item);
    writeGallery(data);
    res.json({ ok: true, item });
  } catch (err) {
    console.error("Gallery add error:", err.message);
    res.status(500).json({ error: "Failed to add gallery item" });
  }
});

app.delete("/api/gallery/:id", requireAdmin, (req, res) => {
  try {
    const data = readGallery();
    const index = data.items.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Item not found" });
    }

    const [removed] = data.items.splice(index, 1);
    if (removed.url.startsWith("/assets/images/gallery/")) {
      const filePath = path.join(ROOT_DIR, removed.url.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    writeGallery(data);
    res.json({ ok: true });
  } catch (err) {
    console.error("Gallery delete error:", err.message);
    res.status(500).json({ error: "Failed to delete gallery item" });
  }
});

app.listen(PORT, () => {
  console.log(`Golden Hour Events API running at http://localhost:${PORT}`);
  console.log(
    getCalendarClient()
      ? "Google Calendar: configured"
      : "Google Calendar: NOT configured (see server/.env.example)",
  );
});
