/* ============================================================
   RH RACING 69 — Scripts
   Sin dependencias. Todo funciona sin JavaScript salvo el
   escenario del garaje, que se sustituye por la parrilla.
   ============================================================ */
(() => {
    'use strict';

    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)';
    const WHATSAPP = 'https://wa.me/34663348729';

    const formatters = new Map();
    function fmt(n, decimals = 0) {
        if (!formatters.has(decimals)) {
            formatters.set(decimals, new Intl.NumberFormat('es-ES', {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
                useGrouping: 'always',
            }));
        }
        return formatters.get(decimals).format(n);
    }
    const decimalsOf = (n) => (Math.round(n * 10) % 10 === 0 ? 0 : 1);
    const pad2 = (n) => String(n).padStart(2, '0');
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const smooth = () => (reduceMotion.matches ? 'auto' : 'smooth');

    const storage = {
        get(key, session) {
            try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; }
        },
        set(key, value, session) {
            try { (session ? sessionStorage : localStorage).setItem(key, value); } catch { /* sin almacenamiento */ }
        },
    };

    // Ignora atajos cuando el usuario escribe o maneja un control con flechas propio
    const isTypingTarget = (target) =>
        target instanceof Element &&
        !!target.closest('input, textarea, select, [contenteditable="true"], [role="tablist"], dialog[open]');

    function flashKey(selector) {
        $$(selector).forEach((key) => {
            key.classList.add('is-pressed');
            setTimeout(() => key.classList.remove('is-pressed'), 140);
        });
    }

    /* ── 1. Sonidos de interfaz (WebAudio, desactivados por defecto) ── */
    const Sound = (() => {
        const button = $('#sound-toggle');
        let ctx = null;
        let on = storage.get('rh-sound') === 'on';

        function audio() {
            if (!on) return null;
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            if (!ctx) ctx = new AudioCtx();
            if (ctx.state === 'suspended') ctx.resume();
            return ctx;
        }

        function tone({ f = 660, f2 = 0, dur = 0.06, type = 'square', vol = 0.03, delay = 0 } = {}) {
            const a = audio();
            if (!a) return;
            const t = a.currentTime + delay;
            const osc = a.createOscillator();
            const gain = a.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(f, t);
            if (f2) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(vol, t + 0.008);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            osc.connect(gain).connect(a.destination);
            osc.start(t);
            osc.stop(t + dur + 0.02);
        }

        function whoosh() {
            const a = audio();
            if (!a) return;
            const dur = 0.34;
            const t = a.currentTime;
            const buffer = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            const src = a.createBufferSource();
            src.buffer = buffer;
            const band = a.createBiquadFilter();
            band.type = 'bandpass';
            band.Q.value = 1.1;
            band.frequency.setValueAtTime(320, t);
            band.frequency.exponentialRampToValueAtTime(2800, t + dur);
            const gain = a.createGain();
            gain.gain.setValueAtTime(0.0001, t);
            gain.gain.exponentialRampToValueAtTime(0.08, t + 0.06);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            src.connect(band).connect(gain).connect(a.destination);
            src.start(t);
            src.stop(t + dur);
        }

        const sync = () => button && button.setAttribute('aria-pressed', String(on));
        if (button) {
            button.addEventListener('click', () => {
                on = !on;
                storage.set('rh-sound', on ? 'on' : 'off');
                sync();
                if (on) tone({ f: 520, f2: 1040, dur: 0.12, type: 'triangle', vol: 0.05 });
            });
        }
        sync();

        return {
            tick: () => tone({ f: 1300, dur: 0.03, type: 'square', vol: 0.014 }),
            select: () => {
                whoosh();
                tone({ f: 440, f2: 880, dur: 0.1, type: 'triangle', vol: 0.03, delay: 0.05 });
            },
            confirm: () => {
                tone({ f: 660, dur: 0.07, type: 'triangle', vol: 0.04 });
                tone({ f: 990, dur: 0.11, type: 'triangle', vol: 0.04, delay: 0.07 });
            },
            back: () => tone({ f: 520, f2: 260, dur: 0.1, type: 'triangle', vol: 0.03 }),
        };
    })();

    /* ── 2. Pantalla de carga ── */
    function initBoot() {
        const boot = $('#boot');
        const root = document.documentElement;
        if (!boot) {
            root.classList.add('is-ready');
            return Promise.resolve();
        }

        const tips = [
            'Revisa la presión de los neumáticos en frío, antes de salir a rodar.',
            'Una cadena limpia y engrasada alarga la vida de la transmisión.',
            'El líquido de frenos absorbe humedad: renuévalo según el plan del fabricante.',
            'Tras instalar un escape o un filtro de alto flujo, ajusta el mapa de la centralita.',
            'Calienta el motor de forma progresiva antes de exprimirlo.',
        ];
        const tipEl = $('#boot-tip');
        if (tipEl) tipEl.textContent = tips[Math.floor(Math.random() * tips.length)];

        const seen = storage.get('rh-boot', true) === '1';
        storage.set('rh-boot', '1', true);
        const MIN = seen ? 250 : reduceMotion.matches ? 450 : 1100;
        const MAX = 4500;
        const fill = $('#boot-fill');
        const pct = $('#boot-pct');

        const eager = $$('img').filter((img) => img.loading !== 'lazy' && !boot.contains(img) && img.getAttribute('src'));
        const tasks = eager.map((img) => (img.complete ? Promise.resolve() : new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
        })));
        if (document.fonts && document.fonts.ready) tasks.push(document.fonts.ready);

        let loaded = 0;
        let loadedShare = tasks.length ? 0 : 1;
        tasks.forEach((task) => task.then(() => { loaded += 1; loadedShare = loaded / tasks.length; }));

        return new Promise((resolve) => {
            const start = performance.now();
            let shown = 0;
            const frame = (now) => {
                const elapsed = now - start;
                const goal = Math.min(loadedShare, Math.min(1, elapsed / MIN));
                shown += (goal - shown) * 0.2;
                const finished = (loadedShare >= 1 && elapsed >= MIN) || elapsed >= MAX;
                const value = finished ? 1 : shown;
                if (fill) fill.style.transform = `scaleX(${value})`;
                if (pct) pct.textContent = `${Math.round(value * 100)}%`;
                if (!finished) {
                    requestAnimationFrame(frame);
                    return;
                }
                setTimeout(() => {
                    boot.classList.add('is-done');
                    root.classList.add('is-ready');
                    boot.addEventListener('transitionend', () => boot.remove(), { once: true });
                    resolve();
                }, 140);
            };
            requestAnimationFrame(frame);
        });
    }

    /* ── 3. Estado de apertura (horario habitual, hora de Madrid) ── */
    function initOpenStatus() {
        let parts;
        try {
            parts = new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
            }).formatToParts(new Date());
        } catch {
            return;
        }
        const get = (type) => (parts.find((p) => p.type === type) || {}).value;
        const day = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[get('weekday')];
        const minutes = Number(get('hour')) * 60 + Number(get('minute'));
        const workday = day >= 1 && day <= 6;
        const open = workday && minutes >= 9 * 60 && minutes < 18 * 60;

        let text;
        if (open) text = 'Abierto ahora · Hasta las 18:00';
        else if (workday && minutes < 9 * 60) text = 'Cerrado · Abre hoy a las 09:00';
        else text = `Cerrado · Abre ${day === 6 ? 'el lunes' : 'mañana'} a las 09:00`;

        $$('[data-open-status]').forEach((el) => {
            el.classList.add(open ? 'is-open' : 'is-closed');
            const label = $('.status__text', el);
            if (label) label.textContent = text;
        });
        $$('[data-open-status-text]').forEach((el) => {
            el.textContent = `${text} (horario habitual)`;
            el.classList.add(open ? 'is-open' : 'is-closed');
        });
    }

    /* ── 4. HUD: pestañas activas, indicador y atajos Q / E ── */
    function initHud() {
        const nav = $('.hud__nav');
        const tabs = $$('.hud__tab');
        const indicator = $('#hud-indicator');
        const sections = tabs.map((tab) => document.getElementById(tab.dataset.section)).filter(Boolean);
        const order = ['inicio', ...sections.map((s) => s.id)];
        let activeId = null;

        function moveIndicator() {
            const tab = tabs.find((t) => t.dataset.section === activeId);
            if (!indicator || !nav) return;
            if (!tab || !nav.offsetParent) {
                indicator.style.opacity = '0';
                return;
            }
            const navBox = nav.getBoundingClientRect();
            const box = tab.getBoundingClientRect();
            indicator.style.transform = `translateX(${box.left - navBox.left + 12}px) scaleX(${(box.width - 24) / 100})`;
            indicator.style.opacity = '1';
        }

        function update() {
            const line = window.innerHeight * 0.38;
            let current = null;
            sections.forEach((section) => {
                if (section.getBoundingClientRect().top <= line) current = section.id;
            });
            if (current === activeId) return;
            activeId = current;
            tabs.forEach((tab) => {
                const on = tab.dataset.section === current;
                tab.classList.toggle('is-active', on);
                if (on) tab.setAttribute('aria-current', 'location');
                else tab.removeAttribute('aria-current');
            });
            moveIndicator();
        }

        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => { ticking = false; update(); });
        }, { passive: true });
        window.addEventListener('resize', () => { moveIndicator(); update(); });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);
        update();

        function go(delta) {
            const index = activeId ? order.indexOf(activeId) : 0;
            const next = order[Math.max(0, Math.min(order.length - 1, index + delta))];
            const target = document.getElementById(next);
            if (!target) return;
            target.scrollIntoView({ behavior: smooth(), block: 'start' });
            Sound.tick();
        }

        $$('.key--nav').forEach((key) => {
            key.addEventListener('click', () => go(key.dataset.key === 'q' ? -1 : 1));
        });

        document.addEventListener('keydown', (e) => {
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
            const key = e.key.toLowerCase();
            if (key !== 'q' && key !== 'e') return;
            flashKey(`.key--nav[data-key="${key}"], .footer__keys .key:${key === 'q' ? 'first-child' : 'last-of-type'}`);
            go(key === 'q' ? -1 : 1);
        });
    }

    /* ── 5. Menú de pausa (móvil) ── */
    function initPauseMenu() {
        const dialog = $('#pause-menu');
        const opener = $('#menu-open');
        if (!dialog || !opener) return;
        if (typeof dialog.showModal !== 'function') {
            opener.hidden = true;
            return;
        }

        opener.setAttribute('aria-expanded', 'false');
        opener.addEventListener('click', () => {
            dialog.showModal();
            opener.setAttribute('aria-expanded', 'true');
            Sound.tick();
        });

        function close(after) {
            const done = () => {
                dialog.close();
                dialog.classList.remove('is-closing');
                if (after) after();
            };
            if (reduceMotion.matches) return done();
            dialog.classList.add('is-closing');
            setTimeout(done, 150);
        }

        dialog.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-close-menu]');
            if (!trigger) return;
            if (trigger.tagName === 'A') {
                e.preventDefault();
                const href = trigger.getAttribute('href');
                close(() => {
                    const target = $(href);
                    if (!target) return;
                    history.pushState(null, '', href);
                    target.scrollIntoView({ behavior: smooth(), block: 'start' });
                });
            } else {
                close();
            }
        });
        dialog.addEventListener('close', () => opener.setAttribute('aria-expanded', 'false'));
        window.matchMedia('(min-width: 1080px)').addEventListener('change', (e) => {
            if (e.matches && dialog.open) dialog.close();
        });
    }

    /* ── 6. Selector de modo (Compra · Reparación · Repro) ── */
    function initModes() {
        const modes = $$('.mode');
        const desc = $('#modes-desc');
        if (!modes.length) return;

        function activate(mode) {
            modes.forEach((m) => m.classList.toggle('is-active', m === mode));
            if (desc && mode.dataset.modeDesc && desc.textContent !== mode.dataset.modeDesc) {
                desc.textContent = mode.dataset.modeDesc;
                if (!reduceMotion.matches) {
                    desc.animate([{ opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }],
                        { duration: 220, easing: EASE_OUT });
                }
            }
        }

        modes.forEach((mode) => {
            mode.addEventListener('pointerenter', (e) => {
                if (e.pointerType !== 'mouse') return;
                activate(mode);
                mode.classList.add('is-hot');
                Sound.tick();
            });
            mode.addEventListener('pointerleave', () => mode.classList.remove('is-hot'));
            mode.addEventListener('focus', () => {
                activate(mode);
                if (mode.matches(':focus-visible')) mode.classList.add('is-hot');
            });
            mode.addEventListener('blur', () => mode.classList.remove('is-hot'));
            mode.addEventListener('click', () => Sound.confirm());
        });

        const grid = $('.modes__grid');
        if (grid) {
            grid.addEventListener('keydown', (e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                const index = modes.indexOf(document.activeElement);
                if (index < 0) return;
                e.preventDefault();
                e.stopPropagation();
                const next = modes[(index + (e.key === 'ArrowRight' ? 1 : -1) + modes.length) % modes.length];
                next.focus();
                Sound.tick();
            });
        }
    }

    /* ── 7. Cifras del menú principal ── */
    function initCounters() {
        if (reduceMotion.matches) return;
        $$('[data-count]').forEach((el, i) => {
            const target = Number(el.dataset.count);
            const start = performance.now() + i * 90;
            const dur = 900;
            el.textContent = '0';
            const step = (now) => {
                const p = Math.max(0, Math.min(1, (now - start) / dur));
                el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
                if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
        });
    }

    /* ── 8. Garaje: selector de motos ── */
    function initGarage() {
        const main = $('#garage-main');
        const stage = $('#stage');
        const roster = $('#roster');
        const filtersForm = $('#garage-filters');
        if (!main || !stage || !roster) return null;

        // Tipos: etiqueta, color de iluminación y sesgos de la valoración RH
        const TYPES = {
            scrambler: { label: 'Scrambler', tint: '#ff9a1f', agil: 0.6, off: 5.5, conf: 5.0 },
            trail: { label: 'Trail', tint: '#3ddc84', agil: 0.8, off: 8.8, conf: 3.6 },
            rally: { label: 'Rally / Enduro', tint: '#ff3b3b', agil: 0.4, off: 9.2, conf: 4.4 },
            naked: { label: 'Naked', tint: '#7fa8ff', agil: 0.9, off: 1.4, conf: 5.2 },
            sport: { label: 'Sport', tint: '#ff5e00', agil: 1.0, off: 0.6, conf: 4.4 },
            adventure: { label: 'Adventure', tint: '#2f9bff', agil: -0.2, off: 7.0, conf: 8.2 },
            scooter: { label: 'Maxi scooter', tint: '#b26bff', agil: -0.6, off: 1.2, conf: 9.0 },
        };
        const AXES = [
            ['vel', 'Velocidad'],
            ['acel', 'Aceleración'],
            ['agil', 'Agilidad'],
            ['off', 'Off-road'],
            ['conf', 'Confort'],
        ];
        // Qué dirección es "mejor" en cada dato de la ficha (para colorear la diferencia)
        const BETTER = { cv: 1, nm: 1, cc: 0, kg: -1, vmax: 1, pw: 1 };

        const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
        const map = (v, a, b, c, d) => c + clamp((v - a) / (b - a), 0, 1) * (d - c);
        const round1 = (v) => Math.round(v * 10) / 10;

        // Valoración RH (0–10) calculada a partir de la ficha técnica
        function rate(b) {
            const k = TYPES[b.type] || TYPES.naked;
            const r = {
                vel: round1(map(b.vmax, 95, 300, 1, 10)),
                acel: round1(map(Math.sqrt(b.cv / b.kg), Math.sqrt(0.1), Math.sqrt(0.72), 1.2, 10)),
                agil: round1(clamp(map(b.kg, 270, 115, 2.5, 9.2) + k.agil, 1, 10)),
                off: round1(clamp(k.off - map(b.kg, 120, 260, 0, 2), 0.5, 10)),
                conf: round1(clamp(k.conf + map(b.kg, 120, 260, -0.8, 1.2) + map(b.cv, 15, 190, 0, 0.6), 1, 10)),
            };
            const score = (r.vel * 0.32 + r.acel * 0.38 + r.agil * 0.16 + r.off * 0.05 + r.conf * 0.09) / 10;
            const pi = Math.round(100 + 900 * Math.pow(score, 1.15));
            const cls = pi >= 800 ? 'X' : pi >= 700 ? 'S' : pi >= 600 ? 'A' : pi >= 500 ? 'B' : pi >= 400 ? 'C' : 'D';
            return { ratings: r, pi, cls };
        }

        // Carnet según la normativa: A1 ≤ 125 cc y 11 kW · A2 ≤ 35 kW · A2 limitable si la potencia original ≤ 70 kW
        function license(b) {
            const kw = b.cv * 0.7355;
            if (b.cc <= 125 && kw <= 11) return 'Carnet A1';
            if (kw <= 35) return 'Carnet A2';
            if (kw <= 70) return 'Carnet A · Limitable A2';
            return 'Carnet A';
        }

        const ccRange = (cc) => (cc <= 125 ? '125' : cc <= 300 ? '126-300' : cc <= 500 ? '301-500' : cc <= 750 ? '501-750' : '750+');

        function stageWord(model) {
            if (model.length <= 9) return model;
            const parts = model.split(' ');
            const two = parts.slice(0, 2).join(' ');
            return two.length <= 9 ? two : parts[0];
        }

        const bikes = $$('.bike-tile', roster).map((el, index) => {
            const d = el.dataset;
            const b = {
                el, index,
                li: el.closest('li'),
                id: d.id,
                brand: d.brand,
                model: d.model,
                name: `${d.brand} ${d.model}`,
                type: d.type,
                cc: Number(d.cc), cv: Number(d.cv), nm: Number(d.nm), kg: Number(d.kg), vmax: Number(d.vmax),
                img: d.img, w: Number(d.w), h: Number(d.h),
            };
            b.pw = Math.round((b.cv / b.kg) * 1000);
            b.range = ccRange(b.cc);
            b.word = stageWord(b.model);
            Object.assign(b, rate(b));
            b.license = license(b);
            const badge = $('.bike-tile__pi', el);
            if (badge) {
                badge.dataset.class = b.cls;
                badge.textContent = `${b.cls} ${b.pi}`;
            }
            return b;
        });
        if (!bikes.length) return null;

        const max = {};
        ['cv', 'nm', 'cc', 'kg', 'vmax', 'pw'].forEach((k) => { max[k] = Math.max(...bikes.map((b) => b[k])); });

        const slot = (name) => stage.querySelector(`[data-slot="${name}"]`);
        const live = $('#stage-live');
        const emptyState = $('#stage-empty');
        const ctaTest = $('#cta-test');
        const ctaWa = $('#cta-wa');
        const counter = $('#roster-count');
        const word = slot('word');
        const sweep = $('.stage__sweep', stage);
        let [front, back] = $$('.bike-layer', stage);

        let filtered = bikes.slice();
        let current = null;
        let token = 0;
        let running = [];

        /* Tween numérico interrumpible */
        const shownValue = new WeakMap();
        const tweenFrame = new WeakMap();
        function tweenNumber(el, to, decimals, dur = 650) {
            cancelAnimationFrame(tweenFrame.get(el));
            const from = shownValue.get(el);
            if (from == null || reduceMotion.matches || from === to) {
                shownValue.set(el, to);
                el.textContent = fmt(to, decimals);
                return;
            }
            const t0 = performance.now();
            const step = (now) => {
                const p = Math.min(1, (now - t0) / dur);
                const value = from + (to - from) * (1 - Math.pow(1 - p, 3));
                shownValue.set(el, value);
                el.textContent = fmt(value, decimals);
                if (p < 1) tweenFrame.set(el, requestAnimationFrame(step));
            };
            tweenFrame.set(el, requestAnimationFrame(step));
        }

        /* Radar */
        const radar = $('#radar');
        const R = 84;
        const angle = (i) => ((-90 + i * 72) * Math.PI) / 180;
        const point = (i, v) => [Math.cos(angle(i)) * (R * v) / 10, Math.sin(angle(i)) * (R * v) / 10];
        const toPoints = (values) => values.map((v, i) => point(i, v).map((n) => n.toFixed(1)).join(',')).join(' ');
        const svgNS = 'http://www.w3.org/2000/svg';
        const svgEl = (tag, attrs) => {
            const node = document.createElementNS(svgNS, tag);
            Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
            return node;
        };
        const radarVals = [];
        let radarShown = null;
        let radarFrame = 0;
        let ghostTimer = 0;
        if (radar) {
            const grid = $('.radar__grid', radar);
            [2.5, 5, 7.5, 10].forEach((v) => grid.appendChild(svgEl('polygon', { points: toPoints(AXES.map(() => v)) })));
            AXES.forEach((_, i) => {
                const [x, y] = point(i, 10);
                grid.appendChild(svgEl('line', { x1: 0, y1: 0, x2: x.toFixed(1), y2: y.toFixed(1) }));
            });
            const labels = $('.radar__labels', radar);
            const dots = $('.radar__dots', radar);
            AXES.forEach(([, label], i) => {
                const [x, y] = point(i, 13.2);
                const anchor = Math.abs(x) < 8 ? 'middle' : x > 0 ? 'start' : 'end';
                const top = y < -60;
                const nameY = top ? y - 14 : y;
                const name = svgEl('text', { x: x.toFixed(1), y: nameY.toFixed(1), 'text-anchor': anchor });
                name.textContent = label;
                const val = svgEl('text', { x: x.toFixed(1), y: (nameY + 17).toFixed(1), 'text-anchor': anchor, class: 'radar__val' });
                val.textContent = '0';
                labels.append(name, val);
                radarVals.push(val);
                dots.appendChild(svgEl('circle', { r: 3.5, cx: 0, cy: 0 }));
            });
        }

        function drawRadar(values) {
            if (!radar) return;
            $('.radar__shape', radar).setAttribute('points', toPoints(values));
            $$('.radar__dots circle', radar).forEach((dot, i) => {
                const [x, y] = point(i, values[i]);
                dot.setAttribute('cx', x.toFixed(1));
                dot.setAttribute('cy', y.toFixed(1));
            });
            radarVals.forEach((t, i) => { t.textContent = fmt(values[i], 1); });
        }

        function updateRadar(bike, previous, animate) {
            if (!radar) return;
            const target = AXES.map(([k]) => bike.ratings[k]);
            const ghost = $('.radar__ghost', radar);
            clearTimeout(ghostTimer);
            if (previous && animate) {
                ghost.setAttribute('points', toPoints(AXES.map(([k]) => previous.ratings[k])));
                ghost.style.opacity = '1';
                ghostTimer = setTimeout(() => { ghost.style.opacity = '0'; }, 2600);
            } else {
                ghost.style.opacity = '0';
            }
            radar.setAttribute('aria-label', `Perfil de pilotaje de la ${bike.name}: ${AXES.map(([k, label]) => `${label.toLowerCase()} ${fmt(bike.ratings[k], 1)}`).join(', ')} sobre 10.`);
            cancelAnimationFrame(radarFrame);
            if (!radarShown || !animate || reduceMotion.matches) {
                radarShown = target.slice();
                drawRadar(radarShown);
                return;
            }
            const from = radarShown.slice();
            const t0 = performance.now();
            const step = (now) => {
                const p = Math.min(1, (now - t0) / 600);
                const e = 1 - Math.pow(1 - p, 3);
                radarShown = from.map((v, i) => v + (target[i] - v) * e);
                drawRadar(radarShown);
                if (p < 1) radarFrame = requestAnimationFrame(step);
            };
            radarFrame = requestAnimationFrame(step);
        }

        /* Barras de ficha técnica */
        const specRows = $$('#specs .spec');
        function updateSpecs(bike, previous, animate, showDelta) {
            specRows.forEach((row) => {
                const key = row.dataset.key;
                const value = bike[key];
                const fill = $('.spec__fill', row);
                const ghost = $('.spec__ghost', row);
                const num = $('.spec__num', row);
                const delta = $('.delta', row);

                clearTimeout(row._ghostTimer);
                if (previous && animate) {
                    ghost.style.transition = 'none';
                    ghost.style.opacity = '1';
                    ghost.style.transform = `scaleX(${previous[key] / max[key]})`;
                    ghost.getBoundingClientRect();
                    ghost.style.transition = '';
                    row._ghostTimer = setTimeout(() => { ghost.style.opacity = '0'; }, 1600);
                } else {
                    ghost.style.opacity = '0';
                }
                fill.style.transform = `scaleX(${value / max[key]})`;
                tweenNumber(num, value, decimalsOf(value), animate ? 650 : 0);

                clearTimeout(delta._timer);
                const diff = previous ? round1(value - previous[key]) : 0;
                if (showDelta && previous && diff !== 0) {
                    const better = BETTER[key];
                    delta.textContent = `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff), decimalsOf(diff))}`;
                    delta.className = `delta is-on ${better === 0 ? 'is-neutral' : diff * better > 0 ? 'is-up' : 'is-down'}`;
                    delta._timer = setTimeout(() => delta.classList.remove('is-on'), 2800);
                } else {
                    delta.classList.remove('is-on');
                }
            });
        }

        /* Imagen con entrada/salida direccional (interrumpible) */
        async function swapImage(bike, dir, instant) {
            const my = ++token;
            running.forEach((a) => a.finish());
            running = [];
            const incoming = back;
            const outgoing = front;
            const [img, refl] = $$('img', incoming);
            if (img.getAttribute('src') !== bike.img) {
                img.src = bike.img;
                refl.src = bike.img;
            }
            img.alt = bike.name;
            img.width = bike.w;
            img.height = bike.h;
            if (img.decode) {
                try { await Promise.race([img.decode(), wait(800)]); } catch { /* se muestra igualmente */ }
            }
            if (my !== token) return;

            front = incoming;
            back = outgoing;
            incoming.classList.add('is-current');
            incoming.removeAttribute('aria-hidden');
            outgoing.classList.remove('is-current');
            outgoing.setAttribute('aria-hidden', 'true');
            $('img', outgoing).alt = '';

            if (instant || !incoming.animate) return;
            if (reduceMotion.matches) {
                running.push(incoming.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180 }));
                running.push(outgoing.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140 }));
                return;
            }
            const d = dir || 1;
            const blur = finePointer.matches;
            running.push(outgoing.animate([
                { opacity: 1, transform: 'none', filter: 'blur(0px)' },
                { opacity: 0, transform: `translateX(${-d * 16}%)`, filter: blur ? 'blur(6px)' : 'none' },
            ], { duration: 260, easing: EASE_OUT }));
            running.push(incoming.animate([
                { opacity: 0, transform: `translateX(${d * 20}%) scale(0.97)`, filter: blur ? 'blur(8px)' : 'none' },
                { opacity: 1, transform: 'none', filter: 'blur(0px)' },
            ], { duration: 560, easing: EASE_OUT }));
            if (sweep) {
                running.push(sweep.animate([
                    { transform: `translateX(${-d * 100}%)` },
                    { transform: `translateX(${d * 100}%)` },
                ], { duration: 720, easing: EASE_OUT }));
            }
        }

        function updateTexts(bike, dir, animate) {
            slot('brand').textContent = bike.brand;
            slot('model').textContent = bike.model;
            slot('type').textContent = TYPES[bike.type] ? TYPES[bike.type].label : bike.type;
            slot('license').textContent = bike.license;
            const pi = slot('pi');
            pi.dataset.class = bike.cls;
            slot('pi-class').textContent = bike.cls;
            tweenNumber(slot('pi-num'), bike.pi, 0, animate ? 600 : 0);
            pi.setAttribute('aria-label', `Índice RH: clase ${bike.cls}, ${bike.pi}`);
            word.textContent = bike.word;
            word.style.setProperty('--len', Math.max(4, bike.word.length));
            updateCounter();

            if (!animate || reduceMotion.matches || !word.animate) return;
            const d = dir || 1;
            word.animate([
                { opacity: 0, transform: `translate(calc(-50% + ${d * 60}px), -50%)` },
                { opacity: 0.6, transform: 'translate(-50%, -50%)' },
            ], { duration: 700, easing: EASE_OUT });
            [slot('brand'), slot('model'), $('.stage__chips', stage), pi].forEach((el, i) => {
                el.animate([
                    { opacity: 0, transform: 'translateX(-10px)' },
                    { opacity: 1, transform: 'none' },
                ], { duration: 320, delay: 60 + i * 45, easing: EASE_OUT, fill: 'backwards' });
            });
        }

        function updateCounter() {
            const pos = current ? filtered.indexOf(current) + 1 : 0;
            slot('pos').textContent = pad2(Math.max(pos, 0));
            slot('total').textContent = pad2(filtered.length);
            if (counter) counter.textContent = `${filtered.length} ${filtered.length === 1 ? 'máquina' : 'máquinas'}`;
        }

        function scrollRosterTo(bike) {
            if (roster.scrollWidth <= roster.clientWidth + 2) return;
            const r = roster.getBoundingClientRect();
            const t = bike.li.getBoundingClientRect();
            roster.scrollTo({ left: roster.scrollLeft + (t.left - r.left) - (r.width - t.width) / 2, behavior: smooth() });
        }

        function preloadNeighbours() {
            const i = filtered.indexOf(current);
            [1, -1].forEach((d) => {
                const b = filtered[(i + d + filtered.length) % filtered.length];
                if (b && !b._preloaded) {
                    b._preloaded = true;
                    const img = new Image();
                    img.src = b.img;
                }
            });
        }

        function select(bike, { dir = 0, user = false } = {}) {
            if (!bike || bike === current) return;
            const previous = current;
            const animate = !!previous;
            current = bike;

            bikes.forEach((b) => b.el.setAttribute('aria-pressed', String(b === bike)));
            main.style.setProperty('--tint', (TYPES[bike.type] || TYPES.sport).tint);
            updateTexts(bike, dir, animate);
            swapImage(bike, dir, !animate);
            updateRadar(bike, previous, animate);
            updateSpecs(bike, previous, animate, user);

            if (ctaTest) ctaTest.dataset.bike = bike.name;
            if (ctaWa) {
                ctaWa.href = `${WHATSAPP}?text=${encodeURIComponent(`Hola RH Racing 69, me interesa la ${bike.name} Km 0. ¿Me podéis dar más información?`)}`;
                ctaWa.setAttribute('aria-label', `Consultar la ${bike.name} por WhatsApp`);
            }
            if (live && user) {
                live.textContent = `${bike.name}. ${TYPES[bike.type] ? TYPES[bike.type].label : ''}. Índice RH ${bike.cls} ${bike.pi}. ${fmt(bike.cv, decimalsOf(bike.cv))} CV, ${fmt(bike.kg)} kg. ${bike.license}.`;
            }
            if (user) {
                Sound.select();
                scrollRosterTo(bike);
                try {
                    const url = new URL(window.location.href);
                    url.searchParams.set('moto', bike.id);
                    history.replaceState(history.state, '', url);
                } catch { /* URL no editable */ }
            }
            preloadNeighbours();
        }

        function step(delta, focusTile) {
            if (!filtered.length) return;
            const i = Math.max(0, filtered.indexOf(current));
            const next = filtered[(i + delta + filtered.length) % filtered.length];
            select(next, { dir: delta, user: true });
            if (focusTile) next.el.focus({ preventScroll: true });
        }

        /* Filtros */
        function applyFilters() {
            if (!filtersForm) return;
            const brand = filtersForm.elements.brand.value;
            const cc = filtersForm.elements.cc.value;
            filtered = bikes.filter((b) => (brand === 'all' || b.brand === brand) && (cc === 'all' || b.range === cc));
            bikes.forEach((b) => { b.li.hidden = !filtered.includes(b); });

            $$('[data-count-brand]', filtersForm).forEach((el) => {
                const name = el.dataset.countBrand;
                el.textContent = bikes.filter((b) => (name === 'all' || b.brand === name) && (cc === 'all' || b.range === cc)).length;
            });

            const empty = filtered.length === 0;
            if (emptyState) emptyState.hidden = !empty;
            stage.classList.toggle('is-empty', empty);
            [ctaTest, ctaWa].forEach((el) => {
                if (!el) return;
                if (empty) el.setAttribute('aria-disabled', 'true');
                else el.removeAttribute('aria-disabled');
            });

            if (!empty && !filtered.includes(current)) {
                const from = current ? current.index : -1;
                const next = filtered[0];
                select(next, { dir: next.index >= from ? 1 : -1, user: true });
            } else {
                updateCounter();
            }
        }

        if (filtersForm) {
            filtersForm.addEventListener('change', () => {
                applyFilters();
                Sound.tick();
            });
            filtersForm.addEventListener('submit', (e) => e.preventDefault());
        }
        $$('[data-reset-filters]').forEach((btn) => btn.addEventListener('click', () => {
            filtersForm.reset();
            applyFilters();
            Sound.back();
        }));

        /* Interacción */
        bikes.forEach((b) => b.el.addEventListener('click', () => {
            const from = current ? filtered.indexOf(current) : -1;
            select(b, { dir: filtered.indexOf(b) >= from ? 1 : -1, user: true });
        }));
        $$('[data-nav]', stage).forEach((btn) => btn.addEventListener('click', () => step(Number(btn.dataset.nav))));

        let garageInView = false;
        if ('IntersectionObserver' in window) {
            new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    garageInView = entry.intersectionRatio >= 0.35;
                    stage.classList.toggle('is-paused', !entry.isIntersecting);
                });
            }, { threshold: [0, 0.35, 0.6] }).observe(main);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
            if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingTarget(e.target)) return;
            const onTile = e.target instanceof Element && e.target.classList.contains('bike-tile');
            if (!garageInView && !onTile) return;
            e.preventDefault();
            flashKey(`.stage__hint .key:${e.key === 'ArrowLeft' ? 'first-of-type' : 'last-of-type'}`);
            step(e.key === 'ArrowLeft' ? -1 : 1, onTile);
        });

        // Deslizar en móvil
        let swipe = null;
        stage.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' || e.target.closest('button, a')) return;
            swipe = { x: e.clientX, y: e.clientY };
        });
        stage.addEventListener('pointerup', (e) => {
            if (!swipe) return;
            const dx = e.clientX - swipe.x;
            const dy = e.clientY - swipe.y;
            swipe = null;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1);
        });
        stage.addEventListener('pointercancel', () => { swipe = null; });

        // Inclinación sutil siguiendo el ratón (solo puntero fino)
        if (finePointer.matches && !reduceMotion.matches) {
            const rig = $('.stage__bike', stage);
            let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0;
            const loop = () => {
                cx += (tx - cx) * 0.08;
                cy += (ty - cy) * 0.08;
                rig.style.transform = `perspective(1400px) rotateY(${(cx * 9).toFixed(2)}deg) rotateX(${(-cy * 3).toFixed(2)}deg) translateX(${(cx * 16).toFixed(1)}px)`;
                frame = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
            };
            stage.addEventListener('pointermove', (e) => {
                if (e.pointerType !== 'mouse') return;
                const r = stage.getBoundingClientRect();
                tx = (e.clientX - r.left) / r.width - 0.5;
                ty = (e.clientY - r.top) / r.height - 0.5;
                if (!frame) frame = requestAnimationFrame(loop);
            });
            stage.addEventListener('pointerleave', () => {
                tx = 0;
                ty = 0;
                if (!frame) frame = requestAnimationFrame(loop);
            });
        }

        /* Estado inicial: ?moto=… o la Hayabusa del menú principal */
        const wanted = new URLSearchParams(window.location.search).get('moto');
        const initial = bikes.find((b) => b.id === wanted) || bikes.find((b) => b.id === 'suzuki-hayabusa') || bikes[0];
        applyFilters();
        select(initial);
        return { deepLinked: !!wanted && initial.id === wanted };
    }

    /* ── 9. Consola de reprogramación (pestañas + mapa de inyección) ── */
    function initRepro() {
        const list = $('#repro-tabs');
        if (!list) return;
        const tabs = $$('[role="tab"]', list);
        const mq = window.matchMedia('(max-width: 899px)');
        const syncOrientation = () => list.setAttribute('aria-orientation', mq.matches ? 'horizontal' : 'vertical');
        syncOrientation();
        mq.addEventListener('change', syncOrientation);

        const map = $('#ecu-map');
        const COLS = 12;
        const ROWS = 8;
        const cells = [];
        if (map) {
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    const cell = document.createElement('span');
                    if (!reduceMotion.matches) cell.style.transitionDelay = `${(r + c) * 14}ms`;
                    map.appendChild(cell);
                    cells.push({ cell, r, c });
                }
            }
        }
        function remap(index) {
            const seed = index * 1.7 + 0.4;
            const boost = [1.18, 1.08, 1.12, 1.24, 1.04, 1][index] || 1;
            cells.forEach(({ cell, r, c }) => {
                const base = 6 + c * 1.5 + (ROWS - r) * 1.1;
                const wave = Math.sin(c * 0.55 + seed) * 2.2 + Math.cos(r * 0.8 + seed * 1.3) * 1.6;
                const value = Math.max(2, (base + wave) * boost);
                const t = Math.min(1, value / 30);
                cell.style.backgroundColor = `hsl(${Math.round(220 - t * 220)} 88% ${Math.round(42 + t * 12)}%)`;
                cell.textContent = fmt(value, 1);
            });
        }

        function activate(tab, focus) {
            tabs.forEach((t) => {
                const on = t === tab;
                t.setAttribute('aria-selected', String(on));
                t.tabIndex = on ? 0 : -1;
                const panel = document.getElementById(t.getAttribute('aria-controls'));
                if (panel) panel.hidden = !on;
            });
            if (focus) tab.focus();
            if (mq.matches) {
                const lr = list.getBoundingClientRect();
                const tr = tab.getBoundingClientRect();
                if (tr.left < lr.left || tr.right > lr.right) {
                    list.scrollTo({ left: list.scrollLeft + (tr.left - lr.left) - 12, behavior: smooth() });
                }
            }
            remap(tabs.indexOf(tab));
        }

        tabs.forEach((tab) => tab.addEventListener('click', () => {
            if (tab.getAttribute('aria-selected') !== 'true') Sound.tick();
            activate(tab, false);
        }));
        list.addEventListener('keydown', (e) => {
            const i = tabs.indexOf(document.activeElement);
            if (i < 0) return;
            let next = null;
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % tabs.length;
            else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = tabs.length - 1;
            if (next === null) return;
            e.preventDefault();
            activate(tabs[next], true);
            Sound.tick();
        });
        remap(0);
    }

    /* ── 10. Atajos hacia la reserva: rellenan servicio y moto ── */
    function initPrefill() {
        const service = $('#servicio');
        const bike = $('#moto');
        const flash = (el) => {
            el.classList.remove('is-flash');
            void el.offsetWidth;
            el.classList.add('is-flash');
            setTimeout(() => el.classList.remove('is-flash'), 1600);
        };
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-service], a[data-bike]');
            if (!link || link.getAttribute('aria-disabled') === 'true') return;
            if (link.dataset.service && service) {
                service.value = link.dataset.service;
                service.dispatchEvent(new Event('change', { bubbles: true }));
                flash(service);
            }
            if (link.dataset.bike && bike) {
                bike.value = link.dataset.bike;
                flash(bike);
            }
            Sound.confirm();
            if (e.detail === 0) {
                setTimeout(() => { const name = $('#nombre'); if (name) name.focus({ preventScroll: true }); }, reduceMotion.matches ? 0 : 700);
            }
        });
    }

    /* ── 11. Formulario de reserva ── */
    function initBookingForm() {
        const form = $('#reserva-form');
        if (!form) return;
        const success = $('#form-success');
        const submit = $('#submit-btn');
        const label = submit ? $('.btn__label', submit) : null;
        const again = $('#form-again');
        const waLink = $('#success-wa');
        const date = form.elements.fecha;

        const today = () => {
            const d = new Date();
            return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
        };
        if (date) date.min = today();

        const rules = {
            nombre: (v) => v.trim().length >= 2,
            email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
            telefono: (v) => /^[0-9\s+\-]{7,18}$/.test(v.trim()) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15,
            servicio: (v) => v !== '',
            fecha: (v) => v !== '' && v >= today(),
        };

        function check(name) {
            const el = form.elements[name];
            const ok = rules[name](el.value);
            const field = el.closest('.field');
            if (field) field.classList.toggle('is-invalid', !ok);
            el.setAttribute('aria-invalid', String(!ok));
            return ok;
        }

        const reEvaluate = (e) => {
            const name = e.target.name;
            const field = e.target.closest('.field');
            if (rules[name] && field && field.classList.contains('is-invalid')) check(name);
        };
        form.addEventListener('input', reEvaluate);
        form.addEventListener('change', reEvaluate);

        function summary(data) {
            const select = form.elements.servicio;
            const serviceText = select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : data.servicio;
            let when = data.fecha;
            try {
                when = new Date(`${data.fecha}T12:00:00`).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
            } catch { /* fecha tal cual */ }
            const lines = [
                'Hola RH Racing 69, quiero reservar una cita:',
                `• Nombre: ${data.nombre.trim()}`,
                `• Servicio: ${serviceText}`,
                data.moto && data.moto.trim() ? `• Moto: ${data.moto.trim()}` : '',
                `• Fecha preferida: ${when}`,
                `• Teléfono: ${data.telefono.trim()}`,
                `• Email: ${data.email.trim()}`,
            ];
            return lines.filter(Boolean).join('\n');
        }

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const invalid = Object.keys(rules).filter((name) => !check(name));
            if (invalid.length) {
                form.elements[invalid[0]].focus();
                Sound.back();
                return;
            }
            const data = Object.fromEntries(new FormData(form));
            if (submit) {
                submit.classList.add('is-loading');
                submit.setAttribute('aria-busy', 'true');
            }
            if (label) label.textContent = 'Enviando…';

            // Igual que la versión anterior: sin backend, el envío se simula.
            setTimeout(() => {
                if (submit) {
                    submit.classList.remove('is-loading');
                    submit.removeAttribute('aria-busy');
                }
                if (label) label.textContent = 'Confirmar reserva';
                if (waLink) waLink.href = `${WHATSAPP}?text=${encodeURIComponent(summary(data))}`;
                form.hidden = true;
                if (success) {
                    success.hidden = false;
                    success.focus();
                }
                Sound.confirm();
            }, 800);
        });

        if (again) {
            again.addEventListener('click', () => {
                form.reset();
                $$('.field.is-invalid', form).forEach((f) => f.classList.remove('is-invalid'));
                $$('[aria-invalid]', form).forEach((f) => f.removeAttribute('aria-invalid'));
                if (date) date.min = today();
                if (success) success.hidden = true;
                form.hidden = false;
                form.elements.nombre.focus();
            });
        }
    }

    /* ── 12. Aparición al hacer scroll ── */
    function initReveal() {
        const items = $$('[data-reveal], .collab');
        if (!('IntersectionObserver' in window)) {
            items.forEach((el) => el.classList.add('is-in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
                entry.target.style.setProperty('--reveal-delay', `${i * 70}ms`);
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
        items.forEach((el) => io.observe(el));
    }

    /* ── Arranque ── */
    document.addEventListener('DOMContentLoaded', () => {
        const year = $('#current-year');
        if (year) year.textContent = String(new Date().getFullYear());

        initOpenStatus();
        initHud();
        initPauseMenu();
        initModes();
        const garage = initGarage();
        initRepro();
        initPrefill();
        initBookingForm();
        initReveal();

        initBoot().then(() => {
            initCounters();
            if (garage && garage.deepLinked) {
                const target = $('#km0');
                if (target) target.scrollIntoView({ behavior: smooth(), block: 'start' });
            }
        });
    });
})();
