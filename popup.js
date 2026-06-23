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
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.self !== window.top);
    if (isMobile) {
        const keysTabBtn = document.querySelector('.tab[data-tab="keys"]');
        if (keysTabBtn) keysTabBtn.style.display = 'none';
    }

    let currentHostname = '';
    let currentSettings = null;
    let customMessages = null;

    // === Settings UI ===
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const settingsOverlay = document.getElementById('settingsOverlay');
    const settingsTabs = document.querySelectorAll('.settings-tab');
    const settingsPanels = document.querySelectorAll('.settings-panel');
    const languageSelect = document.getElementById('languageSelect');
    const appVersion = document.getElementById('appVersion');

    if (appVersion) {
        appVersion.textContent = browser.runtime.getManifest().version;
    }

    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', () => {
            settingsOverlay.style.display = 'flex';
            document.body.classList.add('settings-open');
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
            settingsTabs.forEach(t => t.classList.remove('active'));
            settingsPanels.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            const target = tab.getAttribute('data-stabs');
            const panel = document.getElementById('panel-' + target);
            if (panel) panel.classList.add('active');
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

    function formatShortcut(shortcut) {
        if (!shortcut || !shortcut.key) return getMessage("shortcutNone");
        const parts = [];

        // Mac symbols
        if (shortcut.metaKey) parts.push('⌘');
        if (shortcut.ctrlKey) parts.push('⌃');
        if (shortcut.altKey) parts.push('⌥');
        if (shortcut.shiftKey) parts.push('⇧');

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
        return parts.join('');
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
                startTime: timeStart.value,
                endTime: timeEnd.value
            },
            language: languageSelect ? languageSelect.value : 'system',
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
            if (!s.language) s.language = 'system';

            currentSettings = s;
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

            // Auto
            autoMode.value = s.automation.mode || 'manual';
            timeStart.value = s.automation.startTime || '19:00';
            timeEnd.value = s.automation.endTime || '07:00';
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
    [globalToggle, brightness, contrast, sepia, grayscale, smartImages, visualProtection, dynamicDetection, performanceMode, enableFonts, fontFamily, fontWeight, autoMode, timeStart, timeEnd].forEach(el => {
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

    // Shortcut Recording (Main)
    shortcutInput.addEventListener('keydown', (e) => {
        e.preventDefault();
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
        currentSettings.shortcut = {
            key: e.key.toLowerCase(),
            code: e.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        };
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
        currentSettings.shortcutSite = {
            key: e.key.toLowerCase(),
            code: e.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey,
            metaKey: e.metaKey
        };
        broadcastSettings();
    });
    shortcutInputSite.addEventListener('focus', () => { shortcutInputSite.value = getMessage("shortcutPressKeys"); });
    shortcutInputSite.addEventListener('blur', () => { shortcutInputSite.value = formatShortcut(currentSettings.shortcutSite); });
    clearShortcutSite.addEventListener('click', () => {
        currentSettings.shortcutSite = null;
        broadcastSettings();
    });

    // Init
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
