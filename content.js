globalThis.browser = globalThis.browser || globalThis.chrome;

(function () {
    const STYLE_ID = 'safari-dark-mode-style';
    const TYPO_ID = 'safari-dark-mode-typo';

    // Default Settings
    let currentSettings = {
        enabled: false,
        brightness: 100,
        contrast: 100,
        sepia: 0,
        grayscale: 0,
        smartImages: true,
        visualProtection: false, // Visual protection: preserve image/media colors
        dynamicDetection: false, // Dynamic detection: monitor CSS changes for SPAs
        fontEnabled: false,
        fontFamily: 'system',
        fontWeight: 0,
        automation: { mode: 'manual', startTime: '19:00', endTime: '07:00' },
        shortcut: null,
        shortcutSite: null,
        siteList: { mode: 'blacklist', blacklist: [], whitelist: [] },
        performanceMode: false, // Performance mode: minimal DOM changes, lower power consumption
        enablePdf: false
    };

    let timeCheckInterval = null;

    function isPageDark() {
        try {
            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;

            function getBrightness(color) {
                if (!color) return 255;
                const rgb = color.match(/\d+/g);
                if (!rgb) return 255;
                if (rgb.length >= 3) {
                    return (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                }
                return 255;
            }

            let brightness = getBrightness(bodyBg);
            if (bodyBg === 'rgba(0, 0, 0, 0)' || bodyBg === 'transparent') {
                brightness = getBrightness(htmlBg);
                if (htmlBg === 'rgba(0, 0, 0, 0)' || htmlBg === 'transparent') {
                    brightness = 255;
                }
            }

            // Fast check for common dark mode data attributes and classes
            const isDarkThemeTheme = document.documentElement.classList.contains('theme-dark') ||
                document.body.classList.contains('theme-dark') ||
                (document.body.getAttribute('data-theme') || '').toLowerCase().includes('dark') ||
                (document.documentElement.getAttribute('data-theme') || '').toLowerCase().includes('dark');

            if (isDarkThemeTheme) {
                return true;
            }

            // For Gmail and Outlook, the background might be set on a specific container rather than body/html
            const hostname = window.location.hostname;
            if (hostname.includes('mail.google.com') || hostname.includes('outlook.com')) {
                const containers = [
                    document.querySelector('.nH'),
                    document.querySelector('.wl'),
                    document.getElementById('app'),
                    document.getElementById('root'),
                    document.getElementById('owa-root'),
                    document.querySelector('.ms-Fabric'),
                    document.querySelector('[data-app-section="MainContainer"]')
                ];

                // Also check large top-level divs that likely serve as app containers
                if (document.body && document.body.children) {
                    for (let i = 0; i < Math.min(10, document.body.children.length); i++) {
                        const child = document.body.children[i];
                        if (child.tagName === 'DIV' && child.clientHeight > window.innerHeight * 0.5) {
                            containers.push(child);
                        }
                    }
                }

                for (const container of containers) {
                    if (container) {
                        const bg = window.getComputedStyle(container).backgroundColor;
                        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
                            const containerBrightness = getBrightness(bg);
                            if (containerBrightness < 100) {
                                return true;
                            }
                        }
                    }
                }
            }

            return brightness < 100;
        } catch (e) {
            return false;
        }
    }

    function checkTimeRange(startStr, endStr) {
        if (!startStr || !endStr) return false;

        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();

        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        const startMins = sh * 60 + sm;
        const endMins = eh * 60 + em;

        if (startMins < endMins) {
            return currentMins >= startMins && currentMins < endMins;
        } else {
            return currentMins >= startMins || currentMins < endMins;
        }
    }

    function isSiteAllowed() {
        const domain = window.location.hostname;
        const mode = currentSettings.siteList ? currentSettings.siteList.mode : 'blacklist';
        // Defaults
        const blacklist = currentSettings.siteList ? currentSettings.siteList.blacklist : [];
        const whitelist = currentSettings.siteList ? currentSettings.siteList.whitelist : [];

        // Hardcoded domains that are known to have issues (like inverted colors on login)
        // Gmail and Outlook are handled dynamically by isPageDark()
        const hardcodedBlacklist = [];
        if (hardcodedBlacklist.some(d => domain.includes(d))) {
            return false;
        }

        if (mode === 'blacklist') {
            // Allowed if NOT in blacklist
            return !blacklist.includes(domain);
        } else {
            // Allowed ONLY if in whitelist
            return whitelist.includes(domain);
        }
    }

    function isPdfPage() {
        try {
            if (document.contentType === 'application/pdf') return true;
            const path = window.location.pathname.toLowerCase();
            if (path.endsWith('.pdf')) return true;
            const cleanUrl = window.location.href.split('?')[0].split('#')[0].toLowerCase();
            if (cleanUrl.endsWith('.pdf')) return true;
            if (document.querySelector('embed[type="application/pdf"], embed[type*="pdf"], pdf-viewer, #viewerContainer.pdfViewer, #viewer.pdfViewer')) {
                return true;
            }
        } catch (e) {}
        return false;
    }

    function shouldBeActive() {
        // First check if PDF document and if PDF dark mode is disabled
        if (isPdfPage() && !currentSettings.enablePdf) {
            return false;
        }

        // First check site lists
        if (!isSiteAllowed()) return false;

        const mode = currentSettings.automation ? currentSettings.automation.mode : 'manual';

        if (mode === 'system') {
            return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        } else if (mode === 'time') {
            return checkTimeRange(currentSettings.automation.startTime, currentSettings.automation.endTime);
        } else {
            return currentSettings.enabled;
        }
    }

    /**
     * SMART COLOR PROTECTION ENGINE
     * Automatically detects vibrant/saturated elements (banners, buttons, etc.) 
     * and marks them for counter-inversion to preserve original branding.
     */
    function applySmartProtection(root = document) {
        if (isPdfPage()) return;
        if (!shouldBeActive() || isPageDark()) return;

        // Skip smart protection in performance mode to reduce DOM manipulation
        if (currentSettings.performanceMode) return;

        // Target only probable candidates: semantic tags or elements with icon-like classes
        const elements = root.querySelectorAll ? root.querySelectorAll('i, svg, button, a.btn, .btn, .button, [role="img"], [role="button"], .icon, [class*="icon-"], [class*="fa-"]') : [];

        elements.forEach(el => {
            if (el.hasAttribute('data-dm-protected')) return;

            const style = window.getComputedStyle(el);
            const color = style.color;
            const bg = style.backgroundColor;
            const fill = style.fill;

            function isVibrant(colorStr, threshold = 15) {
                if (!colorStr || colorStr === 'transparent' || colorStr.includes('rgba(0, 0, 0, 0)')) return false;
                if (colorStr.includes('url(')) return true; // SVG gradients
                const rgb = colorStr.match(/\d+/g);
                if (rgb && rgb.length >= 3) {
                    const r = +rgb[0], g = +rgb[1], b = +rgb[2];
                    const delta = Math.max(r, g, b) - Math.min(r, g, b);
                    return delta > threshold;
                }
                return false;
            }

            // If it has a meaningful color, protect it
            if (isVibrant(color) || isVibrant(bg) || isVibrant(fill)) {
                el.setAttribute('data-dm-protected', 'true');
            } else {
                // Not vibrant, but mark it so we don't re-check
                el.setAttribute('data-dm-protected', 'checked');
            }
        });
    }


    let protectionObserver = null;
    let lazyObserver = null; // For performance mode lazy loading
    let dynamicObserver = null; // For dynamic CSS detection in SPAs

    /**
     * DYNAMIC CONTENT DETECTION
     * Monitors CSS changes in SPAs (React, Vue, Angular, etc.)
     * Re-checks page darkness when styles change dynamically
     */
    function setupDynamicDetection() {
        // Clean up existing observer
        if (dynamicObserver) {
            dynamicObserver.disconnect();
            dynamicObserver = null;
        }

        // Skip if disabled or in performance mode
        if (!currentSettings.dynamicDetection || currentSettings.performanceMode) {
            return;
        }

        // Monitor style and class changes
        dynamicObserver = new MutationObserver((mutations) => {
            let hasStyleChange = false;

            for (const mutation of mutations) {
                // Check for style attribute changes
                if (mutation.type === 'attributes' &&
                    (mutation.attributeName === 'style' ||
                        mutation.attributeName === 'class')) {

                    // Only care about body/html changes
                    if (mutation.target === document.body ||
                        mutation.target === document.documentElement) {
                        hasStyleChange = true;
                        break;
                    }
                }

                // Check for added/removed style elements
                if (mutation.type === 'childList' && mutation.target === document.head) {
                    for (const node of mutation.addedNodes) {
                        if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
                            hasStyleChange = true;
                            break;
                        }
                    }
                }
            }

            if (hasStyleChange) {
                // Debounce re-check
                clearTimeout(window.__dmDynamicTimeout);
                window.__dmDynamicTimeout = setTimeout(() => {
                    // Re-check if page is dark and update accordingly
                    updateStyles();
                }, 300);
            }
        });

        // Observe both head (for style tags) and body (for inline styles)
        dynamicObserver.observe(document.head, {
            childList: true,
            subtree: false
        });

        dynamicObserver.observe(document.body, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: false
        });

        dynamicObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['style', 'class'],
            subtree: false
        });
    }

    function setupProtection() {
        if (!shouldBeActive() || isPageDark()) {
            if (protectionObserver) {
                protectionObserver.disconnect();
                protectionObserver = null;
            }
            if (lazyObserver) {
                lazyObserver.disconnect();
                lazyObserver = null;
            }
            return;
        }

        // In performance mode, skip all protection observers
        if (currentSettings.performanceMode) {
            if (protectionObserver) {
                protectionObserver.disconnect();
                protectionObserver = null;
            }
            if (lazyObserver) {
                lazyObserver.disconnect();
                lazyObserver = null;
            }
            return;
        }

        applySmartProtection();
        if (protectionObserver) return;

        protectionObserver = new MutationObserver((mutations) => {
            let shouldScan = false;
            for (const m of mutations) {
                if (m.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }
            if (shouldScan) {
                clearTimeout(window.__dmScanTimeout);
                window.__dmScanTimeout = setTimeout(() => applySmartProtection(), 500);
            }
        });

        protectionObserver.observe(document.body, { childList: true, subtree: true });
    }

    function updateStyles() {
        const style = document.getElementById(STYLE_ID);
        const typo = document.getElementById(TYPO_ID);

        const active = shouldBeActive();

        if (!active) {
            if (style) style.remove();
            if (typo) typo.remove();
            // Clean up any SVG logo adaptations when extension is inactive
            cleanupSvgLogoAdaptations();
            return;
        }

        if (isPageDark() && !isPdfPage()) {
            if (style) style.remove();
            if (typo) typo.remove();
            // Clean up any SVG logo adaptations when page is already dark
            cleanupSvgLogoAdaptations();
            return;
        }

        // === 1. Main Inversion & Visuals ===
        if (!style) {
            const s = document.createElement('style');
            s.id = STYLE_ID;
            (document.head || document.documentElement).appendChild(s);
        }
        const styleEl = document.getElementById(STYLE_ID);

        const url = window.location.href;

        // Visual Protection Mode: Different handling for media elements
        let mediaSelector = 'img, video, iframe, canvas, :not(object):not(body) > embed, object, img[role="img"], .emoji, img[src*="emoji"], [aria-label*="emoji"]';
        
        // Google Docs specific overrides: 
        // Docs uses canvas and iframes for its main document area, so we don't want to counter-invert them (we want them to become dark).
        // Instead, we counter-invert SVG because Docs uses SVG for toolbar icons.
        if (url.includes('docs.google.com')) {
            mediaSelector = 'img, video, svg, :not(object):not(body) > embed, object, img[role="img"], .emoji, img[src*="emoji"], [aria-label*="emoji"]';
        } else if (isPdfPage()) {
            // In PDF documents, canvas (PDF.js) and embeds (Chrome PDF viewer) render document pages.
            // Do not counter-invert them so they remain dark.
            mediaSelector = 'img:not(.pdfViewer img), video';
        }

        let exceptionsSelector = '';

        if (currentSettings.visualProtection) {
            // Only protect dynamic elements, not media for the default exception selector
            exceptionsSelector = '[data-dm-protected="true"]';
        } else {
            // Default exceptions (images, videos, and dynamic protected elements)
            exceptionsSelector = `${mediaSelector}, [data-dm-protected="true"]`;
        }

        const b = currentSettings.brightness;
        const c = currentSettings.contrast;
        const s = currentSettings.sepia;
        const g = currentSettings.grayscale || 0;

        const filterString = `invert(1) hue-rotate(180deg) brightness(${b}%) contrast(${c}%) sepia(${s}%) grayscale(${g}%)`;

        // Counter filter must perfectly undo the global filter for protected elements
        const exB = b > 0 ? (10000 / b) : 100;
        const exC = c > 0 ? (10000 / c) : 100;
        const exceptionFilter = `grayscale(0%) sepia(0%) contrast(${exC}%) brightness(${exB}%) hue-rotate(180deg) invert(1)`;

        let mediaProtectionRules = '';
        if (currentSettings.visualProtection) {
            // Smart darkening for media without color distortion
            mediaProtectionRules = `
                ${mediaSelector} {
                    filter: ${exceptionFilter} brightness(0.8) contrast(1.1) !important;
                }
            `;
        }

        let pdfSpecificRules = '';
        if (isPdfPage()) {
            pdfSpecificRules = `
                body, embed[type="application/pdf"], embed[type*="pdf"] {
                    background-color: #ededed !important;
                }
            `;
        }

        let imageRules = '';
        if (currentSettings.smartImages) {
            imageRules = `
                img, iframe {
                    opacity: 0.7 !important;
                    transition: opacity 0.3s ease !important;
                }
                img:hover, iframe:hover {
                    opacity: 1 !important;
                }
            `;
        }

        styleEl.textContent = `
            html {
                filter: ${filterString} !important;
                background-color: #ededed !important; /* Inverts to #121212 (Standard Dark Gray) */
                margin: 0 !important;
                min-height: 100vh !important;
                color-scheme: white !important;
            }
            ${exceptionsSelector ? `${exceptionsSelector} {
                filter: ${exceptionFilter} !important;
            }` : ''}
            ${mediaProtectionRules}
            ${pdfSpecificRules}
            /* Optimized Protection for Icons and Vibrant Elements */
            [data-dm-protected="true"] {
                filter: ${exceptionFilter} contrast(1.1) brightness(1.1) !important;
            }
            /* Prominence boost for actual icons (SVGs and FontAwesome) */
            i[data-dm-protected="true"], svg[data-dm-protected="true"], [role="img"][data-dm-protected="true"], .icon[data-dm-protected="true"] {
                filter: ${exceptionFilter} contrast(1.15) saturate(1.2) !important;
                display: inline-block !important;
            }
            /* Prevent double-inversion for media and nested protected blocks */
            [data-dm-protected="true"] img, 
            [data-dm-protected="true"] video, 
            [data-dm-protected="true"] iframe,
            [data-dm-protected="true"] canvas,
            [data-dm-protected="true"] svg:not([data-dm-protected="true"]),
            [data-dm-protected="true"] [data-dm-protected="true"] {
                filter: none !important;
            }
            /* Dark-mode aware logo colors via CSS custom properties */
            :root {
                --dm-logo-color-light: #111111;
                --dm-logo-color-dark: #FAFAFA;
                --dm-logo-color: var(--dm-logo-color-dark);
            }
            @media (prefers-color-scheme: light) {
                :root { --dm-logo-color: var(--dm-logo-color-light); }
            }
            /* CSS-based approach: turn monochrome logo shapes to currentColor */
            svg[data-dm-logo="css"] :is(path, rect, circle, polygon, polyline, ellipse, line, text) {
                fill: currentColor !important;
                stroke: currentColor !important;
            }
            /* Apply color from custom property; element itself is counter-inverted for fidelity */
            svg[data-dm-logo="css"] {
                color: var(--dm-logo-color) !important;
            }
            ${imageRules}
        `;

        setupProtection();
        setupDynamicDetection(); // Monitor CSS changes for SPAs
        // Adapt SVG logos for dark backgrounds
        adaptSvgLogos();


        // === 2. Typography ===
        if (currentSettings.fontEnabled) {
            if (!document.getElementById(TYPO_ID)) {
                const t = document.createElement('style');
                t.id = TYPO_ID;
                (document.head || document.documentElement).appendChild(t);
            }
            const typoEl = document.getElementById(TYPO_ID);

            let css = '';

            if (currentSettings.fontFamily !== 'system') {
                if (currentSettings.fontFamily === 'opendyslexic') {
                    css += 'font-family: "OpenDyslexic", "Comic Sans MS", "Chalkboard SE", sans-serif !important;';
                } else {
                    css += `font-family: ${currentSettings.fontFamily} !important;`;
                }
            }

            if (currentSettings.fontWeight > 0) {
                const w = currentSettings.fontWeight === 1 ? 500 : 700;
                css += `font-weight: ${w} !important;`;
            }

            css += 'line-height: 1.6 !important; letter-spacing: 0.5px !important;';

            typoEl.textContent = `
                * {
                    ${css}
                }
            `;
        } else {
            if (document.getElementById(TYPO_ID)) {
                document.getElementById(TYPO_ID).remove();
            }
        }
    }

    /**
     * SVG Logo Adaptation
     * Detects likely logo SVGs and ensures sufficient contrast in dark mode by
     * converting shapes to currentColor and assigning an accessible color.
     * Two strategies are supported:
     *  - CSS-based: mark elements with data-dm-logo="css" and use global CSS rules.
     *  - Inline: inject <style> into <svg> to force shapes to use currentColor.
     */
    function adaptSvgLogos(root = document) {
        if (!shouldBeActive() || isPageDark()) return;
        if (currentSettings.performanceMode) return;

        const candidates = root.querySelectorAll([
            'svg[class*="logo" i]',
            '[class*="logo" i] svg',
            'svg[aria-label*="logo" i]',
            'svg[title*="logo" i]',
            'header svg',
            'nav svg',
            'a[href*="home" i] svg',
            '.site-logo svg'
        ].join(','));

        let count = 0;
        candidates.forEach(svg => {
            if (!(svg instanceof SVGElement)) return;
            if (svg.hasAttribute('data-dm-logo-processed')) return;
            if (count > 24) return; // Limit work per pass

            svg.setAttribute('data-dm-logo-processed', '1');

            // Decide strategy: prefer CSS-based for simple/monochrome icons, otherwise inline
            const mono = isSvgMonochrome(svg);
            const strategy = mono ? 'css' : 'inline';

            // Compute background and choose a high-contrast color
            const bg = getEffectiveBackgroundColor(svg) || 'rgb(18, 18, 18)'; // ~#121212
            const desired = chooseAccessibleForeground(bg);

            // Protect from global inversion so chosen color is not inverted
            svg.setAttribute('data-dm-protected', 'true');
            svg.setAttribute('data-dm-logo', strategy);

            if (strategy === 'css') {
                // Use CSS-based approach: color via style attr, shapes via stylesheet rules
                svg.style.setProperty('color', desired, 'important');
            } else {
                // Inline approach: inject style to force shapes to use currentColor
                ensureInlineCurrentColor(svg);
                svg.style.setProperty('color', desired, 'important');
            }

            // Optional: log contrast for diagnostics
            const ratio = computeContrast(desired, bg).toFixed(2);
            svg.setAttribute('data-dm-logo-contrast', ratio);

            count++;
        });
    }

    function cleanupSvgLogoAdaptations(root = document) {
        const processed = root.querySelectorAll('svg[data-dm-logo-processed]');
        processed.forEach(svg => {
            try {
                svg.removeAttribute('data-dm-logo-processed');
                svg.removeAttribute('data-dm-logo');
                svg.removeAttribute('data-dm-logo-contrast');
                svg.removeAttribute('data-dm-protected');
                // Remove inline color
                svg.style.removeProperty('color');
                // Remove injected inline styles
                const injected = svg.querySelector('style[data-dm-inline]');
                if (injected && injected.parentNode) injected.parentNode.removeChild(injected);
            } catch (_) { }
        });
    }

    function ensureInlineCurrentColor(svg) {
        let styleEl = svg.querySelector('style[data-dm-inline]');
        if (!styleEl) {
            styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
            styleEl.setAttribute('data-dm-inline', 'true');
            styleEl.textContent = `
                :where(path, rect, circle, polygon, polyline, ellipse, line, text) {
                    fill: currentColor !important;
                    stroke: currentColor !important;
                }
            `;
            svg.insertBefore(styleEl, svg.firstChild);
        }
    }

    function isSvgMonochrome(svg) {
        const shapes = svg.querySelectorAll('path, rect, circle, polygon, polyline, ellipse, line, text');
        const colors = new Set();
        for (let i = 0; i < shapes.length && i < 100; i++) {
            const c = window.getComputedStyle(shapes[i]).fill;
            if (!c || c === 'none' || c.includes('rgba(0, 0, 0, 0)')) continue;
            colors.add(normalizeColor(c));
            if (colors.size > 2) break;
        }
        return colors.size <= 2;
    }

    function chooseAccessibleForeground(bg) {
        // Try near-white and near-black; pick one with higher contrast, enforce >= 4.5 if possible
        const light = '#FAFAFA';
        const dark = '#111111';
        const crLight = computeContrast(light, bg);
        const crDark = computeContrast(dark, bg);
        if (crLight >= 4.5 || crLight >= crDark) return light;
        return crDark;
    }

    function getEffectiveBackgroundColor(el) {
        let node = el;
        while (node && node !== document.documentElement) {
            const bg = window.getComputedStyle(node).backgroundColor;
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return bg;
            node = node.parentElement;
        }
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        if (bodyBg && bodyBg !== 'rgba(0, 0, 0, 0)' && bodyBg !== 'transparent') return bodyBg;
        return window.getComputedStyle(document.documentElement).backgroundColor;
    }

    function normalizeColor(color) {
        // Handles rgb/rgba/hex; outputs rgb string "rgb(r, g, b)"
        if (!color) return 'rgb(0, 0, 0)';
        if (color.startsWith('#')) {
            const rgb = hexToRgb(color);
            return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        }
        if (color.startsWith('rgba')) {
            const m = color.match(/\d+/g);
            if (!m || m.length < 3) return 'rgb(0, 0, 0)';
            return `rgb(${m[0]}, ${m[1]}, ${m[2]})`;
        }
        return color;
    }

    function hexToRgb(hex) {
        let h = hex.replace('#', '');
        if (h.length === 3) {
            h = h.split('').map(ch => ch + ch).join('');
        }
        const num = parseInt(h, 16);
        return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    }

    function parseRgb(color) {
        const m = color.match(/\d+/g);
        if (!m || m.length < 3) return { r: 0, g: 0, b: 0 };
        return { r: +m[0], g: +m[1], b: +m[2] };
    }

    function relLuminance({ r, g, b }) {
        const srgb = [r, g, b].map(v => v / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        return srgb[0] * 0.2126 + srgb[1] * 0.7152 + srgb[2] * 0.0722;
    }

    function computeContrast(fg, bg) {
        const f = parseRgb(normalizeColor(fg));
        const b = parseRgb(normalizeColor(bg));
        const L1 = relLuminance(f) + 0.05;
        const L2 = relLuminance(b) + 0.05;
        const ratio = L1 > L2 ? (L1 / L2) : (L2 / L1);
        return ratio;
    }

    function init() {
        browser.storage.local.get(['settings'], (result) => {
            if (result.settings) {
                currentSettings = result.settings;
                // Defaults
                if (!currentSettings.automation) currentSettings.automation = { mode: 'manual', startTime: '19:00', endTime: '07:00' };
                if (currentSettings.grayscale === undefined) currentSettings.grayscale = 0;
                if (!currentSettings.siteList) currentSettings.siteList = { mode: 'blacklist', blacklist: [], whitelist: [] };
                if (currentSettings.performanceMode === undefined) currentSettings.performanceMode = false;
                if (currentSettings.visualProtection === undefined) currentSettings.visualProtection = false;
                if (currentSettings.dynamicDetection === undefined) currentSettings.dynamicDetection = true;
                if (currentSettings.enablePdf === undefined) currentSettings.enablePdf = false;
            }

            if (currentSettings.automation.mode === 'time') {
                if (!timeCheckInterval) timeCheckInterval = setInterval(updateStyles, 60000);
            } else {
                if (timeCheckInterval) {
                    clearInterval(timeCheckInterval);
                    timeCheckInterval = null;
                }
            }

            updateStyles();
        });
    }

    init();

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.command === 'domainChanged' || request.command === 'updateSettings') {
            init();
        }
    });

    browser.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.settings) {
            currentSettings = changes.settings.newValue;
            if (currentSettings && currentSettings.enablePdf === undefined) currentSettings.enablePdf = false;
            if (currentSettings && currentSettings.automation && currentSettings.automation.mode === 'time') {
                if (!timeCheckInterval) timeCheckInterval = setInterval(updateStyles, 60000);
            } else {
                if (timeCheckInterval) {
                    clearInterval(timeCheckInterval);
                    timeCheckInterval = null;
                }
            }
            updateStyles();
        }
    });

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addListener((e) => {
            if (currentSettings.automation && currentSettings.automation.mode === 'system') {
                updateStyles();
            }
        });
    }

    // LISTENER FOR KEYBOARD SHORTCUTS
    window.addEventListener('keydown', (e) => {
        // Ignore inputs
        const tag = document.activeElement.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || document.activeElement.isContentEditable) return;

        // Check for MAIN shortcut
        if (currentSettings.shortcut) {
            const s = currentSettings.shortcut;
            if (e.metaKey === s.metaKey && e.ctrlKey === s.ctrlKey && e.altKey === s.altKey && e.shiftKey === s.shiftKey && e.key.toLowerCase() === s.key) {
                e.preventDefault();
                currentSettings.automation.mode = 'manual'; // Force manual logic override
                currentSettings.enabled = !currentSettings.enabled;
                updateStyles();
                try {
                    if (browser.runtime?.id) {
                        browser.storage.local.set({ settings: currentSettings });
                    }
                } catch (err) {
                    console.warn('Extension context invalidated. Please reload the page.');
                }
                return;
            }
        }

        // Check for SITE toggle shortcut
        if (currentSettings.shortcutSite) {
            const s = currentSettings.shortcutSite;
            if (e.metaKey === s.metaKey && e.ctrlKey === s.ctrlKey && e.altKey === s.altKey && e.shiftKey === s.shiftKey && e.key.toLowerCase() === s.key) {
                e.preventDefault();
                const domain = window.location.hostname;
                const mode = currentSettings.siteList.mode;

                // Toggle presence in list
                if (mode === 'blacklist') {
                    if (currentSettings.siteList.blacklist.includes(domain)) {
                        currentSettings.siteList.blacklist = currentSettings.siteList.blacklist.filter(d => d !== domain);
                    } else {
                        currentSettings.siteList.blacklist.push(domain);
                    }
                } else {
                    if (currentSettings.siteList.whitelist.includes(domain)) {
                        currentSettings.siteList.whitelist = currentSettings.siteList.whitelist.filter(d => d !== domain);
                    } else {
                        currentSettings.siteList.whitelist.push(domain);
                    }
                }

                updateStyles(); // Apply immediately (if blacklist added, page returns to normal. if whitelist added, page goes dark)
                try {
                    if (browser.runtime?.id) {
                        browser.storage.local.set({ settings: currentSettings }, () => {
                            // Notify self? No need, we just updated local state.
                        });
                    }
                } catch (err) {
                    console.warn('Extension context invalidated. Please reload the page.');
                }
                return;
            }
        }
    });

})();
