Document.addEventListener('DOMContentLoaded', () => {
const state = {
activePage: 'workspace',
isSandbox: false,
timer: null
};
const elements = {
    navItems: document.querySelectorAll('.nav-item'),
    pages: document.querySelectorAll('.page'),
    html: document.getElementById('builderHtml'),
    css: document.getElementById('builderCss'),
    js: document.getElementById('builderJs'),
    preview: document.getElementById('builderPreview'),
    previewError: document.getElementById('previewError'),
    saveStatus: document.getElementById('saveStatus'),
    saveBtn: document.getElementById('saveWork'),
    restoreBtn: document.getElementById('restoreStable'),
    snapBtn: document.getElementById('saveSnapshot'),
    snapName: document.getElementById('snapshotName'),
    snapList: document.getElementById('snapshotList'),
    sandbox: document.getElementById('sandboxToggle'),
    promptMode: document.getElementById('promptMode'),
    promptTarget: document.getElementById('promptTarget'),
    promptScope: document.getElementById('promptScope'),
    promptConstraints: document.getElementById('promptConstraints'),
    promptOutput: document.getElementById('promptOutput'),
    genPromptBtn: document.getElementById('generatePrompt'),
    copyPromptBtn: document.getElementById('copyPrompt'),
    memSection: document.getElementById('memorySection'),
    memNotes: document.getElementById('memoryNotes'),
    saveMemBtn: document.getElementById('saveMemory'),
    noteCat: document.getElementById('notesCategory'),
    noteIn: document.getElementById('notesInput'),
    saveNoteBtn: document.getElementById('saveNote'),
    notesList: document.getElementById('notesList'),
    scopeIn: document.getElementById('scopeInput'),
    addScopeBtn: document.getElementById('addScopeItem'),
    scopeList: document.getElementById('scopeChecklist'),
    favList: document.getElementById('favoritesList'),
    actList: document.getElementById('actionsList'),
    exportZip: document.getElementById('exportZip')
};

const logAction = (category, label, description) => {
    const actions = JSON.parse(localStorage.getItem('fr_builder_actions') || '[]');
    actions.unshift({
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        category,
        label,
        description
    });
    localStorage.setItem('fr_builder_actions', JSON.stringify(actions.slice(0, 50)));
    renderActions();
};

const updateStatus = (text, type) => {
    if (!elements.saveStatus) return;
    elements.saveStatus.textContent = state.isSandbox ? 'Sandbox mode' : text;
    elements.saveStatus.className = `status-pill ${type || ''}`;
};

const renderPreview = () => {
    const htmlVal = elements.html?.value || '';
    const cssVal = elements.css?.value || '';
    const jsVal = elements.js?.value || '';
    
    if (!elements.preview) return;

    try {
        const doc = elements.preview.contentDocument || elements.preview.contentWindow.document;
        const content = `<!DOCTYPE html>

<html>
<head>
<style>
${cssVal}
</style>
</head>
<body>
${htmlVal}
<script>
try {
${jsVal}
} catch (err) {
window.parent.postMessage({type: 'error', msg: err.message}, '*');
}
</script>
</body>
</html>`;
        doc.open();
        doc.write(content);
        doc.close();

        if (elements.previewError) {
            elements.previewError.style.display = 'none';
        }
    } catch (err) {
        if (elements.previewError) {
            elements.previewError.style.display = 'block';
            elements.previewError.textContent = `Render Error: ${err.message}`;
        }
    }
};

window.addEventListener('message', (e) => {
    if (e.data.type === 'error' && elements.previewError) {
        elements.previewError.textContent = `Runtime Error: ${e.data.msg}`;
        elements.previewError.style.display = 'block';
    }
});

const autoSave = () => {
    localStorage.setItem('fr_builder_html', elements.html?.value || '');
    localStorage.setItem('fr_builder_css', elements.css?.value || '');
    localStorage.setItem('fr_builder_js', elements.js?.value || '');
    updateStatus('Unsaved changes', 'unsaved');
    
    clearTimeout(state.timer);
    state.timer = setTimeout(() => {
        updateStatus('Draft saved', 'saved');
    }, 2000);
    renderPreview();
};

const switchPage = (pageId) => {
    elements.pages.forEach(p => p.style.display = p.id === pageId ? 'block' : 'none');
    elements.navItems.forEach(n => n.classList.toggle('active', n.dataset.page === pageId));
    state.activePage = pageId;
    logAction('Navigation', 'Switch Page', `Moved to ${pageId}`);
    if (pageId === 'notes') renderNotes();
    if (pageId === 'scope') renderScope();
    if (pageId === 'favorites') renderFavorites();
    if (pageId === 'actions') renderActions();
};

const renderNotes = () => {
    const notes = JSON.parse(localStorage.getItem('fr_builder_notes') || '[]');
    if (!elements.notesList) return;
    elements.notesList.innerHTML = notes.map(n => `
        <div class="note-item">
            <strong>[${n.category}]</strong> ${n.text} 
            <small>${n.timestamp}</small>
        </div>
    `).join('');
};

const renderScope = () => {
    const scope = JSON.parse(localStorage.getItem('fr_builder_scope') || '[]');
    if (!elements.scopeList) return;
    elements.scopeList.innerHTML = scope.map(s => `
        <li>
            <input type="checkbox" ${s.done ? 'checked' : ''} onchange="toggleScope(${s.id})">
            <span>${s.text}</span>
        </li>
    `).join('');
};

const renderActions = () => {
    const actions = JSON.parse(localStorage.getItem('fr_builder_actions') || '[]');
    if (!elements.actList) return;
    elements.actList.innerHTML = actions.map(a => `
        <li>[${a.timestamp}] <strong>${a.label}</strong>: ${a.description}</li>
    `).join('');
};

const renderSnapshots = () => {
    const snaps = JSON.parse(localStorage.getItem('fr_builder_snapshots') || '[]');
    if (!elements.snapList) return;
    elements.snapList.innerHTML = snaps.map(s => `
        <li>
            <span>${s.name} (${s.time})</span>
            <button onclick="restoreSnapshot(${s.id})">Restore</button>
        </li>
    `).join('');
};

const renderFavorites = () => {
    const favs = JSON.parse(localStorage.getItem('fr_builder_favorites') || '[]');
    if (!elements.favList) return;
    elements.favList.innerHTML = favs.length ? favs.map(f => `<li>${f.name}</li>`).join('') : '<li>No favorites yet.</li>';
};

window.toggleScope = (id) => {
    let scope = JSON.parse(localStorage.getItem('fr_builder_scope') || '[]');
    scope = scope.map(s => s.id === id ? {...s, done: !s.done} : s);
    localStorage.setItem('fr_builder_scope', JSON.stringify(scope));
    renderScope();
};

window.restoreSnapshot = (id) => {
    const snaps = JSON.parse(localStorage.getItem('fr_builder_snapshots') || '[]');
    const snap = snaps.find(s => s.id === id);
    if (snap) {
        elements.html.value = snap.html;
        elements.css.value = snap.css;
        elements.js.value = snap.js;
        renderPreview();
        logAction('Restore', 'Snapshot', `Restored ${snap.name}`);
    }
};

elements.navItems.forEach(btn => btn.addEventListener('click', () => switchPage(btn.dataset.page)));

[elements.html, elements.css, elements.js].forEach(el => el?.addEventListener('input', autoSave));

elements.saveBtn?.addEventListener('click', () => {
    const data = { html: elements.html.value, css: elements.css.value, js: elements.js.value };
    localStorage.setItem('fr_builder_stable', JSON.stringify(data));
    logAction('Save', 'Stable Draft', 'Manual save triggered');
    updateStatus('Draft saved', 'saved');
});

elements.restoreBtn?.addEventListener('click', () => {
    const stable = JSON.parse(localStorage.getItem('fr_builder_stable'));
    if (stable) {
        elements.html.value = stable.html;
        elements.css.value = stable.css;
        elements.js.value = stable.js;
        renderPreview();
        logAction('Restore', 'Stable State', 'Restored from last manual save');
    }
});

elements.exportZip?.addEventListener('click', async () => {
    if (typeof JSZip === 'undefined') {
        alert("JSZip is required for ZIP export.");
        return;
    }

    const zip = new JSZip();
    const htmlString = `<!DOCTYPE html>

<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Fieldrate Export</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
${elements.html.value}
<script src="app.js"></script>
</body>
</html>`;
    zip.file("index.html", htmlString);
    zip.file("styles.css", elements.css.value);
    zip.file("app.js", elements.js.value);

    const content = await zip.generateAsync({type: "blob"});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = "fieldrate-export.zip";
    link.click();
    
    logAction('Export', 'ZIP Exported', 'Project exported as ZIP');
});

elements.snapBtn?.addEventListener('click', () => {
    const name = elements.snapName?.value || 'Untitled Snapshot';
    const snaps = JSON.parse(localStorage.getItem('fr_builder_snapshots') || '[]');
    snaps.unshift({
        id: Date.now(),
        name,
        time: new Date().toLocaleString(),
        html: elements.html.value,
        css: elements.css.value,
        js: elements.js.value
    });
    localStorage.setItem('fr_builder_snapshots', JSON.stringify(snaps));
    elements.snapName.value = '';
    renderSnapshots();
    logAction('Snapshot', 'Created', name);
});

elements.genPromptBtn?.addEventListener('click', () => {
    const prompt = `Task: Build ${elements.promptTarget?.value || 'feature'}

Mode: ${elements.promptMode?.value}
Scope: ${elements.promptScope?.value}
Constraints: ${elements.promptConstraints?.value}
Instructions:
 * Output raw code only
 * No markdown fences
 * No explanations
 * No extra text`;
   elements.promptOutput.value = prompt;
   });
   elements.copyPromptBtn?.addEventListener('click', () => {
   elements.promptOutput.select();
   document.execCommand('copy');
   logAction('Prompt', 'Copied', 'Gemini prompt copied to clipboard');
   });
   elements.saveMemBtn?.addEventListener('click', () => {
   const section = elements.memSection.value;
   localStorage.setItem(fr_builder_memory_${section}, elements.memNotes.value);
   logAction('Memory', 'Saved', Updated memory for ${section});
   });
   elements.memSection?.addEventListener('change', () => {
   elements.memNotes.value = localStorage.getItem(fr_builder_memory_${elements.memSection.value}) ||
   '';
   });
   elements.saveNoteBtn?.addEventListener('click', () => {
   const notes = JSON.parse(localStorage.getItem('fr_builder_notes') || '[]');
   notes.unshift({
   id: Date.now(),
   category: elements.noteCat.value,
   text: elements.noteIn.value,
   timestamp: new Date().toLocaleString()
   });
   localStorage.setItem('fr_builder_notes', JSON.stringify(notes));
   elements.noteIn.value = '';
   renderNotes();
   logAction('Note', 'Created', 'New session note added');
   });
   elements.addScopeBtn?.addEventListener('click', () => {
   const scope = JSON.parse(localStorage.getItem('fr_builder_scope') || '[]');
   scope.push({
   id: Date.now(),
   text: elements.scopeIn.value,
   done: false
   });
   localStorage.setItem('fr_builder_scope', JSON.stringify(scope));
   elements.scopeIn.value = '';
   renderScope();
   logAction('Scope', 'Added', 'New scope item');
   });
   elements.sandbox?.addEventListener('change', (e) => {
   state.isSandbox = e.target.checked;
   updateStatus(state.isSandbox ? 'Sandbox mode' : 'Draft saved', 'saved');
   });
   if (elements.html) elements.html.value = localStorage.getItem('fr_builder_html') || '';
   if (elements.css) elements.css.value = localStorage.getItem('fr_builder_css') || '';
   if (elements.js) elements.js.value = localStorage.getItem('fr_builder_js') || '';
   switchPage('workspace');
   renderPreview();
   renderSnapshots();
   });
// ===== FIXED EXPORT ZIP =====
(function () {
  const btn = document.getElementById("exportZip");
  if (!btn) return;

  btn.onclick = async () => {
    if (typeof JSZip === "undefined") {
      alert("JSZip is required for ZIP export.");
      return;
    }

    const zip = new JSZip();

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>FieldRate Export</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>

${document.getElementById("builderHtml")?.value || ""}

<script src="app.js"><\/script>
</body>
</html>`;

    const cssContent = document.getElementById("builderCss")?.value || "";
    const jsContent = document.getElementById("builderJs")?.value || "";

    zip.file("index.html", htmlContent);
    zip.file("styles.css", cssContent);
    zip.file("app.js", jsContent);

    const blob = await zip.generateAsync({ type: "blob" });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "fieldrate-export.zip";
    a.click();
  };
})();