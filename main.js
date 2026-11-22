/* Christopher Frimpong — portfolio interactions */
(function () {
    var root = document.documentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Theme toggle ---------- */
    function getTheme() {
        try { return localStorage.getItem('cf-theme'); } catch (e) { return null; }
    }
    function setTheme(t) {
        root.setAttribute('data-theme', t);
        try { localStorage.setItem('cf-theme', t); } catch (e) {}
        var btn = document.querySelector('.theme-toggle');
        if (btn) btn.setAttribute('aria-label', t === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
        if (window.__hexTheme) window.__hexTheme(t);
    }
    setTheme(getTheme() || 'dark');
    document.addEventListener('click', function (e) {
        var b = e.target.closest('.theme-toggle');
        if (b) setTheme(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light');
    });

    /* ---------- About text brightens word by word on scroll ---------- */
    var reveal = document.querySelector('.reveal-text');
    if (reveal && !reduce) {
        var words = [];
        reveal.querySelectorAll('p').forEach(function (p) {
            var parts = p.textContent.trim().split(/\s+/);
            p.textContent = '';
            parts.forEach(function (w, i) {
                var s = document.createElement('span');
                s.className = 'w';
                s.textContent = w;
                p.appendChild(s);
                if (i < parts.length - 1) p.appendChild(document.createTextNode(' '));
                words.push(s);
            });
        });
        var tick = false;
        function update() {
            tick = false;
            var r = reveal.getBoundingClientRect();
            var vh = window.innerHeight;
            var start = vh * 0.85, end = vh * 0.35;
            var progress = (start - r.top) / (r.height + (start - end));
            progress = Math.max(0, Math.min(1, progress));
            var n = Math.round(progress * words.length * 1.15);
            for (var i = 0; i < words.length; i++) words[i].classList.toggle('on', i < n);
        }
        window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(update); } }, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /* ---------- Active nav link ---------- */
    var links = document.querySelectorAll('.nav a.link[href^="#"]');
    if (links.length && 'IntersectionObserver' in window) {
        var map = {};
        links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting && map[en.target.id]) {
                    links.forEach(function (a) { a.classList.remove('active'); });
                    map[en.target.id].classList.add('active');
                }
            });
        }, { rootMargin: '-45% 0px -50% 0px' });
        Object.keys(map).forEach(function (id) { var el = document.getElementById(id); if (el) io.observe(el); });
    }

    /* ---------- 3D hex field ---------- */
    var canvas = document.getElementById('hex-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    var renderer;
    try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    var scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 26, 58);
    var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(0, 24, 30);
    camera.lookAt(4, 0, 2);

    var hemi = new THREE.HemisphereLight(0x9fc4ff, 0x020818, 0.55);
    scene.add(hemi);
    var key = new THREE.DirectionalLight(0xdfe9ff, 0.75);
    key.position.set(-10, 30, 18);
    scene.add(key);
    var rim = new THREE.PointLight(0x4da3ff, 1.6, 50);
    rim.position.set(10, 10, -4);
    scene.add(rim);

    // Honeycomb of hex prisms
    var R = 1.0, gap = 0.12;
    var geo = new THREE.CylinderGeometry(R - gap, R - gap, 1, 6, 1);
    geo.translate(0, 0.5, 0);
    var mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55, metalness: 0.3 });
    var cols = 34, rows = 26;
    var count = cols * rows;
    var mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);

    var w = Math.sqrt(3) * R, h = 1.5 * R;
    var cells = [];
    for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
            var x = (c - cols / 2) * w + (r % 2 ? w / 2 : 0) + 6;
            var z = (r - rows / 2) * h;
            cells.push({ x: x, z: z });
        }
    }

    var palettes = {
        dark: { low: new THREE.Color(0x081c66), high: new THREE.Color(0x8ea3c8), fog: 0x000000, hemi: 0.55 },
        light: { low: new THREE.Color(0x8fb0ee), high: new THREE.Color(0xffffff), fog: 0xf4f7fc, hemi: 0.75 }
    };
    var pal = palettes[root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'];

    // Glowing wireframe "node" (nested cubes)
    var node = new THREE.Group();
    function wireCube(size, opacity) {
        var e = new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size));
        var m = new THREE.LineBasicMaterial({ color: 0x6fb4ff, transparent: true, opacity: opacity, blending: THREE.AdditiveBlending, depthWrite: false });
        return new THREE.LineSegments(e, m);
    }
    [[4.2, 0.95], [4.32, 0.35], [4.5, 0.15], [2.6, 0.85], [2.72, 0.3], [1.2, 0.9]].forEach(function (s) { node.add(wireCube(s[0], s[1])); });
    // inner glow sprite
    var gcan = document.createElement('canvas'); gcan.width = gcan.height = 128;
    var gctx = gcan.getContext('2d');
    var grad = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, 'rgba(110,180,255,0.55)'); grad.addColorStop(1, 'rgba(110,180,255,0)');
    gctx.fillStyle = grad; gctx.fillRect(0, 0, 128, 128);
    var glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(gcan), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.set(12, 12, 1);
    node.add(glow);
    scene.add(node);

    var dummy = new THREE.Object3D();
    var col = new THREE.Color();
    var mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    var home = new THREE.Vector3(9, 0, 3);
    var focus = home.clone();
    var pointerActive = false;
    var finePointer = window.matchMedia('(pointer: fine)').matches;
    var raycaster = new THREE.Raycaster();
    var plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    var ndc = new THREE.Vector2();

    window.addEventListener('pointermove', function (e) {
        if (!finePointer) return;
        pointerActive = true;
        mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
    }, { passive: true });

    function layout() {
        var wpx = canvas.clientWidth, hpx = canvas.clientHeight;
        renderer.setSize(wpx, hpx, false);
        camera.aspect = wpx / hpx;
        var narrow = wpx < 760;
        camera.fov = narrow ? 52 : 38;
        camera.updateProjectionMatrix();
        node.position.set(narrow ? 4 : 13, narrow ? 6 : 5.5, narrow ? -9 : -2);
        node.scale.setScalar(narrow ? 0.6 : 0.9);
        home.set(narrow ? 3 : 9, 0, narrow ? -4 : 3);
    }
    window.addEventListener('resize', layout);
    layout();

    var visible = true;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (e) { visible = e[0].isIntersecting; if (visible) loop(); }).observe(canvas);
    }

    function applyPal() {
        scene.fog.color.setHex(pal.fog);
        hemi.intensity = pal.hemi;
        var light = pal === palettes.light;
        node.children.forEach(function (ch) {
            if (ch.isLineSegments) {
                ch.material.color.setHex(light ? 0x1d4fd6 : 0x6fb4ff);
                ch.material.blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
                ch.material.needsUpdate = true;
            }
        });
        glow.material.opacity = light ? 0.12 : 1;
    }
    applyPal();
    window.__hexTheme = function (t) { pal = palettes[t === 'light' ? 'light' : 'dark']; applyPal(); if (reduce) frame(performance.now()); };

    var t0 = performance.now();
    function frame(time) {
        var t = (time - t0) / 1000;
        mouse.x += (mouse.tx - mouse.x) * 0.06;
        mouse.y += (mouse.ty - mouse.y) * 0.06;
        ndc.set(mouse.x, mouse.y);
        raycaster.setFromCamera(ndc, camera);
        var hit = new THREE.Vector3();
        var target = home;
        if (pointerActive && raycaster.ray.intersectPlane(plane, hit)) target = hit;
        focus.lerp(target, 0.06);

        for (var i = 0; i < count; i++) {
            var cl = cells[i];
            var wave = Math.sin(cl.x * 0.28 + t * 0.9) * 0.35 + Math.cos(cl.z * 0.32 - t * 0.7) * 0.35;
            var dx = cl.x - focus.x, dz = cl.z - focus.z;
            var d = Math.sqrt(dx * dx + dz * dz);
            var lift = Math.max(0, 1 - d / 6.5);
            lift = lift * lift * (3 - 2 * lift);
            var height = 0.6 + wave * 0.5 + lift * 3.4;
            dummy.position.set(cl.x, -1.2, cl.z);
            dummy.scale.set(1, Math.max(0.2, height), 1);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            col.copy(pal.low).lerp(pal.high, Math.min(1, lift * 1.1));
            mesh.setColorAt(i, col);
        }
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;

        node.rotation.x = 0.5 + t * 0.18 + mouse.y * 0.25;
        node.rotation.y = 0.7 + t * 0.24 + mouse.x * 0.35;
        node.position.y += (Math.sin(t * 0.8) * 0.004);

        renderer.render(scene, camera);
    }

    var raf = 0;
    function loop() {
        cancelAnimationFrame(raf);
        if (!visible) return;
        frame(performance.now());
        raf = requestAnimationFrame(loop);
    }
    if (reduce) frame(performance.now()); else loop();
})();
