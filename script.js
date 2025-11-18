document.addEventListener('DOMContentLoaded', () => {
    const app = {
        // DOM Elements
        elements: {
            editor: document.getElementById('editor'),
            toggleDarkModeButton: document.getElementById('toggle-dark-mode'),
            toolbar: document.querySelector('.toolbar'),
            folderList: document.getElementById('folder-list'),
            noteList: document.getElementById('note-list'),
            addFolderButton: document.getElementById('add-folder'),
            addNoteButton: document.getElementById('add-note'),
            noteTitle: document.getElementById('note-title'),
            searchInput: document.getElementById('search-input'),
            colorPicker: document.getElementById('color-picker'),
            imageUpload: document.getElementById('image-upload'),
            imagePreviewContainer: document.getElementById('image-preview-container'),
            toggleGalleryButton: document.getElementById('toggle-gallery'),
            noteViewContainer: document.getElementById('note-view-container'),
            sidebarToggle: document.getElementById('sidebar-toggle'),
        },

        // Data
        data: {
            folders: [],
            notes: {},
        },

        // State
        state: {
            activeFolderId: null,
            activeNoteId: null,
            searchTerm: '',
            renamingId: null,
            galleryView: false,
        },

        // Initialization
        init() {
            this.loadData();
            this.addEventListeners();
            this.render();
        },

        // Data Handling
        loadData() {
            const savedData = JSON.parse(localStorage.getItem('memoAppData'));
            if (savedData) {
                this.data = savedData;
                this.state.activeFolderId = localStorage.getItem('memoAppActiveFolderId');
                this.state.activeNoteId = localStorage.getItem('memoAppActiveNoteId');
                this.state.galleryView = localStorage.getItem('memoAppGalleryView') === 'true';
            }

            if (this.data.folders.length === 0) {
                this.createNewFolder('기본 폴더');
                return; // createNewFolder handles rendering and saving
            }
            
            if (!this.state.activeFolderId || !this.data.folders.find(f => f.id === this.state.activeFolderId)) {
                this.state.activeFolderId = this.data.folders[0].id;
            }

            const activeFolder = this.data.folders.find(f => f.id === this.state.activeFolderId);
            if (activeFolder && activeFolder.notes.length === 0) {
                this.createNewNote();
                 return; // createNewNote handles rendering and saving
            }

            if (!this.state.activeNoteId || !this.data.notes[this.state.activeNoteId]) {
                this.state.activeNoteId = activeFolder ? activeFolder.notes[0] : null;
            }
        },

        saveData() {
            localStorage.setItem('memoAppData', JSON.stringify(this.data));
            localStorage.setItem('memoAppActiveFolderId', this.state.activeFolderId);
            localStorage.setItem('memoAppActiveNoteId', this.state.activeNoteId);
            localStorage.setItem('memoAppGalleryView', this.state.galleryView);
        },

        // Rendering
        render() {
            this.renderFolders();
            this.renderNotes();
            this.renderEditor();
            this.applyDarkMode();
        },

        renderFolders() {
            this.elements.folderList.innerHTML = '';
            this.data.folders.forEach(folder => {
                const li = this.createListItem(folder, 'folder');
                this.elements.folderList.appendChild(li);
            });
        },

        renderNotes() {
            this.elements.noteList.innerHTML = '';
            this.elements.noteList.classList.toggle('gallery-view', this.state.galleryView);
            this.elements.toggleGalleryButton.innerHTML = this.state.galleryView ? '<i class="fa-solid fa-list"></i>' : '<i class="fa-solid fa-grip"></i>';

            let notesToRender = [];

            if (this.state.searchTerm) {
                const lowerCaseSearchTerm = this.state.searchTerm.toLowerCase();
                for (const noteId in this.data.notes) {
                    const note = this.data.notes[noteId];
                    const div = document.createElement('div');
                    div.innerHTML = note.content;
                    const contentText = div.textContent || div.innerText || "";
                    
                    if (note.title.toLowerCase().includes(lowerCaseSearchTerm) || contentText.toLowerCase().includes(lowerCaseSearchTerm)) {
                        notesToRender.push(note);
                    }
                }
            } else {
                const activeFolder = this.data.folders.find(f => f.id === this.state.activeFolderId);
                if (activeFolder) {
                    activeFolder.notes.forEach(noteId => {
                        const note = this.data.notes[noteId];
                        if (note) {
                            notesToRender.push(note);
                        }
                    });
                }
            }

            notesToRender.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            notesToRender.sort((a, b) => (b.pinned || false) - (a.pinned || false));

            notesToRender.forEach(note => {
                const li = this.createListItem(note, 'note');
                this.elements.noteList.appendChild(li);
            });
        },
        
        createListItem(item, type) {
            const li = document.createElement('li');
            li.dataset.id = item.id;

            const isActive = (type === 'folder' && item.id === this.state.activeFolderId && !this.state.searchTerm) ||
                             (type === 'note' && item.id === this.state.activeNoteId);
            if (isActive) {
                li.classList.add('active');
            }

            if (this.state.renamingId === item.id) {
                const input = document.createElement('input');
                input.type = 'text';
                input.value = item.name || item.title;
                input.addEventListener('blur', () => this.finishRename(item.id, input.value, type));
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        this.finishRename(item.id, input.value, type);
                    } else if (e.key === 'Escape') {
                        this.state.renamingId = null;
                        this.render();
                    }
                });
                li.appendChild(input);
                setTimeout(() => input.focus(), 0);
            } else {
                if (this.state.galleryView && type === 'note') {
                    if (item.image) {
                        const img = document.createElement('img');
                        img.src = item.image;
                        img.className = 'gallery-item-image';
                        li.appendChild(img);
                    } else {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'gallery-item-image';
                        li.appendChild(placeholder);
                    }
                }

                const nameSpan = document.createElement('span');
                nameSpan.textContent = item.name || item.title || '새 메모';
                nameSpan.className = 'list-item-name';
                li.appendChild(nameSpan);

                if (type === 'note' && item.updatedAt) {
                    const dateSpan = document.createElement('span');
                    dateSpan.className = 'list-item-date';
                    dateSpan.textContent = new Date(item.updatedAt).toLocaleDateString();
                    li.appendChild(dateSpan);
                }

                const buttons = document.createElement('div');
                buttons.className = 'list-item-buttons';
                
                if (type === 'note') {
                    const pinBtn = document.createElement('button');
                    pinBtn.innerHTML = item.pinned ? '<i class="fa-solid fa-thumbtack"></i>' : '<i class="fa-solid fa-thumbtack fa-rotate-90"></i>';
                    pinBtn.dataset.action = 'pin';
                    pinBtn.classList.add('pin-button');
                    if (item.pinned) pinBtn.classList.add('pinned');
                    buttons.appendChild(pinBtn);
                }

                const renameBtn = document.createElement('button');
                renameBtn.innerHTML = '<i class="fa-solid fa-pencil"></i>';
                renameBtn.dataset.action = 'rename';
                buttons.appendChild(renameBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
                deleteBtn.dataset.action = 'delete';
                buttons.appendChild(deleteBtn);
                
                li.appendChild(buttons);
            }

            return li;
        },

        renderEditor() {
            const note = this.data.notes[this.state.activeNoteId];
            this.elements.imagePreviewContainer.innerHTML = '';
            if (note) {
                this.elements.noteViewContainer.style.display = 'flex';
                this.elements.noteTitle.value = note.title;
                this.elements.editor.innerHTML = note.content;
                this.elements.noteTitle.disabled = false;
                this.elements.editor.setAttribute('contenteditable', true);

                if (note.image) {
                    const img = document.createElement('img');
                    img.src = note.image;
                    const removeBtn = document.createElement('button');
                    removeBtn.id = 'remove-image-button';
                    removeBtn.innerHTML = '&times;';
                    removeBtn.addEventListener('click', () => this.removeImage());
                    this.elements.imagePreviewContainer.appendChild(img);
                    this.elements.imagePreviewContainer.appendChild(removeBtn);
                }
            } else {
                this.elements.noteTitle.value = '메모를 선택하세요';
                this.elements.editor.innerHTML = '';
                this.elements.noteTitle.disabled = true;
                this.elements.editor.setAttribute('contenteditable', false);
            }
        },

        applyDarkMode() {
            if (localStorage.getItem('darkMode') === 'enabled') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
        },

        // Event Listeners
        addEventListeners() {
            this.elements.toggleDarkModeButton.addEventListener('click', () => this.toggleDarkMode());
            this.elements.addFolderButton.addEventListener('click', () => this.createNewFolder());
            this.elements.addNoteButton.addEventListener('click', () => this.createNewNote());
            this.elements.folderList.addEventListener('click', (e) => this.handleListClick(e, 'folder'));
            this.elements.noteList.addEventListener('click', (e) => this.handleListClick(e, 'note'));
            this.elements.noteTitle.addEventListener('input', (e) => this.handleTitleChange(e));
            this.elements.editor.addEventListener('input', () => this.handleEditorInput());
            this.elements.toolbar.addEventListener('click', (e) => this.handleToolbarClick(e));
            this.elements.toolbar.addEventListener('change', (e) => this.handleToolbarChange(e));
            this.elements.searchInput.addEventListener('input', (e) => this.handleSearch(e));
            this.elements.colorPicker.addEventListener('input', (e) => this.handleToolbarChange(e));
            this.elements.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
            this.elements.toggleGalleryButton.addEventListener('click', () => this.toggleGalleryView());
            this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebars());
        },

        toggleGalleryView() {
            this.state.galleryView = !this.state.galleryView;
            this.saveData();
            this.renderNotes();
        },

        toggleSidebars() {
            document.body.classList.toggle('sidebars-visible');
        },

        // Event Handlers
        handleImageUpload(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const note = this.data.notes[this.state.activeNoteId];
                if (note) {
                    note.image = event.target.result;
                    this.updateNoteTimestamp();
                    this.renderEditor();
                    this.renderNotes();
                }
            };
            reader.readAsDataURL(file);
        },

        removeImage() {
            const note = this.data.notes[this.state.activeNoteId];
            if (note) {
                note.image = null;
                this.updateNoteTimestamp();
                this.renderEditor();
                this.renderNotes();
            }
        },

        handleListClick(e, type) {
            if (document.body.classList.contains('sidebars-visible')) {
                this.toggleSidebars();
            }

            const li = e.target.closest('li');
            if (!li) return;

            const id = li.dataset.id;
            const action = e.target.closest('button')?.dataset.action;

            if (action === 'rename') {
                this.state.renamingId = id;
                this.render();
            } else if (action === 'delete') {
                if (type === 'folder') this.deleteFolder(id);
                if (type === 'note') this.deleteNote(id);
            } else if (action === 'pin') {
                this.togglePinNote(id);
            } else {
                if (type === 'folder') {
                    this.handleFolderSelect(id);
                } else { // note
                    this.handleNoteSelect(id);
                }
            }
        },
        
        finishRename(id, newName, type) {
            if (type === 'folder') {
                const folder = this.data.folders.find(f => f.id === id);
                if (folder) folder.name = newName;
            } else { // note
                const note = this.data.notes[id];
                if (note) {
                    note.title = newName;
                    this.updateNoteTimestamp();
                }
            }
            this.state.renamingId = null;
            this.render();
        },

        deleteFolder(folderId) {
            if (!confirm('폴더를 삭제하면 포함된 모든 메모가 삭제됩니다. 계속하시겠습니까?')) return;

            const folder = this.data.folders.find(f => f.id === folderId);
            if (folder) {
                folder.notes.forEach(noteId => delete this.data.notes[noteId]);
            }
            this.data.folders = this.data.folders.filter(f => f.id !== folderId);

            if (this.state.activeFolderId === folderId) {
                this.state.activeFolderId = this.data.folders[0]?.id || null;
                this.state.activeNoteId = this.data.folders[0]?.notes[0] || null;
            }
            
            if (this.data.folders.length === 0) {
                this.createNewFolder('기본 폴더');
            }

            this.saveData();
            this.render();
        },

        deleteNote(noteId) {
            if (!confirm('메모를 삭제하시겠습니까?')) return;

            delete this.data.notes[noteId];
            this.data.folders.forEach(folder => {
                folder.notes = folder.notes.filter(id => id !== noteId);
            });

            if (this.state.activeNoteId === noteId) {
                const activeFolder = this.data.folders.find(f => f.id === this.state.activeFolderId);
                this.state.activeNoteId = activeFolder?.notes[0] || null;
            }
            
            const activeFolder = this.data.folders.find(f => f.id === this.state.activeFolderId);
            if (activeFolder && activeFolder.notes.length === 0) {
                this.createNewNote();
            }

            this.saveData();
            this.render();
        },

        togglePinNote(noteId) {
            const note = this.data.notes[noteId];
            if (note) {
                note.pinned = !note.pinned;
                this.saveData();
                this.renderNotes(); // Re-render notes to apply sorting
            }
        },

        handleSearch(e) {
            this.state.searchTerm = e.target.value;
            this.render();
        },

        toggleDarkMode() {
            document.body.classList.toggle('dark-mode');
            const darkMode = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', darkMode ? 'enabled' : 'disabled');
            this.applyDarkMode();
        },

        createNewFolder(name = '새 폴더') {
            const newFolder = { id: `folder_${Date.now()}`, name, notes: [] };
            this.data.folders.push(newFolder);
            this.state.activeFolderId = newFolder.id;
            this.createNewNote(); // This will save and render
        },

        createNewNote() {
            const activeFolder = this.data.folders.find(f => f.id === this.state.activeFolderId);
            if (!activeFolder) return;
            const now = new Date().toISOString();
            const newNote = { 
                id: `note_${Date.now()}`, 
                title: '새 메모', 
                content: '', 
                pinned: false, 
                image: null,
                createdAt: now,
                updatedAt: now
            };
            this.data.notes[newNote.id] = newNote;
            activeFolder.notes.unshift(newNote.id);
            this.state.activeNoteId = newNote.id;
            this.saveData();
            this.render();
        },

        updateNoteTimestamp() {
            const note = this.data.notes[this.state.activeNoteId];
            if (note) {
                note.updatedAt = new Date().toISOString();
                this.saveData();
            }
        },

        handleFolderSelect(folderId) {
            this.elements.searchInput.value = '';
            this.state.searchTerm = '';
            this.state.activeFolderId = folderId;
            const activeFolder = this.data.folders.find(f => f.id === folderId);
            if (activeFolder.notes.length > 0) {
                this.state.activeNoteId = activeFolder.notes[0];
            } else {
                this.createNewNote();
                return;
            }
            this.saveData();
            this.render();
        },

        handleNoteSelect(noteId) {
            this.state.activeNoteId = noteId;
            if (this.state.searchTerm) {
                const folder = this.data.folders.find(f => f.notes.includes(noteId));
                if (folder) this.state.activeFolderId = folder.id;
            }
            this.saveData();
            this.render();
        },

        handleTitleChange(e) {
            const note = this.data.notes[this.state.activeNoteId];
            if (note) {
                note.title = e.target.value;
                this.updateNoteTimestamp();
                this.renderNotes();
            }
        },

        handleEditorInput() {
            const note = this.data.notes[this.state.activeNoteId];
            if (note) {
                note.content = this.elements.editor.innerHTML;
                this.updateNoteTimestamp();
            }
        },

        handleToolbarClick(e) {
            const button = e.target.closest('button');
            if (button && button.dataset.command) {
                document.execCommand(button.dataset.command, false, null);
                this.elements.editor.focus();
            }
        },

        handleToolbarChange(e) {
            const select = e.target.closest('select');
            if (select && select.dataset.command) {
                document.execCommand(select.dataset.command, false, select.value);
                this.elements.editor.focus();
            }
        },
    };

    app.init();
});
