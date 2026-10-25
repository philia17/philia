async function openRecordShelf() {
  const response = await fetch('/philia/assets/records.json');
  const records = await response.json();
  const rack = document.querySelector('.record-rack');
  const dialog = document.querySelector('#record-dialog');
  const memory = document.querySelector('#record-memory');
  const form = document.querySelector('.memory-form');
  const draft = document.querySelector('#memory-draft');
  const status = document.querySelector('.memory-save-status');
  const editButton = document.querySelector('[data-edit-memory]');
  const localPreview = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  let activeRecord;

  function savedMemory(record) {
    if (!localPreview) return record.memory;
    return localStorage.getItem(`philia.memory.${record.id}`) ?? record.memory;
  }

  function showMemory() {
    const text = savedMemory(activeRecord);
    memory.textContent = text || 'a memory waiting for its words.';
    memory.classList.toggle('memory-is-empty', !text);
  }

  function updateMemoryLabels() {
    let count = 0;
    records.forEach(record => {
      const text = savedMemory(record);
      if (text) count += 1;
      const tag = document.querySelector(`[data-record="${record.id}"] .record-memory-tag`);
      tag.textContent = !text ? '' : text === record.memory && record.place ? `${record.place} · ${record.year}` : 'a memory inside';
    });
    document.querySelector('.shelf-caption span').textContent = `${records.length} songs · ${count} memories, so far`;
  }

  document.querySelector('.local-memory-tools').hidden = !localPreview;
  updateMemoryLabels();
  document.querySelectorAll('[data-record]').forEach(button => {
    button.addEventListener('click', () => {
      activeRecord = records.find(record => record.id === button.dataset.record);
      document.querySelector('#record-title').textContent = activeRecord.title;
      document.querySelector('#record-artist').textContent = activeRecord.artist;
      const cover = document.querySelector('#record-cover');
      cover.src = activeRecord.cover;
      cover.alt = `${activeRecord.title} — ${activeRecord.artist} cover art`;
      document.querySelector('#record-listen').href = activeRecord.url;
      form.hidden = true;
      editButton.hidden = false;
      status.textContent = '';
      showMemory();
      dialog.showModal();
      document.body.classList.add('memory-open');
    });
  });

  document.querySelector('.record-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    }
  });
  dialog.addEventListener('close', () => document.body.classList.remove('memory-open'));

  editButton.addEventListener('click', () => {
    draft.value = savedMemory(activeRecord);
    form.hidden = false;
    editButton.hidden = true;
    status.textContent = '';
    draft.focus();
  });
  document.querySelector('[data-cancel-memory]').addEventListener('click', () => {
    form.hidden = true;
    editButton.hidden = false;
    editButton.focus();
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    localStorage.setItem(`philia.memory.${activeRecord.id}`, draft.value.trim().toLowerCase());
    showMemory();
    updateMemoryLabels();
    form.hidden = true;
    editButton.hidden = false;
    status.textContent = 'saved in this browser.';
    editButton.focus();
  });
  document.querySelector('[data-export-memories]').addEventListener('click', () => {
    const content = records.map(record => ({id: record.id, title: record.title, artist: record.artist, memory: savedMemory(record)}));
    const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'philia-memories.json';
    link.click();
    URL.revokeObjectURL(url);
  });

  const controls = document.querySelectorAll('[data-rack-direction]');
  function updateRackControls() {
    controls.forEach(button => {
      button.disabled = Number(button.dataset.rackDirection) < 0 ? rack.scrollLeft <= 2 : rack.scrollLeft >= rack.scrollWidth - rack.clientWidth - 2;
    });
  }
  controls.forEach(button => button.addEventListener('click', () => {
    const width = rack.querySelector('.record').getBoundingClientRect().width + parseFloat(getComputedStyle(rack).columnGap);
    rack.scrollBy({left: width * Number(button.dataset.rackDirection), behavior: reducedMotion.matches ? 'instant' : 'smooth'});
  }));
  rack.addEventListener('scroll', updateRackControls, {passive: true});
  window.addEventListener('resize', updateRackControls);
  updateRackControls();
}

openRecordShelf().catch(() => {
  document.querySelector('#shelf-note').textContent = 'the memories could not be loaded. please refresh to try again.';
});
