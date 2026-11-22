// SistemCar – script comun: meniu, formulare Netlify cu micșorare poze, ferestre legale
{
  const MAX_TOTAL = 7 * 1024 * 1024;   // Netlify acceptă max. 8 MB pe trimitere; păstrăm o marjă
  const MAX_PHOTOS = 8;
  const MAX_SIDE = 1600;               // latura maximă a pozei după micșorare
  const isLive = /sistemcar\.ro$|netlify\.app$/.test(location.hostname);

  // Meniu mobil
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', open);
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    }));
  }

  // Micșorează o poză în browser (o poză de iPhone de 4 MB ajunge la ~300 KB)
  const shrink = file => new Promise(resolve => {
    if (!file.type.startsWith('image/')) return resolve(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => {
        URL.revokeObjectURL(url);
        if (!b) return resolve(file);
        const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
        resolve(new File([b], name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.8);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });

  const fmt = n => (n / 1024 / 1024).toFixed(1) + ' MB';

  // Câmpuri de încărcare poze: listă + micșorare imediată
  document.querySelectorAll('.upload input[type=file]').forEach(input => {
    const box = input.closest('.upload');
    const list = box.querySelector('.files');
    input._ready = [];
    input.addEventListener('change', async () => {
      const picked = [...input.files].slice(0, MAX_PHOTOS);
      list.innerHTML = '<li>Se pregătesc pozele…</li>';
      input._ready = await Promise.all(picked.map(shrink));
      const total = input._ready.reduce((s, f) => s + f.size, 0);
      list.innerHTML = input._ready.map(f => `<li><span>${f.name}</span><span>${fmt(f.size)}</span></li>`).join('');
      if (input.files.length > MAX_PHOTOS) list.innerHTML += `<li class="warn">Am păstrat primele ${MAX_PHOTOS} poze. Restul le poți trimite pe WhatsApp.</li>`;
      if (total > MAX_TOTAL) list.innerHTML += '<li class="warn">Pozele sunt prea mari împreună. Alege mai puține sau trimite-le pe WhatsApp.</li>';
    });
  });

  // Trimitere formulare către Netlify
  document.querySelectorAll('form[data-netlify]').forEach(form => {
    const btn = form.querySelector('button[type=submit]');
    const status = form.querySelector('.status');
    const label = btn.innerHTML;
    const say = (msg, kind) => { status.textContent = msg; status.className = 'status ' + kind; };

    form.addEventListener('submit', async e => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      let total = 0;
      form.querySelectorAll('.upload input[type=file]').forEach(input => {
        data.delete(input.name);
        (input._ready || []).forEach(f => { data.append(input.name, f, f.name); total += f.size; });
      });
      if (total > MAX_TOTAL) {
        say('Pozele depășesc 7 MB împreună. Alege mai puține poze sau trimite-le pe WhatsApp la 0746 089 174.', 'err');
        return;
      }
      if (!isLive) {
        say('Aceasta e o previzualizare. Formularul trimite date doar pe sistemcar.ro.', 'info');
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Se trimite…';
      try {
        const res = await fetch('/', { method: 'POST', body: data });
        if (!res.ok) throw new Error(res.status);
        form.reset();
        form.querySelectorAll('.files').forEach(l => l.innerHTML = '');
        form.querySelectorAll('.upload input[type=file]').forEach(i => i._ready = []);
        say(form.dataset.ok || 'Am primit cererea. Te sunăm în cel mai scurt timp, în programul de lucru.', 'ok');
      } catch (err) {
        say('Cererea nu a putut fi trimisă. Sună-ne la 0746 089 174 sau trimite pozele pe WhatsApp.', 'err');
      } finally {
        btn.disabled = false;
        btn.innerHTML = label;
      }
    });
  });

  // Ferestre: email și informații legale
  const openDialog = (id, section) => {
    const d = document.getElementById(id);
    if (!d) return;
    d.showModal();
    if (section) d.querySelector('#' + section)?.scrollIntoView();
  };
  document.querySelectorAll('[data-open]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    openDialog(a.dataset.open, a.dataset.section);
  }));
  document.querySelectorAll('dialog').forEach(d => {
    d.querySelector('.close')?.addEventListener('click', () => d.close());
    d.addEventListener('click', e => { if (e.target === d) d.close(); });
  });

  // Galerie înainte / după: butoane de comutare
  document.querySelectorAll('.pair').forEach(p => {
    p.querySelectorAll('.toggle button').forEach(b => b.addEventListener('click', () => {
      p.dataset.show = b.dataset.show;
      p.querySelectorAll('.toggle button').forEach(x => x.setAttribute('aria-pressed', x === b));
    }));
  });

  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}
