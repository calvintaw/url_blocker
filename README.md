# 🔒 Smart Malicious URL Detector

A minimal, privacy-friendly Chrome Extension to block malicious or distracting websites. It redirects users to a custom `warning.html` page when they visit a blocked site.

> 🛠️ Made as a free alternative to BlockSite, which limits to 2 rules unless you pay (which triggered me). This tool gives you full control with no cost (downside: less features).

---

## 🚀 Features

- Blocks access to malicious or user-defined URLs
- Redirects to a custom warning page
- Lock toggle to enable/disable protection (add another step to unblocking a redirect rule)
- Optional integration with Google Safe Browsing API
- Lightweight, fast, and open source

---

## 📦 Installation

1. Clone or download this repository.
2. Open `chrome://extensions/` in Chrome.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project folder.

---

## 🔑 Optional: Enable Safe Browsing API

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (or use an existing one).
3. Enable the **Safe Browsing API** under **APIs & Services** > **Library**.
4. Go to **APIs & Services** > **Credentials** → **Create API key**.
5. Add the key to `background.js`:

```js
const API_KEY = "YOUR_GOOGLE_API_KEY";
```
