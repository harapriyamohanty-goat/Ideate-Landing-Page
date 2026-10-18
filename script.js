(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile navigation
  const menuToggle = $('#menu-toggle');
  const nav = $('#main-nav');
  menuToggle?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(open));
  });
  $$('#main-nav a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Progress indicator and gentle pointer depth.
  const progressBar = $('#progress-bar');
  let scrollQueued = false;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.width = `${max > 0 ? (window.scrollY / max) * 100 : 0}%`;
    scrollQueued = false;
  };
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { requestAnimationFrame(updateScroll); scrollQueued = true; }
  }, { passive: true });
  updateScroll();

  const hero = $('.hero');
  if (hero && !reducedMotion && matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('pointermove', event => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      $$('.hero-copy [data-depth], .hero-copy').forEach(el => {
        el.style.transform = `translate3d(${x * -8}px, ${y * -6}px, 0)`;
      });
      $$('.hero-orbit').forEach((el, i) => el.style.transform = `translate(${x * (i + 1) * 10}px,${y * (i + 1) * 8}px)`);
    }, { passive: true });
  }

  // Festival explorer: accessible, touch-friendly category selection.
  const exploreItems = $$('.explore-item');
  const explorerVisual = $('#explorer-visual');
  const explorerCopy = $('#explorer-copy');
  const activeNode = $('#active-node');
  const glyph = $('.core-glyph');
  function activateExplorer(item) {
    exploreItems.forEach(button => {
      const active = button === item;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    if (explorerCopy) explorerCopy.textContent = item.dataset.copy || '';
    if (activeNode) activeNode.textContent = item.dataset.node || '01';
    if (glyph) glyph.textContent = item.dataset.symbol || '✳';
    if (explorerVisual) {
      explorerVisual.dataset.active = item.dataset.node || '01';
      explorerVisual.style.setProperty('--node-hue', `${Number(item.dataset.node || 1) * 22}deg`);
    }
  }
  exploreItems.forEach((item, index) => {
    item.tabIndex = index === 0 ? 0 : -1;
    item.addEventListener('click', () => activateExplorer(item));
    item.addEventListener('keydown', event => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowDown') next = (index + 1) % exploreItems.length;
      if (event.key === 'ArrowUp') next = (index - 1 + exploreItems.length) % exploreItems.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = exploreItems.length - 1;
      exploreItems[next].focus();
      activateExplorer(exploreItems[next]);
    });
  });

  // Three.js hero centerpiece. CSS rings remain as graceful fallback.
  function initThree() {
    const canvas = $('#core-canvas');
    if (!canvas || !window.THREE || reducedMotion) return;
    let renderer, scene, camera, core, ringGroup, particlePoints, animationFrame;
    try {
      const THREE = window.THREE;
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.innerWidth > 700, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.25 : 1.8));
      renderer.setSize(canvas.clientWidth || canvas.parentElement.clientWidth, canvas.clientHeight || window.innerHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(34, 1, .1, 100);
      camera.position.set(0, 0, 9.2);
      scene.add(new THREE.AmbientLight(0x9fc7e5, 1.6));
      const key = new THREE.PointLight(0xff6238, 45, 20); key.position.set(3, 2, 4); scene.add(key);
      const rim = new THREE.PointLight(0x79c7ff, 34, 20); rim.position.set(-4, -1, 2); scene.add(rim);
      const fill = new THREE.DirectionalLight(0xffffff, 1.4); fill.position.set(0, 5, 5); scene.add(fill);

      core = new THREE.Group(); scene.add(core);
      const sphereGeo = new THREE.IcosahedronGeometry(1.18, 2);
      const sphereMat = new THREE.MeshStandardMaterial({ color: 0x18242e, metalness: .88, roughness: .27, flatShading: true, emissive: 0x09141d, emissiveIntensity: .6 });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat); core.add(sphere);
      const inner = new THREE.Mesh(new THREE.IcosahedronGeometry(.76, 1), new THREE.MeshStandardMaterial({ color: 0x314653, metalness: .7, roughness: .3, wireframe: true, emissive: 0x244b61, emissiveIntensity: .5 }));
      core.add(inner);
      const wire = new THREE.Mesh(new THREE.SphereGeometry(1.34, 18, 12), new THREE.MeshBasicMaterial({ color: 0x79c7ff, wireframe: true, transparent: true, opacity: .17 })); core.add(wire);
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x9baeb9, metalness: .92, roughness: .22, emissive: 0x14222c, emissiveIntensity: .35 });
      const spikeGeo = new THREE.ConeGeometry(.12, .43, 5);
      for (let i = 0; i < 18; i++) {
        const phi = Math.acos(-1 + (2 * i) / 18);
        const theta = Math.sqrt(18 * Math.PI) * phi;
        const direction = new THREE.Vector3(Math.cos(theta) * Math.sin(phi), Math.sin(theta) * Math.sin(phi), Math.cos(phi)).normalize();
        const mesh = new THREE.Mesh(spikeGeo, i % 4 === 0 ? new THREE.MeshStandardMaterial({ color: 0xff6238, metalness: .75, roughness: .3 }) : spikeMat);
        mesh.position.copy(direction.clone().multiplyScalar(1.2)); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction); core.add(mesh);
      }
      ringGroup = new THREE.Group(); scene.add(ringGroup);
      const ringMatA = new THREE.MeshBasicMaterial({ color: 0x79c7ff, transparent: true, opacity: .72 });
      const ringMatB = new THREE.MeshBasicMaterial({ color: 0xff6238, transparent: true, opacity: .7 });
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.72, .009, 6, 180), ringMatA); ring1.rotation.set(.8, .25, .15); ringGroup.add(ring1);
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.02, .006, 6, 180), ringMatB); ring2.rotation.set(1.18, -.55, .5); ringGroup.add(ring2);
      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.48, .005, 6, 180), ringMatA.clone()); ring3.rotation.set(.15, .9, .2); ringGroup.add(ring3);
      const particleCount = window.innerWidth < 700 ? 280 : 650;
      const positions = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - .5) * 12;
        positions[i * 3 + 1] = (Math.random() - .5) * 8;
        positions[i * 3 + 2] = (Math.random() - .5) * 5 - 1;
      }
      const particleGeo = new THREE.BufferGeometry(); particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particlePoints = new THREE.Points(particleGeo, new THREE.PointsMaterial({ color: 0x9fc8df, size: .012, transparent: true, opacity: .55, sizeAttenuation: true })); scene.add(particlePoints);

      let pointerX = 0, pointerY = 0, targetX = 0, targetY = 0;
      canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); targetX = ((e.clientX - r.left) / r.width - .5) * .8; targetY = ((e.clientY - r.top) / r.height - .5) * .6; }, { passive: true });
      const resize = () => {
        const w = canvas.clientWidth || canvas.parentElement.clientWidth;
        const h = canvas.clientHeight || window.innerHeight;
        if (!w || !h) return;
        camera.aspect = w / h; camera.position.z = window.innerWidth < 650 ? 10.8 : 9.2; camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
      };
      window.addEventListener('resize', resize, { passive: true }); resize();
      let previousScroll = window.scrollY;
      const render = () => {
        animationFrame = requestAnimationFrame(render);
        const scroll = window.scrollY;
        const heroHeight = Math.max(1, hero?.offsetHeight || window.innerHeight);
        const scrollMix = Math.min(1, scroll / heroHeight);
        pointerX += (targetX - pointerX) * .035; pointerY += (targetY - pointerY) * .035;
        core.rotation.y += .003; core.rotation.x += .0013;
        core.rotation.y += pointerX * .0015;
        core.rotation.x += pointerY * .001;
        core.position.y = Math.sin(performance.now() * .0005) * .08 - scrollMix * .9;
        core.scale.setScalar(1 - scrollMix * .22);
        ringGroup.rotation.y += .0015; ringGroup.rotation.z -= .0007;
        ringGroup.position.y = core.position.y * .45;
        ringGroup.rotation.x += pointerY * .0004;
        particlePoints.rotation.y += .0001;
        camera.position.x += (pointerX * .25 - camera.position.x) * .02;
        camera.position.y += (-pointerY * .2 - camera.position.y) * .02;
        camera.lookAt(0, -.1 - scrollMix * .4, 0);
        renderer.render(scene, camera);
        previousScroll = scroll;
      };
      render();
      document.addEventListener('visibilitychange', () => { if (document.hidden && animationFrame) cancelAnimationFrame(animationFrame); else if (!document.hidden && renderer) render(); });
    } catch (error) {
      console.warn('3D scene unavailable; CSS visual fallback remains active.', error);
      if (renderer) renderer.dispose();
      canvas.style.display = 'none';
    }
  }

  // Progressive enhancement for scroll reveals; no dependency on GSAP.
  function initMotion() {
    const revealSelectors = '.section-heading-row, .explorer-visual, .explore-item, .feature-competition, .challenge-card, .workshop-card, .manifesto-content, .final-cta h2';
    const elements = $$(revealSelectors);
    if (reducedMotion || !('IntersectionObserver' in window)) return;
    elements.forEach(el => { el.classList.add('will-reveal'); });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .12, rootMargin: '0px 0px -35px 0px' });
    elements.forEach(el => observer.observe(el));

    if (window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.utils.toArray('.hero-stage .stage-ring').forEach((ring, i) => {
        gsap.to(ring, { rotation: i ? 120 : -70, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
      });
      gsap.to('.manifesto-orbit', { rotation: 130, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: 1.5 } });
    }
  }

  // Wait until defer-loaded libraries are ready (DOMContentLoaded occurs after defer scripts).
  initThree();
  initMotion();
})();
