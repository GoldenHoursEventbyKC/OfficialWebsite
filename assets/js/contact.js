document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  const submitBtn = document.getElementById("submitBtn");
  const formStatus = document.getElementById("formStatus");

  if (!form) return;

  function getTemplateParams(inquiry) {
    const formattedMessage = [
      "New inquiry from Golden Event Hours by KC",
      "",
      `Name: ${inquiry.fullName}`,
      `Email: ${inquiry.email}`,
      `Phone: ${inquiry.phone || "Not provided"}`,
      `Event Type: ${inquiry.eventType || "Not specified"}`,
      "",
      "Message:",
      inquiry.message,
    ].join("\n");

    return {
      to_email: inquiry.toEmail,
      contact_email: inquiry.toEmail,
      admin_email: inquiry.toEmail,
      from_name: inquiry.fullName,
      name: inquiry.fullName,
      full_name: inquiry.fullName,
      from_email: inquiry.email,
      email: inquiry.email,
      reply_to: inquiry.email,
      phone: inquiry.phone || "Not provided",
      event_type: inquiry.eventType || "Not specified",
      eventType: inquiry.eventType || "Not specified",
      access_code: "New Website Inquiry",
      code: "New Website Inquiry",
      otp: "New Website Inquiry",
      passcode: "New Website Inquiry",
      message: formattedMessage,
      subject: "New inquiry from Golden Event Hours by KC",
    };
  }

  async function sendWithTemplate(templateId, inquiry) {
    if (!window.emailjs || !CONFIG?.EMAILJS) {
      throw new Error("EmailJS is not loaded. Refresh the page and try again.");
    }

    await emailjs.send(
      CONFIG.EMAILJS.SERVICE_ID,
      templateId,
      getTemplateParams(inquiry),
      CONFIG.EMAILJS.PUBLIC_KEY,
    );
  }

  async function sendInquiry(inquiry) {
    await sendWithTemplate(CONFIG.EMAILJS.CONTACT_TEMPLATE_ID, inquiry);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const inquiry = {
      toEmail: CONFIG.CONTACT_EMAIL,
      fullName: document.getElementById("fullName").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      eventType: document.getElementById("eventType").value.trim(),
      message: document.getElementById("message").value.trim(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    formStatus.textContent = "";
    formStatus.className = "form-status";

    try {
      await sendInquiry(inquiry);

      formStatus.textContent =
        "Thank you! Your message has been sent. We'll get back to you soon.";
      formStatus.classList.add("success");
      form.reset();
    } catch (error) {
      const details = error?.text || error?.message || String(error);
      console.error("Contact form send error:", error);
      formStatus.textContent = `Sorry, we couldn't send your message. ${details}`;
      formStatus.classList.add("error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Inquiry";
    }
  });
});
