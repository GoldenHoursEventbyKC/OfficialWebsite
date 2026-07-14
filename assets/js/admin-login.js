document.addEventListener("DOMContentLoaded", () => {
  const settingsLink = document.getElementById("settingsLink");
  const settingsModal = document.getElementById("settingsModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const sendCodeBtn = document.getElementById("sendCodeBtn");
  const loginAdminBtn = document.getElementById("loginAdminBtn");
  const accessCodeInput = document.getElementById("accessCodeInput");

  let generatedCode = null;
  const adminEmail =
    typeof CONFIG !== "undefined" && CONFIG.ADMIN_EMAIL
      ? CONFIG.ADMIN_EMAIL
      : "goldenhourseventkcwork@gmail.com";
  const sendCodeDefaultText = sendCodeBtn
    ? sendCodeBtn.textContent.trim() || "Send a code"
    : "Send a code";

  function setSendCodeStatus(message, type = "info") {
    if (!sendCodeBtn) return;

    let status = document.getElementById("sendCodeStatus");
    if (!status) {
      status = document.createElement("p");
      status.id = "sendCodeStatus";
      status.setAttribute("aria-live", "polite");
      status.style.margin = "0 0 10px";
      status.style.fontSize = "0.9rem";
      sendCodeBtn.insertAdjacentElement("afterend", status);
    }

    status.textContent = message;
    status.style.color = type === "error" ? "#b00020" : "#333";
  }

  function resetSendCodeButton() {
    if (!sendCodeBtn) return;
    sendCodeBtn.textContent = sendCodeDefaultText;
    sendCodeBtn.disabled = false;
    sendCodeBtn.style.display = "block";
    sendCodeBtn.style.visibility = "visible";
    sendCodeBtn.style.opacity = "1";
  }

  function getAdminBasePath() {
    return window.location.pathname.includes("/admin/") ? "" : "admin/";
  }

  async function sendAccessCodeWithEmailJS(code) {
    if (!window.emailjs || !CONFIG?.EMAILJS) {
      throw new Error("EmailJS is not available");
    }

    const templateParams = {
      to_email: adminEmail,
      email: adminEmail,
      user_email: adminEmail,
      admin_email: adminEmail,
      access_code: code,
      code,
      otp: code,
      passcode: code,
      name: "Golden Event Hours Admin",
      title: "Admin Access Code Request",
      subject: `Golden Event Hours admin login code: ${code}`,
      message: `Your Golden Event Hours admin access code is ${code}. Enter this code in the Admin Access Settings popup to log in.`,
    };

    await emailjs.send(
      CONFIG.EMAILJS.SERVICE_ID,
      CONFIG.EMAILJS.OTP_TEMPLATE_ID,
      templateParams,
      CONFIG.EMAILJS.PUBLIC_KEY,
    );
  }

  async function sendAccessCodeEmail(code) {
    try {
      await sendAccessCodeWithEmailJS(code);
      return;
    } catch (emailJsError) {
      console.warn("EmailJS access code send failed:", emailJsError);
    }

    const formData = new FormData();
    Object.entries({
      name: "Golden Event Hours Admin Login",
      email: adminEmail,
      access_code: code,
      message: `Your Golden Event Hours admin access code is ${code}. Enter this code in the Admin Access Settings popup to log in.`,
      _subject: `Golden Event Hours admin login code: ${code}`,
      _template: "table",
      _captcha: "false",
    }).forEach(([key, value]) => formData.append(key, value));

    const response = await fetch(`https://formsubmit.co/${adminEmail}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      let details = "";
      try {
        details = await response.text();
      } catch {
        details = "";
      }
      throw new Error(details || `Request failed (${response.status})`);
    }
  }

  resetSendCodeButton();

  // 1. Open Pop-up
  if (settingsLink) {
    settingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (isAdminAuthenticated()) {
        window.location.href = `${getAdminBasePath()}admin-calendar.html`;
        return;
      }
      settingsModal.style.display = "flex";
      resetSendCodeButton();
    });
  }

  // 2. Close Pop-up
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", () => {
      settingsModal.style.display = "none";
      accessCodeInput.value = "";
    });
  }

  window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = "none";
      accessCodeInput.value = "";
    }
  });

  // 3. Generate and SEND the real email
  if (sendCodeBtn) {
    sendCodeBtn.addEventListener("click", async () => {
      const codeToSend = Math.floor(100000 + Math.random() * 900000).toString();
      sendCodeBtn.textContent = "Sending...";
      sendCodeBtn.disabled = true;
      setSendCodeStatus("");

      try {
        await sendAccessCodeEmail(codeToSend);

        generatedCode = codeToSend;
        sendCodeBtn.textContent = "Code Sent";
        setSendCodeStatus(`A secure access code was sent to ${adminEmail}.`);

        setTimeout(() => {
          resetSendCodeButton();
        }, 5000);
      } catch (error) {
        generatedCode = null;
        console.error("Access code email error:", error);
        resetSendCodeButton();
        setSendCodeStatus(
          "Failed to send the email code. Please try again in a moment.",
          "error",
        );
      }
    });
  }

  // 4. Validate and Login
  if (loginAdminBtn) {
    loginAdminBtn.addEventListener("click", () => {
      const enteredCode = accessCodeInput.value.trim();

      if (!generatedCode) {
        alert("Please request an access code first by clicking 'Send a code'.");
        return;
      }

      if (enteredCode === generatedCode) {
        generatedCode = null;
        setAdminAuthenticated();
        alert("Login successful! Redirecting to admin dashboard...");
        window.location.href = `${getAdminBasePath()}admin-calendar.html`;
      } else {
        alert("Incorrect Access Code. Please try again.");
        accessCodeInput.value = "";
      }
    });
  }
});
