# <img src="icons/icon.png" width="40" height="40" valign="middle"> KOYU OKUYUCU

Koyu Okuyucu is a premium, feature-rich CHROME, FIREFOX, EDGE browser extension that brings a highly customizable, gorgeous dark mode experience to every website you visit. Designed for eye comfort, visual protection, and speed, it gives you complete control over how pages render.

## ✨ Features

### 🎨 Advanced Visual Controls
- **Brightness & Contrast**: Calibrate the exact visual balance that fits your environment.
- **Sepia (Warmth)**: Add a relaxing warm tint to the page to reduce blue-light strain.
- **Grayscale**: Turn down all colors to pure gray tones for focused reading or minimal distractions.

### 🖼️ Media & Smart Rendering
- **Visual Protection Mode**: Intelligently darkens elements without blindly inverting image or video colors, preserving their natural beauty.
- **Smart Image Darkening**: Dims images automatically to prevent glare. Need to see the full detail? Simply **hover over an image** to instantly restore its full brightness!

### ✍️ Typography Customization
- **Custom Font Overrides**: Force pages to use system fonts, Sans Serif, Serif, Monospace, or the dyslexia-friendly **OpenDyslexic** font.
- **Font Weight Adjuster**: Dynamically adjust text thickness (Normal, Medium, Bold) for optimal readability.

### 🤖 Automation & Smart Detection
- **Dynamic CSS Detection**: Real-time styling monitoring, built especially for modern Single Page Applications (SPAs) built with React, Vue, or Angular.
- **System Synchronization**: Automatically toggles dark mode based on your operating system's light/dark appearance.
- **Time Schedule**: Set custom sunset/sunrise times to automatically activate and deactivate dark mode.
- **MacBook Performance Mode**: A lightweight execution mode that minimizes DOM updates to save battery life and boost system responsiveness.

### 🌐 Domain-Specific Lists
- **Blacklist Mode** ("Not Invert Listed"): Run dark mode everywhere except on specific domains.
- **Whitelist Mode** ("Invert Listed Only"): Run dark mode strictly on domains you define.
- **Quick Controls**: Instantly add or remove the current website with a single click.

### ⌨️ Keyboard Shortcuts (Hotkeys)
- Fully customizable key combinations to:
  - Toggle the entire extension on/off.
  - Add or remove the current website from your lists.
- Interactive hotkey recorder directly within the extension popup.

### 🌍 Multi-language Support
- Built-in localization support for:
  - 🇹🇷 Türkçe (Turkish - Default)
  - 🇺🇸 English (English)
  - 🇩🇪 Deutsch (German)
  - 🇫🇷 Français (French)
  - 🇯🇵 日本語 (Japanese)
  - 🇷🇺 Русский (Russian)

---

## 🛠️ Architecture & Files

The extension is designed around Manifest V3 best practices for speed, security, and performance:

- **`manifest.json`**: Manifest V3 configuration supporting both Chromium-based browsers and Firefox (`browser_specific_settings`).
- **`content.js`**: High-performance, lightweight script that dynamically applies dark themes, listens for DOM changes, and injects filters.
- **`popup.html` & `popup.js`**: The beautiful control panel, featuring:
  - Slick tabbed interface (Visuals, Media, Type, Auto, Sites, Keys).
  - Modern interactive UI controls (ranges, sliders, toggles).
  - Real-time settings sync via `chrome.storage.local`.
- **`_locales/`**: i18n structure hosting internationalized messages.
- **`icons/`**: High-resolution icons for the browser action and store listing.

---

## 🚀 How to Install and Run Locally

### Chrome / Chromium-Based Browsers
1. Clone or download this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the folder containing this extension (`koyuokuyucu`).
6. Koyu Okuyucu is now active! Click the extension icon in your browser toolbar to customize your experience.

### Firefox
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select the `manifest.json` file inside the `koyuokuyucu` folder.
4. The extension will remain loaded until you close Firefox.

### Microsoft Edge
1. Open Microsoft Edge and navigate to `edge://extensions/`.
2. Enable **Developer mode** using the toggle switch in the bottom-left (or sidebar) settings panel.
3. Click the **Load unpacked** button.
4. Select the folder containing this extension (`koyuokuyucu`).
5. Koyu Okuyucu is now active! Click the extension icon in your browser toolbar to customize your experience.


---
