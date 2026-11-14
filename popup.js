globalThis.browser = globalThis.browser || globalThis.chrome || {};

// Polyfill for standalone testing (e.g., in popup-mobile.html or mobile simulators)
if (!browser.i18n) {
    browser.i18n = { getUILanguage: () => 'en', getMessage: (key) => '' };
}
if (!browser.runtime) {
    browser.runtime = { getManifest: () => ({ version: '1.0.0-test' }), getURL: (path) => path, lastError: null };
}
if (!browser.storage) {
    browser.storage = {
        local: { get: (keys, cb) => cb && cb({}), set: (data, cb) => cb && cb() }
    };
}
if (!browser.tabs) {
    browser.tabs = {
        query: (q, cb) => cb && cb([{ id: 1, url: 'https://example.com' }]),
        sendMessage: (id, msg, cb) => cb && cb()
    };
}

document.addEventListener('DOMContentLoaded', () => {
    document.documentElement.lang = browser.i18n.getUILanguage() || 'en';

    // === UI Elements ===
    const globalToggle = document.getElementById('darkModeToggle');
    const statusText = document.getElementById('statusText');
    const siteToggle = document.getElementById('siteToggle'); // Legacy toggle
    const siteDomainSpan = document.getElementById('siteDomain');

    // Visuals
    const brightness = document.getElementById('brightness');
    const contrast = document.getElementById('contrast');
    const sepia = document.getElementById('sepia');
    const grayscale = document.getElementById('grayscale');
    const valBrightness = document.getElementById('valBrightness');
    const valContrast = document.getElementById('valContrast');
    const valSepia = document.getElementById('valSepia');
    const valGrayscale = document.getElementById('valGrayscale');

    // Media
    const smartImages = document.getElementById('smartImages');
    const visualProtection = document.getElementById('visualProtection');
    const dynamicDetection = document.getElementById('dynamicDetection');
    const performanceMode = document.getElementById('performanceMode');

    // Type
    const enableFonts = document.getElementById('enableFonts');
    const fontFamily = document.getElementById('fontFamily');
    const fontWeight = document.getElementById('fontWeight');
    const valWeight = document.getElementById('valWeight');

    // Auto
    const autoMode = document.getElementById('autoMode');
    const timeSettings = document.getElementById('timeSettings');
    const timeStart = document.getElementById('timeStart');
    const timeEnd = document.getElementById('timeEnd');
    const timeStartField = document.getElementById('timeStartField');
    const timeEndField = document.getElementById('timeEndField');
    const timeStartDisplay = document.getElementById('timeStartDisplay');
    const timeEndDisplay = document.getElementById('timeEndDisplay');
    const autoInfo = document.getElementById('autoInfo');

    // Sites
    const siteSubTabs = document.querySelectorAll('.sub-tab');
    const addCurrentSite = document.getElementById('addCurrentSite');
    const currentSiteName = document.getElementById('currentSiteName');
    const siteListContainer = document.getElementById('siteListContainer');
    const addSiteHotkeyDisplay = document.getElementById('addSiteHotkeyDisplay');

    // Keys
    const shortcutInput = document.getElementById('shortcutInput');
    const clearShortcut = document.getElementById('clearShortcut');
    const shortcutInputSite = document.getElementById('shortcutInputSite');
    const clearShortcutSite = document.getElementById('clearShortcutSite');

    // Tabs
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.content');

    // Detect mobile devices and local iframe tester to hide Keys tab
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isMobile = isMobileUA || (window.self !== window.top);
    if (isMobile) {
        const keysTabBtn = document.querySelector('.tab[data-tab="keys"]');
        if (keysTabBtn) keysTabBtn.style.display = 'none';
    }

    // Firefox for Android and Edge for Android render the popup as a full-width page
    if (isMobileUA) document.body.classList.add('full-page');

    let currentHostname = '';
    let currentSettings = null;
    let customMessages = null;

    // === Settings UI ===
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const footerDonateBtn = document.getElementById('footerDonateBtn');
    const aboutDonateBtn = document.getElementById('aboutDonateBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    const languageSelect = document.getElementById('languageSelect');
    const appVersion = document.getElementById('appVersion');
    const themeSwatches = document.querySelectorAll('.theme-swatch');
    const enablePdf = document.getElementById('enablePdf');

    // Firefox cannot render browser PDFs in dark mode, so the General panel is meaningless there
    const isFirefox = /Firefox\//.test(navigator.userAgent) ||
        !!(browser.runtime.getManifest && browser.runtime.getManifest().browser_specific_settings?.gecko);
    if (isFirefox) {
        const generalTab = document.querySelector('.settings-tab[data-stabs="general"]');
        const generalPanel = document.getElementById('panel-general');
        if (generalTab) generalTab.style.display = 'none';
        if (generalPanel) generalPanel.style.display = 'none';
        if (generalTab && generalTab.classList.contains('active')) switchSettingsTab('about');
    }

    const THEME_CLASSES = ['theme-light', 'theme-dark', 'theme-black', 'theme-white', 'theme-sepia', 'theme-blue'];

    function applyTheme(themeName) {
        THEME_CLASSES.forEach(cls => document.body.classList.remove(cls));
        if (themeName && themeName !== 'default' && THEME_CLASSES.includes('theme-' + themeName)) {
            document.body.classList.add('theme-' + themeName);
        }
        themeSwatches.forEach(sw => {
            if (sw.dataset.theme === themeName) sw.classList.add('active');
            else sw.classList.remove('active');
        });
    }

    function switchSettingsTab(target) {
        settingsTabs.forEach(t => {
            if (t.getAttribute('data-stabs') === target) t.classList.add('active');
            else t.classList.remove('active');
        });
        settingsPanels.forEach(p => {
            if (p.id === 'panel-' + target) p.classList.add('active');
            else p.classList.remove('active');
        });
    }

    if (appVersion) {
        appVersion.textContent = browser.runtime.getManifest().version;
    }

    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            settingsOverlay.style.display = 'flex';
            document.body.classList.add('settings-open');
        });
    }

    if (footerDonateBtn) {
        footerDonateBtn.addEventListener('click', () => {
            settingsOverlay.style.display = 'flex';
            document.body.classList.add('settings-open');
            switchSettingsTab('donate');
        });
    }

    if (aboutDonateBtn) {
        aboutDonateBtn.addEventListener('click', () => {
            switchSettingsTab('donate');
        });
    }

    // Koyu Okuyucu GitHub bağlantıları
    const KOYU_OKUYUCU_URL = 'https://github.com/koyufikirler/koyuokuyucu';

    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
        headerTitle.addEventListener('click', () => {
            browser.tabs.create({ url: KOYU_OKUYUCU_URL });
        });
    }

    const aboutLogo = document.getElementById('aboutLogo');
    if (aboutLogo) {
        aboutLogo.addEventListener('click', () => {
            browser.tabs.create({ url: KOYU_OKUYUCU_URL });
        });
    }

    const aboutTitle = document.getElementById('aboutTitle');
    if (aboutTitle) {
        aboutTitle.addEventListener('click', () => {
            browser.tabs.create({ url: KOYU_OKUYUCU_URL });
        });
    }

    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsOverlay.style.display = 'none';
            document.body.classList.remove('settings-open');
        });
    }

    settingsTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-stabs');
            switchSettingsTab(target);
        });
    });

    if (languageSelect) {
        languageSelect.addEventListener('change', () => {
            if (currentSettings) {
                currentSettings.language = languageSelect.value;
                broadcastSettings();
                setLanguageAndApply(currentSettings.language);
            }
        });
    }

    themeSwatches.forEach(sw => {
        sw.addEventListener('click', () => {
            if (!currentSettings) return;
            const theme = sw.dataset.theme;
            currentSettings.uiTheme = theme;
            applyTheme(theme);
            broadcastSettings();
        });
    });

    async function setLanguageAndApply(lang) {
        if (!lang || lang === 'system') {
            customMessages = null;
            document.documentElement.lang = browser.i18n.getUILanguage() || 'en';
        } else {
            document.documentElement.lang = lang;
            try {
                const url = browser.runtime.getURL(`_locales/${lang}/messages.json`);
                const res = await fetch(url);
                customMessages = await res.json();
            } catch (e) {
                try {
                    const fallbackUrl = browser.runtime.getURL(`_locales/en/messages.json`);
                    const fallbackRes = await fetch(fallbackUrl);
                    customMessages = await fallbackRes.json();
                } catch (e) {
                    customMessages = null;
                }
            }
        }
        applyLocalization();
    }

    function getMessage(key) {
        if (customMessages && customMessages[key] && customMessages[key].message) {
            return customMessages[key].message;
        }
        return browser.i18n.getMessage(key) || '';
    }

    // === Localization ===
    function applyLocalization() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const msg = getMessage(el.getAttribute('data-i18n'));
            if (msg) el.innerHTML = msg;
        });
        document.querySelectorAll('[data-i18n-attr]').forEach(el => {
            const attrStr = el.getAttribute('data-i18n-attr');
            if (attrStr) {
                const [attr, key] = attrStr.split(':');
                const msg = getMessage(key);
                if (msg) el.setAttribute(attr, msg);
            }
        });

        if (currentSettings) {
            if (currentSettings.automation.mode === 'manual') {
                statusText.textContent = currentSettings.enabled ? getMessage("statusOn") : getMessage("statusOff");
            } else {
                statusText.textContent = getMessage("statusAuto");
            }
            valWeight.textContent = weightName(currentSettings.fontWeight);
            updateAutoUI(currentSettings.automation.mode);
            shortcutInput.value = formatShortcut(currentSettings.shortcut);
            shortcutInputSite.value = formatShortcut(currentSettings.shortcutSite);
            addSiteHotkeyDisplay.textContent = formatShortcut(currentSettings.shortcutSite);
        }

        syncTimeDisplays();
        localizeClockPicker();
    }


    // === Helpers ===
    function toggleTab(tabId) {
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));

        document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(tabId).classList.add('active');
    }

    function toggleSubTab(mode) {
        siteSubTabs.forEach(t => {
            if (t.dataset.mode === mode) t.classList.add('active');
            else t.classList.remove('active');
        });
        // Update settings mode? Yes
        if (currentSettings) {
            currentSettings.siteList.mode = mode;
            broadcastSettings(); // This saves and broadcasts
            renderSiteList();
            updateSiteToggleState();
        }
    }

    function weightName(val) {
        if (val == 0) return getMessage("fontWeightNormal");
        if (val == 1) return getMessage("fontWeightMedium");
        if (val == 2) return getMessage("fontWeightBold");
        return getMessage("fontWeightNormal");
    }

    function updateAutoUI(mode) {
        timeSettings.style.display = mode === 'time' ? 'block' : 'none';

        if (mode === 'manual') {
            globalToggle.disabled = false;
            autoInfo.textContent = getMessage("descAutoInfoManual");
        } else {
            globalToggle.disabled = true;
            if (mode === 'system') {
                autoInfo.textContent = getMessage("descAutoInfoSystem");
            } else if (mode === 'time') {
                autoInfo.textContent = getMessage("descAutoInfoTime");
            }
        }
    }

    // Mac keyboards use modifier symbols, Windows/Linux users expect key names
    const isMacPlatform = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);

    function formatShortcut(shortcut) {
        if (!shortcut || !shortcut.key) return getMessage("shortcutNone");
        const parts = [];

        if (isMacPlatform) {
            if (shortcut.metaKey) parts.push('⌘');
            if (shortcut.ctrlKey) parts.push('⌃');
            if (shortcut.altKey) parts.push('⌥');
            if (shortcut.shiftKey) parts.push('⇧');
        } else {
            if (shortcut.ctrlKey) parts.push('Ctrl');
            if (shortcut.shiftKey) parts.push('Shift');
            if (shortcut.altKey) parts.push('Alt');
            if (shortcut.metaKey) parts.push('Win');
        }

        let key = shortcut.key.toUpperCase();

        if (shortcut.code && shortcut.code.startsWith('Key')) {
            key = shortcut.code.replace('Key', '');
        } else if (shortcut.code && shortcut.code.startsWith('Digit')) {
            key = shortcut.code.replace('Digit', '');
        } else {
            // Fallback cleanup
            if (key === 'CONTROL') return getMessage("shortcutNone"); // Just modifier
            if (key === 'SHIFT') return getMessage("shortcutNone");
            if (key === 'ALT') return getMessage("shortcutNone");
            if (key === 'META') return getMessage("shortcutNone");
        }

        parts.push(key);
        return parts.join(isMacPlatform ? '' : '+');
    }

    function renderSiteList() {
        siteListContainer.innerHTML = '';
        if (!currentSettings) return;

        const mode = currentSettings.siteList.mode;
        const list = mode === 'blacklist' ? currentSettings.siteList.blacklist : currentSettings.siteList.whitelist;

        if (!list || list.length === 0) {
            siteListContainer.innerHTML = '<div data-i18n="lblEmptyList" style="padding: 5px; font-size: 12px; color: #86868b; text-align: center;">🚫 ' + getMessage("lblEmptyList") + '</div>';
            return;
        }

        list.forEach(domain => {
            const div = document.createElement('div');
            div.className = 'site-item';
            div.innerHTML = `
                <span style="font-size: 12px;">${domain}</span>
                <span class="remove-site" data-domain="${domain}">&times;</span>
            `;
            siteListContainer.appendChild(div);
        });

        // Add listeners
        document.querySelectorAll('.remove-site').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const domain = e.target.dataset.domain;
                removeDomain(domain);
            });
        });
    }

    function addDomain(domain) {
        const mode = currentSettings.siteList.mode;
        const list = mode === 'blacklist' ? currentSettings.siteList.blacklist : currentSettings.siteList.whitelist;

        if (!list.includes(domain)) {
            list.push(domain);
            broadcastSettings();
            renderSiteList();
            updateSiteToggleState();
        }
    }

    function removeDomain(domain) {
        const mode = currentSettings.siteList.mode;
        if (mode === 'blacklist') {
            currentSettings.siteList.blacklist = currentSettings.siteList.blacklist.filter(d => d !== domain);
        } else {
            currentSettings.siteList.whitelist = currentSettings.siteList.whitelist.filter(d => d !== domain);
        }
        broadcastSettings();
        renderSiteList();
        updateSiteToggleState();
    }

    function updateSiteToggleState() {
        const mode = currentSettings.siteList.mode;
        if (mode === 'blacklist') {
            siteToggle.checked = currentSettings.siteList.blacklist.includes(currentHostname);
        } else {
            siteToggle.checked = !currentSettings.siteList.whitelist.includes(currentHostname);
        }
    }

    // === Core Logic ===
    function readTimeState(el, fallback) {
        return el && el.dataset && el.dataset.timeValue ? el.dataset.timeValue : fallback;
    }

    function writeTimeState(el, value) {
        if (el && el.dataset) el.dataset.timeValue = value;
    }

    function collectSettingsFromUI() {
        return {
            enabled: globalToggle.checked,
            brightness: parseInt(brightness.value),
            contrast: parseInt(contrast.value),
            sepia: parseInt(sepia.value),
            grayscale: parseInt(grayscale.value),
            smartImages: smartImages.checked,
            visualProtection: visualProtection.checked,
            dynamicDetection: dynamicDetection.checked,
            performanceMode: performanceMode.checked,
            fontEnabled: enableFonts.checked,
            fontFamily: fontFamily.value,
            fontWeight: parseInt(fontWeight.value),
            automation: {
                mode: autoMode.value,
                startTime: readTimeState(timeStart, '19:00'),
                endTime: readTimeState(timeEnd, '07:00')
            },
            language: languageSelect ? languageSelect.value : 'system',
            uiTheme: currentSettings.uiTheme || 'default',
            enablePdf: enablePdf ? enablePdf.checked : false,
            shortcut: currentSettings.shortcut, // Preserve
            shortcutSite: currentSettings.shortcutSite, // Preserve
            siteList: {
                mode: currentSettings.siteList.mode, // Preserved via toggleSubTab
                blacklist: currentSettings.siteList.blacklist,
                whitelist: currentSettings.siteList.whitelist
            }
        };
    }

    function broadcastSettings() {
        // Merge UI state into currentSettings
        if (!currentSettings) return; // Guard
        const uiSettings = collectSettingsFromUI();
        currentSettings = { ...currentSettings, ...uiSettings }; // Updates global state

        // Update labels
        if (currentSettings.automation.mode === 'manual') {
            statusText.textContent = currentSettings.enabled ? getMessage("statusOn") : getMessage("statusOff");
        } else {
            statusText.textContent = getMessage("statusAuto");
        }

        valBrightness.textContent = currentSettings.brightness;
        valContrast.textContent = currentSettings.contrast;
        valSepia.textContent = currentSettings.sepia;
        valGrayscale.textContent = currentSettings.grayscale;
        valWeight.textContent = weightName(currentSettings.fontWeight);

        updateAutoUI(currentSettings.automation.mode);

        shortcutInput.value = formatShortcut(currentSettings.shortcut);
        shortcutInputSite.value = formatShortcut(currentSettings.shortcutSite);
        addSiteHotkeyDisplay.textContent = formatShortcut(currentSettings.shortcutSite);

        // Save
        browser.storage.local.set({ settings: currentSettings });

        // Broadcast
        browser.tabs.query({}, (tabs) => {
            for (const tab of tabs) {
                browser.tabs.sendMessage(tab.id, {
                    command: 'updateSettings',
                    settings: currentSettings
                }, () => {
                    if (browser.runtime.lastError) { }
                });
            }
        });
    }

    function loadSettings() {
        browser.storage.local.get(['settings'], (result) => {
            const s = result.settings || {
                enabled: false,
                brightness: 100,
                contrast: 100,
                sepia: 0,
                grayscale: 0,
                smartImages: true,
                visualProtection: false,
                dynamicDetection: true,
                performanceMode: false,
                fontEnabled: false,
                fontFamily: 'system',
                fontWeight: 0,
                automation: { mode: 'manual', startTime: '19:00', endTime: '07:00' },
                language: 'system',
                uiTheme: 'default',
                enablePdf: false,
                shortcut: null,
                shortcutSite: null,
                siteList: { mode: 'blacklist', blacklist: [], whitelist: [] }
            };

            // Backfill defaults
            if (!s.automation) s.automation = { mode: 'manual', startTime: '19:00', endTime: '07:00' };
            if (s.grayscale === undefined) s.grayscale = 0;
            if (!s.siteList) s.siteList = { mode: 'blacklist', blacklist: [], whitelist: [] };
            if (s.performanceMode === undefined) s.performanceMode = false;
            if (s.visualProtection === undefined) s.visualProtection = false;
            if (s.dynamicDetection === undefined) s.dynamicDetection = true;
            if (s.enablePdf === undefined) s.enablePdf = false;
            if (!s.language) s.language = 'system';
            if (!s.uiTheme) s.uiTheme = 'default';

            currentSettings = s;
            applyTheme(s.uiTheme);
            if (languageSelect) languageSelect.value = s.language;
            setLanguageAndApply(s.language);

            // Set UI
            globalToggle.checked = s.enabled;

            brightness.value = s.brightness;
            contrast.value = s.contrast;
            sepia.value = s.sepia;
            grayscale.value = s.grayscale;

            valBrightness.textContent = s.brightness;
            valContrast.textContent = s.contrast;
            valSepia.textContent = s.sepia;
            valGrayscale.textContent = s.grayscale;

            smartImages.checked = s.smartImages !== false;
            visualProtection.checked = !!s.visualProtection;
            dynamicDetection.checked = s.dynamicDetection !== false;
            performanceMode.checked = s.performanceMode || false;

            enableFonts.checked = s.fontEnabled || false;
            fontFamily.value = s.fontFamily || 'system';
            fontWeight.value = s.fontWeight || 0;
            valWeight.textContent = weightName(s.fontWeight);

            if (enablePdf) enablePdf.checked = !!s.enablePdf;

            // Auto
            autoMode.value = s.automation.mode || 'manual';
            writeTimeState(timeStart, s.automation.startTime || '19:00');
            writeTimeState(timeEnd, s.automation.endTime || '07:00');
            syncTimeDisplays();
            updateAutoUI(s.automation.mode);

            if (s.automation.mode === 'manual') {
                statusText.textContent = s.enabled ? getMessage("statusOn") : getMessage("statusOff");
            } else {
                statusText.textContent = getMessage("statusAuto");
            }

            // Shortcuts
            shortcutInput.value = formatShortcut(s.shortcut);
            shortcutInputSite.value = formatShortcut(s.shortcutSite);
            addSiteHotkeyDisplay.textContent = formatShortcut(s.shortcutSite);

            // Sites Sub-Tabs
            toggleSubTab(s.siteList.mode);
            renderSiteList();
            updateSiteToggleState();
        });
    }

    // === Apple-style Time Picker ===
    const clockOverlay = document.getElementById('appleClockOverlay');
    const clockEyebrow = document.getElementById('appleClockEyebrow');
    const clockTitle = document.getElementById('appleClockTitle');
    const clockSubtitle = document.getElementById('appleClockSubtitle');
    const clockFace = document.getElementById('appleClockFace');
    const clockNumerals = document.getElementById('appleClockNumerals');
    const hourHand = document.getElementById('appleHourHand');
    const minuteHand = document.getElementById('appleMinuteHand');
    const hourBtn = document.getElementById('appleHourBtn');
    const minuteBtn = document.getElementById('appleMinuteBtn');
    const periodControl = document.getElementById('applePeriod');
    const clockHint = document.getElementById('appleClockHint');
    const clockCancel = document.getElementById('appleClockCancel');
    const clockDone = document.getElementById('appleClockDone');

    const clockState = {
        target: null,
        titleKey: 'lblStartTime',
        hours: 19,
        minutes: 0,
        mode: 'hour',
        is24: false,
        dragging: false,
        dragRing: null
    };

    // 24-hour dial layouts:
    // 'classic12' → 1–12 face, hour hand passes twice a day (24h readout stays).
    // 'double'    → 0–11 on the outer ring, 12–23 on the inner ring.
    const DIAL24_STYLE = 'classic12';

    function get24DialStyle() {
        return document.body.dataset.clockDial24 === 'double' ? 'double' : DIAL24_STYLE;
    }

    function uses12HourDial() {
        return !clockState.is24 || get24DialStyle() === 'classic12';
    }
    const lastHandAngles = { hour: null, minute: null };
    const clockTyping = { part: null, buffer: '', resetTimer: null };
    let clockCloseTimer = null;
    let clockFocusTimer = null;
    let clockFocusBeforeOpen = null;

    function pad2(value) {
        return String(value).padStart(2, '0');
    }

    function parseTimeValue(value) {
        const match = /^(\d{1,2}):(\d{2})/.exec(value || '');
        if (!match) return { hours: 19, minutes: 0 };
        return {
            hours: Math.min(23, Math.max(0, parseInt(match[1], 10) || 0)),
            minutes: Math.min(59, Math.max(0, parseInt(match[2], 10) || 0))
        };
    }

    function to12Hour(hours) {
        return ((hours + 11) % 12) + 1;
    }

    function isPm(hours) {
        return hours >= 12;
    }

    function clockTitleFor(key) {
        const msg = getMessage(key);
        if (msg) return msg;
        if (clockState.target) {
            const group = clockState.target.closest('.control-group');
            const label = group ? group.querySelector('label') : null;
            if (label && label.textContent.trim()) return label.textContent.trim();
        }
        return key === 'lblEndTime' ? 'End Time (Sunrise)' : 'Start Time (Sunset)';
    }

    function applyClockTitle() {
        if (!clockTitle) return;
        const raw = clockTitleFor(clockState.titleKey);
        const match = /^(.+?)\s*\((.+)\)\s*$/.exec(raw);
        const title = match ? match[1] : raw;
        const subtitle = match ? match[2] : '';

        clockTitle.textContent = title;
        if (clockSubtitle) {
            clockSubtitle.textContent = subtitle;
            clockSubtitle.hidden = !subtitle;
        }
    }

    function detect24HourClock() {
        try {
            const lang = (document.documentElement.lang || '').replace(/_/g, '-') || undefined;
            const fmt = new Intl.DateTimeFormat(lang, { hour: 'numeric' });
            const cycle = fmt.resolvedOptions().hourCycle;
            if (cycle) return cycle === 'h23' || cycle === 'h24';
            return !fmt.formatToParts(new Date(2024, 0, 1, 13)).some(part => part.type === 'dayPeriod');
        } catch (e) {
            return true;
        }
    }

    function formatDisplayTimeValue(value) {
        const { hours, minutes } = parseTimeValue(value);
        try {
            const lang = (document.documentElement.lang || '').replace(/_/g, '-') || undefined;
            const fmt = new Intl.DateTimeFormat(lang, { hour: '2-digit', minute: '2-digit' });
            return fmt.format(new Date(2024, 0, 1, hours, minutes));
        } catch (e) {
            return pad2(hours) + ':' + pad2(minutes);
        }
    }

    function syncTimeDisplays() {
        if (timeStart && timeStartDisplay) {
            timeStartDisplay.textContent = formatDisplayTimeValue(readTimeState(timeStart, '19:00'));
        }
        if (timeEnd && timeEndDisplay) {
            timeEndDisplay.textContent = formatDisplayTimeValue(readTimeState(timeEnd, '07:00'));
        }
    }

    function localizeClockPicker() {
        if (!clockOverlay) return;
        if (clockEyebrow) clockEyebrow.textContent = getMessage('optModeTime') || 'Time Schedule';
        if (clockHint) clockHint.textContent = getMessage('hintClockDrag') || 'Drag, tap, or type the time.';
        if (hourBtn) hourBtn.setAttribute('aria-label', getMessage('lblHour') || 'Hour');
        if (minuteBtn) minuteBtn.setAttribute('aria-label', getMessage('lblMinute') || 'Minute');
        if (clockCancel) clockCancel.textContent = getMessage('btnCancel') || 'Cancel';
        if (clockDone) clockDone.textContent = getMessage('btnDone') || 'Done';
        if (clockState.target && clockTitle) {
            applyClockTitle();
        }
    }

    function buildClockNumerals() {
        if (!clockNumerals) return;
        clockNumerals.innerHTML = '';
        const isDouble = clockState.is24 && clockState.mode === 'hour' && get24DialStyle() === 'double';
        const isCompactHour = isDouble;
        const values = [];

        if (clockState.mode === 'minute') {
            for (let m = 0; m < 60; m += 5) values.push({ value: m, label: pad2(m), radius: 74 });
        } else if (isDouble) {
            for (let h = 0; h < 12; h += 1) values.push({ value: h, label: String(h), radius: 78 });
            for (let h = 12; h < 24; h += 1) values.push({ value: h, label: String(h), radius: 56 });
        } else {
            for (let h = 1; h <= 12; h += 1) values.push({ value: h, label: String(h), radius: 74 });
        }

        clockNumerals.classList.toggle('is-compact', isCompactHour);
        const unit = clockState.mode === 'minute' ? 6 : 30;
        const fragment = document.createDocumentFragment();

        values.forEach(item => {
            const angleValue = isDouble && item.value >= 12 ? item.value - 12 : item.value;
            const rad = (angleValue * unit - 90) * Math.PI / 180;
            const radius = item.radius || 74;
            const el = document.createElement('span');
            el.className = 'apple-clock-numeral';
            el.textContent = item.label;
            el.dataset.clockValue = String(item.value);
            el.style.left = 'calc(50% + ' + (Math.cos(rad) * radius).toFixed(2) + 'px)';
            el.style.top = 'calc(50% + ' + (Math.sin(rad) * radius).toFixed(2) + 'px)';
            fragment.appendChild(el);
        });

        clockNumerals.appendChild(fragment);
        highlightClockNumerals();
    }

    function activeClockValue() {
        if (clockState.mode === 'minute') return clockState.minutes;
        return uses12HourDial() ? to12Hour(clockState.hours) : clockState.hours;
    }

    function highlightClockNumerals() {
        if (!clockNumerals) return;
        const active = String(activeClockValue());
        clockNumerals.querySelectorAll('.apple-clock-numeral').forEach(el => {
            el.classList.toggle('is-active', el.dataset.clockValue === active);
        });
    }

    function updateClockReadout() {
        if (!hourBtn || !minuteBtn) return;

        const hourText = clockState.is24 ? pad2(clockState.hours) : String(to12Hour(clockState.hours));
        const currentPeriod = isPm(clockState.hours) ? 'PM' : 'AM';
        hourBtn.textContent = hourText;
        minuteBtn.textContent = pad2(clockState.minutes);
        hourBtn.classList.toggle('active', clockState.mode === 'hour');
        minuteBtn.classList.toggle('active', clockState.mode === 'minute');

        if (periodControl) {
            periodControl.hidden = clockState.is24;
            periodControl.querySelectorAll('[data-clock-period]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.clockPeriod === currentPeriod);
            });
        }

        highlightClockNumerals();

        if (clockFace) {
            if (clockState.mode === 'hour') {
                clockFace.setAttribute('aria-label', getMessage('lblHour') || 'Hour');
                clockFace.setAttribute('aria-valuemin', clockState.is24 ? '0' : '1');
                clockFace.setAttribute('aria-valuemax', clockState.is24 ? '23' : '12');
                clockFace.setAttribute('aria-valuenow', clockState.is24 ? clockState.hours : activeClockValue());
                clockFace.setAttribute('aria-valuetext',
                    clockState.is24 ? pad2(clockState.hours) : hourText + ' ' + currentPeriod);
            } else {
                clockFace.setAttribute('aria-label', getMessage('lblMinute') || 'Minute');
                clockFace.setAttribute('aria-valuemin', '0');
                clockFace.setAttribute('aria-valuemax', '59');
                clockFace.setAttribute('aria-valuenow', clockState.minutes);
                clockFace.setAttribute('aria-valuetext', pad2(clockState.minutes));
            }
        }
    }

    function setHandRotation(hand, angle, animate, key) {
        if (!hand) return;
        const previous = lastHandAngles[key];
        const crossedTop = previous !== null && Math.abs(angle - previous) > 180;

        if (!animate || crossedTop) {
            clockFace.classList.add('no-hand-anim');
            hand.style.transform = 'rotate(' + angle + 'deg)';
            void hand.offsetWidth;
            clockFace.classList.remove('no-hand-anim');
        } else {
            hand.style.transform = 'rotate(' + angle + 'deg)';
        }
        lastHandAngles[key] = angle;
    }

    function applyClockDial(animate) {
        const doubleRing = clockState.is24 && get24DialStyle() === 'double';
        const hourAngle = (uses12HourDial() || doubleRing)
            ? (clockState.hours % 12) * 30
            : clockState.hours * 15;
        const minuteAngle = clockState.minutes * 6;

        setHandRotation(hourHand, hourAngle, animate, 'hour');
        setHandRotation(minuteHand, minuteAngle, animate, 'minute');

        if (hourHand) {
            hourHand.classList.toggle('active', clockState.mode === 'hour');
            hourHand.classList.toggle('is-inner', doubleRing && clockState.hours >= 12);
        }
        if (minuteHand) minuteHand.classList.toggle('active', clockState.mode === 'minute');
    }

    function setClockMode(mode) {
        if (!clockState.target || clockState.mode === mode) return;
        clockState.mode = mode;
        buildClockNumerals();
        updateClockReadout();
        applyClockDial(true);
    }

    function setClockFromAngle(angle, ring) {
        if (clockState.mode === 'minute') {
            clockState.minutes = Math.round(angle / 6) % 60;
        } else if (clockState.is24 && get24DialStyle() === 'double') {
            const base = Math.round(angle / 30) % 12;
            clockState.hours = ring === 'inner' ? base + 12 : base;
        } else if (uses12HourDial()) {
            let hour12 = Math.round(angle / 30) % 12;
            if (hour12 === 0) hour12 = 12;
            clockState.hours = (isPm(clockState.hours) ? 12 : 0) + (hour12 % 12);
        } else {
            clockState.hours = Math.round(angle / 15) % 24;
        }

        updateClockReadout();
        applyClockDial(true);
    }

    function adjustClockValue(delta) {
        if (!clockState.target) return;

        if (clockState.mode === 'minute') {
            clockState.minutes = ((clockState.minutes + delta) % 60 + 60) % 60;
        } else if (clockState.is24) {
            clockState.hours = ((clockState.hours + delta) % 24 + 24) % 24;
        } else {
            let hour12 = to12Hour(clockState.hours);
            hour12 = ((hour12 - 1 + delta) % 12 + 12) % 12 + 1;
            clockState.hours = (isPm(clockState.hours) ? 12 : 0) + (hour12 % 12);
        }

        updateClockReadout();
        applyClockDial(true);
    }

    function stopClockTyping() {
        if (clockTyping.resetTimer) {
            clearTimeout(clockTyping.resetTimer);
            clockTyping.resetTimer = null;
        }
        clockTyping.part = null;
        clockTyping.buffer = '';
        if (hourBtn) hourBtn.classList.remove('is-typing');
        if (minuteBtn) minuteBtn.classList.remove('is-typing');
    }

    function startClockTyping(part) {
        if (clockTyping.resetTimer) {
            clearTimeout(clockTyping.resetTimer);
            clockTyping.resetTimer = null;
        }
        clockTyping.part = part;
        clockTyping.buffer = '';
        if (hourBtn) hourBtn.classList.toggle('is-typing', part === 'hour');
        if (minuteBtn) minuteBtn.classList.toggle('is-typing', part === 'minute');
    }

    function applyTypedValue(part, value) {
        if (part === 'hour') {
            if (clockState.is24 || value > 12) {
                clockState.hours = Math.min(23, Math.max(0, value));
            } else if (value === 0) {
                clockState.hours = 0;
            } else {
                clockState.hours = (isPm(clockState.hours) ? 12 : 0) + (value % 12);
            }
        } else {
            clockState.minutes = Math.min(59, Math.max(0, value));
        }

        updateClockReadout();
        applyClockDial(true);
    }

    function applyTypedDigit(part, digit) {
        if (!clockState.target) return;
        if (clockTyping.part !== part) startClockTyping(part);
        if (clockTyping.resetTimer) {
            clearTimeout(clockTyping.resetTimer);
            clockTyping.resetTimer = null;
        }

        const max = part === 'hour' ? 23 : 59;
        const maxFirstDigit = part === 'hour' ? 2 : 5;
        let buffer = clockTyping.buffer + digit;
        let value = parseInt(buffer, 10);

        if (buffer.length > 1 && value > max) {
            buffer = digit;
            value = parseInt(digit, 10);
        }
        if (buffer.length === 1 && value > maxFirstDigit) {
            buffer = '';
        }
        if (buffer.length >= 2) {
            buffer = '';
        }

        clockTyping.buffer = buffer;
        clockTyping.resetTimer = setTimeout(() => {
            clockTyping.buffer = '';
            clockTyping.resetTimer = null;
        }, 900);

        applyTypedValue(part, value);
    }

    function handleReadoutKeydown(event, part) {
        if (event.key.length === 1 && event.key >= '0' && event.key <= '9') {
            event.preventDefault();
            applyTypedDigit(part, event.key);
            return;
        }

        if (event.key === 'Backspace' || event.key === 'Delete') {
            event.preventDefault();
            clockTyping.buffer = '';
            return;
        }

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            clockTyping.buffer = '';
            if (clockState.mode !== part) setClockMode(part);
            adjustClockValue(event.key === 'ArrowUp' ? 1 : -1);
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            stopClockTyping();
            closeClockPicker(true);
            return;
        }

        if ((event.key === ':' || event.key === ';') && part === 'hour') {
            event.preventDefault();
            if (minuteBtn) minuteBtn.focus({ preventScroll: true });
        }
    }

    function getClockPointer(event) {
        const rect = clockFace.getBoundingClientRect();
        const dx = event.clientX - (rect.left + rect.width / 2);
        const dy = event.clientY - (rect.top + rect.height / 2);
        const radius = Math.hypot(dx, dy);
        if (radius < 14) return null;
        let angle = Math.atan2(dx, -dy) * 180 / Math.PI;
        if (angle < 0) angle += 360;
        return { angle, radius };
    }

    function openClockPicker(stateEl, titleKey) {
        if (!clockOverlay || !stateEl) return;

        if (clockCloseTimer) {
            clearTimeout(clockCloseTimer);
            clockCloseTimer = null;
        }
        if (clockFocusTimer) {
            clearTimeout(clockFocusTimer);
            clockFocusTimer = null;
        }

        clockState.target = stateEl;
        clockState.titleKey = titleKey;
        clockState.is24 = detect24HourClock();

        const parsed = parseTimeValue(readTimeState(stateEl, '19:00'));
        clockState.hours = parsed.hours;
        clockState.minutes = parsed.minutes;
        clockState.mode = 'hour';
        clockState.dragging = false;
        lastHandAngles.hour = null;
        lastHandAngles.minute = null;
        clockFocusBeforeOpen = document.activeElement;

        stopClockTyping();
        localizeClockPicker();
        if (clockTitle) applyClockTitle();

        clockOverlay.classList.remove('closing');
        clockOverlay.classList.add('open');
        clockOverlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('clock-open');

        buildClockNumerals();
        updateClockReadout();
        applyClockDial(false);

        requestAnimationFrame(() => {
            if (clockState.target) clockFace.focus({ preventScroll: true, focusVisible: false });
        });
    }

    function closeClockPicker(commit) {
        if (!clockState.target) return;
        const target = clockState.target;

        if (commit) {
            writeTimeState(target, pad2(clockState.hours) + ':' + pad2(clockState.minutes));
            syncTimeDisplays();
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
        }

        clockState.target = null;
        clockState.dragging = false;
        stopClockTyping();
        clockOverlay.classList.remove('open');
        clockOverlay.classList.add('closing');
        clockOverlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('clock-open');

        if (clockCloseTimer) clearTimeout(clockCloseTimer);
        clockCloseTimer = setTimeout(() => {
            clockOverlay.classList.remove('closing');
            clockCloseTimer = null;
        }, 210);

        const focusTarget = clockFocusBeforeOpen;
        clockFocusBeforeOpen = null;
        if (focusTarget && typeof focusTarget.focus === 'function') {
            if (clockFocusTimer) clearTimeout(clockFocusTimer);
            clockFocusTimer = setTimeout(() => {
                clockFocusTimer = null;
                try {
                    focusTarget.focus({ preventScroll: true });
                } catch (e) { /* ignore */ }
            }, 210);
        }
    }

    if (timeStartField) {
        timeStartField.addEventListener('click', () => openClockPicker(timeStart, 'lblStartTime'));
    }
    if (timeEndField) {
        timeEndField.addEventListener('click', () => openClockPicker(timeEnd, 'lblEndTime'));
    }
    if (hourBtn) {
        hourBtn.addEventListener('focus', () => {
            if (!clockState.target) return;
            setClockMode('hour');
            startClockTyping('hour');
        });
        hourBtn.addEventListener('blur', stopClockTyping);
        hourBtn.addEventListener('click', () => {
            if (!clockState.target) return;
            setClockMode('hour');
            if (document.activeElement !== hourBtn) hourBtn.focus({ preventScroll: true });
        });
        hourBtn.addEventListener('keydown', (e) => handleReadoutKeydown(e, 'hour'));
    }
    if (minuteBtn) {
        minuteBtn.addEventListener('focus', () => {
            if (!clockState.target) return;
            setClockMode('minute');
            startClockTyping('minute');
        });
        minuteBtn.addEventListener('blur', stopClockTyping);
        minuteBtn.addEventListener('click', () => {
            if (!clockState.target) return;
            setClockMode('minute');
            if (document.activeElement !== minuteBtn) minuteBtn.focus({ preventScroll: true });
        });
        minuteBtn.addEventListener('keydown', (e) => handleReadoutKeydown(e, 'minute'));
    }

    if (periodControl) {
        periodControl.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-clock-period]');
            if (!btn || !clockState.target) return;
            const pm = btn.dataset.clockPeriod === 'PM';
            clockState.hours = (pm ? 12 : 0) + (to12Hour(clockState.hours) % 12);
            updateClockReadout();
            applyClockDial(true);
        });
    }

    if (clockFace) {
        clockFace.addEventListener('pointerdown', (e) => {
            if (e.button !== undefined && e.button !== 0) return;
            const pointer = getClockPointer(e);
            if (!pointer) return;
            clockState.dragging = true;
            clockState.dragRing = null;
            if (clockState.is24 && get24DialStyle() === 'double') {
                clockState.dragRing = pointer.radius < 67 ? 'inner' : 'outer';
            }
            clockFace.classList.add('dragging');
            if (clockFace.setPointerCapture) {
                try {
                    clockFace.setPointerCapture(e.pointerId);
                } catch (err) { /* synthetic or inactive pointer */ }
            }
            setClockFromAngle(pointer.angle, clockState.dragRing);
            e.preventDefault();
        });

        clockFace.addEventListener('pointermove', (e) => {
            if (!clockState.dragging) return;
            const pointer = getClockPointer(e);
            if (pointer) setClockFromAngle(pointer.angle, clockState.dragRing);
            e.preventDefault();
        });

        const endClockDrag = (e) => {
            if (!clockState.dragging) return;
            clockState.dragging = false;
            clockState.dragRing = null;
            clockFace.classList.remove('dragging');
            if (clockFace.hasPointerCapture && clockFace.hasPointerCapture(e.pointerId)) {
                try {
                    clockFace.releasePointerCapture(e.pointerId);
                } catch (err) { /* ignore */ }
            }
        };
        clockFace.addEventListener('pointerup', endClockDrag);
        clockFace.addEventListener('pointercancel', endClockDrag);

        clockFace.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
                adjustClockValue(e.shiftKey ? 5 : 1);
                e.preventDefault();
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
                adjustClockValue(e.shiftKey ? -5 : -1);
                e.preventDefault();
            }
        });
    }

    if (clockDone) {
        clockDone.addEventListener('click', () => closeClockPicker(true));
    }
    if (clockCancel) {
        clockCancel.addEventListener('click', () => closeClockPicker(false));
    }
    if (clockOverlay) {
        clockOverlay.addEventListener('click', (e) => {
            if (e.target === clockOverlay) closeClockPicker(false);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (!clockState.target) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            closeClockPicker(false);
            return;
        }

        if (e.key === 'Tab') {
            const focusables = clockOverlay.querySelectorAll('button, [tabindex]:not([tabindex="-1"])');
            if (!focusables.length) return;
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    });

    // === Listeners ===
    tabs.forEach(tab => {
        tab.addEventListener('click', () => toggleTab(tab.dataset.tab));
    });

    siteSubTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            toggleSubTab(tab.dataset.mode);
        });
    });

    // Inputs
    [globalToggle, brightness, contrast, sepia, grayscale, smartImages, visualProtection, dynamicDetection, performanceMode, enableFonts, fontFamily, fontWeight, autoMode, timeStart, timeEnd, enablePdf].filter(Boolean).forEach(el => {
        el.addEventListener('input', () => {
            broadcastSettings();
        });
        el.addEventListener('change', () => {
            broadcastSettings();
        });
    });

    // Site List specific
    const manualSiteInput = document.getElementById('manualSiteInput');
    const manualSiteAdd = document.getElementById('manualSiteAdd');

    function cleanDomain(url) {
        try {
            if (!url.match(/^https?:\/\//)) {
                url = 'http://' + url;
            }
            return new URL(url).hostname;
        } catch (e) {
            return null;
        }
    }

    manualSiteAdd.addEventListener('click', () => {
        const input = manualSiteInput.value.trim();
        if (!input) return;

        const domain = cleanDomain(input);
        if (domain) {
            addDomain(domain);
            manualSiteInput.value = '';
        } else {
            manualSiteInput.style.borderColor = 'red';
            setTimeout(() => manualSiteInput.style.borderColor = '#ccc', 1000);
        }
    });

    manualSiteInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') manualSiteAdd.click();
    });

    addCurrentSite.addEventListener('click', () => {
        if (currentHostname) addDomain(currentHostname);
    });

    // Legacy Toggle (Quick Action)
    siteToggle.addEventListener('change', () => {
        if (!currentSettings) return;
        const disabled = siteToggle.checked;
        const mode = currentSettings.siteList.mode;
        const domain = currentHostname;

        if (mode === 'blacklist') {
            if (disabled) {
                if (!currentSettings.siteList.blacklist.includes(domain)) currentSettings.siteList.blacklist.push(domain);
            } else {
                currentSettings.siteList.blacklist = currentSettings.siteList.blacklist.filter(d => d !== domain);
            }
        } else {
            if (disabled) {
                currentSettings.siteList.whitelist = currentSettings.siteList.whitelist.filter(d => d !== domain);
            } else {
                if (!currentSettings.siteList.whitelist.includes(domain)) currentSettings.siteList.whitelist.push(domain);
            }
        }
        broadcastSettings();
        renderSiteList();
    });

    // Global Key Listener for Popup
    window.addEventListener('keydown', (e) => {
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable) return;

        if (!currentSettings) return;

        // Check for MAIN shortcut
        if (currentSettings.shortcut) {
            const s = currentSettings.shortcut;
            const codeMatch = s.code ? (e.code === s.code) : (e.key.toLowerCase() === s.key);

            if (e.metaKey === s.metaKey && e.ctrlKey === s.ctrlKey && e.altKey === s.altKey && e.shiftKey === s.shiftKey && codeMatch) {
                e.preventDefault();
                currentSettings.automation.mode = 'manual';
                currentSettings.enabled = !currentSettings.enabled;

                globalToggle.checked = currentSettings.enabled;
                autoMode.value = 'manual';

                broadcastSettings();
                return;
            }
        }

        // Check for SITE toggle shortcut
        if (currentSettings.shortcutSite) {
            const s = currentSettings.shortcutSite;
            const codeMatch = s.code ? (e.code === s.code) : (e.key.toLowerCase() === s.key);

            if (e.metaKey === s.metaKey && e.ctrlKey === s.ctrlKey && e.altKey === s.altKey && e.shiftKey === s.shiftKey && codeMatch) {
                e.preventDefault();
                const domain = currentHostname;
                if (!domain) return;

                const mode = currentSettings.siteList.mode;
                const list = mode === 'blacklist' ? currentSettings.siteList.blacklist : currentSettings.siteList.whitelist;

                if (list.includes(domain)) {
                    if (mode === 'blacklist') {
                        currentSettings.siteList.blacklist = list.filter(d => d !== domain);
                    } else {
                        currentSettings.siteList.whitelist = list.filter(d => d !== domain);
                    }
                } else {
                    if (mode === 'blacklist') {
                        currentSettings.siteList.blacklist.push(domain);
                    } else {
                        currentSettings.siteList.whitelist.push(domain);
                    }
                }

                renderSiteList();
                updateSiteToggleState();
                broadcastSettings();
                return;
            }
        }
    });

    const shortcutWarning = document.getElementById('shortcutWarning');
    let shortcutWarningTimeout;
    function showShortcutWarning() {
        shortcutWarning.style.display = 'block';
        clearTimeout(shortcutWarningTimeout);
        shortcutWarningTimeout = setTimeout(() => {
            shortcutWarning.style.display = 'none';
        }, 3000);
    }
    
    function isShortcutSame(s1, s2) {
        if (!s1 || !s2) return false;
        return s1.key === s2.key && s1.ctrlKey === s2.ctrlKey && s1.shiftKey === s2.shiftKey && s1.altKey === s2.altKey && s1.metaKey === s2.metaKey;
    }

    // Shortcut Recording (Main)
    shortcutInput.addEventListener('keydown', (e) => {
        e.preventDefault();
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
        
        const newShortcut = {
            key: e.key.toLowerCase(),
            code: e.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        };
        
        if (isShortcutSame(newShortcut, currentSettings.shortcutSite)) {
            showShortcutWarning();
            return;
        }
        
        shortcutWarning.style.display = 'none';
        currentSettings.shortcut = newShortcut;
        broadcastSettings();
    });
    shortcutInput.addEventListener('focus', () => { shortcutInput.value = getMessage("shortcutPressKeys"); });
    shortcutInput.addEventListener('blur', () => { shortcutInput.value = formatShortcut(currentSettings.shortcut); });
    clearShortcut.addEventListener('click', () => {
        currentSettings.shortcut = null;
        broadcastSettings();
    });

    // Shortcut Recording (Site)
    shortcutInputSite.addEventListener('keydown', (e) => {
        e.preventDefault();
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
        
        const newShortcut = {
            key: e.key.toLowerCase(),
            code: e.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        };
        
        if (isShortcutSame(newShortcut, currentSettings.shortcut)) {
            showShortcutWarning();
            return;
        }
        
        shortcutWarning.style.display = 'none';
        currentSettings.shortcutSite = newShortcut;
        broadcastSettings();
    });
    shortcutInputSite.addEventListener('focus', () => { shortcutInputSite.value = getMessage("shortcutPressKeys"); });
    shortcutInputSite.addEventListener('blur', () => { shortcutInputSite.value = formatShortcut(currentSettings.shortcutSite); });
    clearShortcutSite.addEventListener('click', () => {
        currentSettings.shortcutSite = null;
        broadcastSettings();
    });

    // Init
    syncTimeDisplays();
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0] && tabs[0].url) {
            try {
                currentHostname = new URL(tabs[0].url).hostname;
                siteDomainSpan.textContent = currentHostname;
                currentSiteName.textContent = currentHostname;
            } catch (e) {
                siteToggle.disabled = true;
                addCurrentSite.disabled = true;
            }
        }
        loadSettings();
    });
});
