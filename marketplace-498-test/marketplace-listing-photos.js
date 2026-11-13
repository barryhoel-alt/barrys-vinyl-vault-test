(() => {
  const bucket = 'marketplace-listing-photos';
  const maxPhotos = 6;
  const maxBytes = 5 * 1024 * 1024;
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

  function editor(form) {
    const group = document.createElement('fieldset');
    group.innerHTML = `<legend>Photos of your item</legend>
      <p class="muted">Show the item buyers will receive. For vinyl, show the sleeve, both sides and close-ups of wear. Up to six JPEG, PNG or WebP photos, 5 MB each.</p>
      <label>Upload photos <input type="file" accept="image/jpeg,image/png,image/webp" multiple></label>
      <label>Take a photo <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment"></label>
      <p role="status" aria-live="polite"></p><ol></ol>`;
    const inputs = group.querySelectorAll('input');
    const status = group.querySelector('[role="status"]');
    const list = group.querySelector('ol');
    form.querySelector('[type="submit"], button:not([type])').before(group);
    let items = [];
    let project = '';
    let savedPaths = [];

    function draw() {
      list.replaceChildren();
      items.forEach((item, index) => {
        const row = document.createElement('li');
        const img = document.createElement('img');
        img.src = item.preview || photoUrl(project, item.path);
        img.alt = 'Item photo ' + (index + 1);
        img.width = 96;
        img.style.cssText = 'height:96px;object-fit:contain;vertical-align:middle';
        row.append(img, index === 0 ? ' Main photo ' : ' ');
        const controls = [
          ['Move earlier', index === 0, () => {
            [items[index - 1], items[index]] = [items[index], items[index - 1]];
          }],
          ['Move later', index === items.length - 1, () => {
            [items[index + 1], items[index]] = [items[index], items[index + 1]];
          }],
          ['Remove', false, () => {
            if (item.preview) URL.revokeObjectURL(item.preview);
            items.splice(index, 1);
          }],
        ];
        for (const [label, disabled, action] of controls) {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = label;
          button.disabled = disabled;
          button.setAttribute('aria-label', label + ' photo ' + (index + 1));
          button.onclick = () => { action(); draw(); };
          row.append(button);
        }
        list.append(row);
      });
    }

    for (const input of inputs) {
      input.onchange = () => {
        const files = [...input.files];
        input.value = '';
        if (items.length + files.length > maxPhotos) {
          status.textContent = 'Choose up to six photos total.';
          return;
        }
        if (files.some(file => !extensions[file.type] || !file.size || file.size > maxBytes)) {
          status.textContent = 'Choose JPEG, PNG or WebP photos up to 5 MB each.';
          return;
        }
        status.textContent = '';
        items.push(...files.map(file => ({ file, preview: URL.createObjectURL(file) })));
        draw();
      };
    }

    function reset(paths = [], url = '') {
      for (const item of items) if (item.preview) URL.revokeObjectURL(item.preview);
      project = url;
      savedPaths = paths;
      items = paths.map(path => ({ path }));
      status.textContent = '';
      draw();
    }
    form.addEventListener('reset', () => reset());
    return { group, reset, get items() { return items; }, get savedPaths() { return savedPaths; } };
  }

  function photoUrl(project, path) {
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(project || '') ||
        !/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path || '')) return '';
    return project.replace(/\/$/, '') + '/storage/v1/object/public/' + bucket + '/' + path;
  }

  async function save(form, editor, config, listingType, isNew, writeListing) {
    const submit = form.querySelector('[type="submit"], button:not([type])');
    if (submit.disabled) return;
    if (isNew && listingType !== 'trade' && !editor.items.length) {
      throw Error('Add at least one photo of your item before publishing a sale listing.');
    }

    const headers = { apikey: config.pub, Authorization: 'Bearer ' + config.token };
    const base = config.url.replace(/\/$/, '') + '/storage/v1/object/' + bucket;
    const uploaded = [];
    const paths = [];
    async function removeUnlinked(paths) {
      if (!paths.length) return;
      await fetch(base, {
        method: 'DELETE',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefixes: paths }),
      }).catch(() => {});
    }
    let writingListing = false;
    submit.disabled = true;
    editor.group.disabled = true;
    try {
      for (const item of editor.items) {
        if (!item.file) {
          paths.push(item.path);
          continue;
        }
        const path = config.uid + '/' + crypto.randomUUID() + '.' + extensions[item.file.type];
        uploaded.push(path);
        const response = await fetch(base + '/' + path, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': item.file.type },
          body: item.file,
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw Error(error.message || 'Photo upload failed (' + response.status + ').');
        }
        paths.push(path);
      }
      writingListing = true;
      await writeListing(paths);
      const removed = editor.savedPaths.filter(path => !paths.includes(path));
      editor.reset(paths, config.url);
      await removeUnlinked(removed);
    } catch (error) {
      // A lost listing response can hide a successful write. Preserve its uploaded files.
      if (!writingListing) await removeUnlinked(uploaded);
      throw error;
    } finally {
      submit.disabled = false;
      editor.group.disabled = false;
    }
  }

  window.vvListingPhotos = { editor, photoUrl, save };
})();
