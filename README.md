# 🔒 Smart Malicious URL Detector

A minimal, free alternative to BlockSite. This Chrome Extension blocks access to malicious or distracting websites and redirects users to a custom warning page.

## 🚀 Features

- ✅ Blocks access to malicious URLs (Google Safe Browsing API required)
- ✅ Custom redirect to a beautiful `warning.html` page
- ✅ Lightweight and fast
- ✅ Open source and free

## 📦 Installation

1. Clone or download this repository.
2. Go to `chrome://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder

## 🔑 Optional: Enable Safe Browsing API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select one)
3. Enable **Safe Browsing API** under **APIs & Services**
4. Go to **Credentials** → Create an API key
5. Add your API key to the `background.js` file:

```js
const API_KEY = "YOUR_GOOGLE_API_KEY";
```
