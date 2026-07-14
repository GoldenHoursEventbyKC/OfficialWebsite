const CONFIG = {
  // Change this when deploying (e.g. "https://your-api.onrender.com")
  API_BASE_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000"
      : "",

  EMAILJS: {
    PUBLIC_KEY: "jcXiPaXYj5_yXBrk2",
    SERVICE_ID: "service_2uoyv9v",
    OTP_TEMPLATE_ID: "template_s90z2wg",
    CONTACT_TEMPLATE_ID: "template_6f47y6p",
  },

  ADMIN_EMAIL: "goldenhourseventkcwork@gmail.com",
  ADMIN_API_TOKEN: "goldenhourmoments",

  CONTACT_EMAIL: "goldenhourseventkcwork@gmail.com",

  GOOGLE_CALENDAR_ID:
    "ec65656a09c939325c73aca7ab25aea6bb292d0604813ae6959457d8b28c564f@group.calendar.google.com",
  GOOGLE_CALENDAR_TIMEZONE: "Asia/Manila",
};
