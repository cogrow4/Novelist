import tkinter as tk
from tkinter import ttk, font as tkfont
from spellchecker import SpellChecker


class RichTextEditor(tk.Frame):
    """WYSIWYG rich text editor with formatting toolbar"""
    
    def __init__(self, parent, theme_manager, on_text_change=None):
        super().__init__(parent)
        self.theme = theme_manager
        self.on_text_change = on_text_change
        self.spell = SpellChecker()
        
        # Configure frame
        colors = self.theme.get_colors()
        self.configure(bg=colors["bg"])
        
        # Build toolbar
        self._build_toolbar()
        
        # Build editor
        self._build_editor()
        
        # Context menu for spell check
        self._menu = tk.Menu(self, tearoff=0)
        self.text.bind("<Button-3>", self._open_context_menu)
        self.text.bind("<Button-2>", self._open_context_menu)  # macOS
        
    def _build_toolbar(self):
        """Build formatting toolbar"""
        colors = self.theme.get_colors()
        
        toolbar = ttk.Frame(self, style="Toolbar.TFrame", height=50)
        toolbar.pack(fill="x", padx=10, pady=(10, 0))
        toolbar.pack_propagate(False)
        
        # Font family selector
        ttk.Label(toolbar, text="Font:", style="Secondary.TLabel").pack(side="left", padx=(0, 5))
        
        self.font_var = tk.StringVar(value="Helvetica")
        font_combo = ttk.Combobox(toolbar, textvariable=self.font_var, width=15, state="readonly")
        font_combo['values'] = sorted(list(tkfont.families()))
        font_combo.pack(side="left", padx=(0, 10))
        font_combo.bind("<<ComboboxSelected>>", lambda e: self._apply_font())
        
        # Font size selector
        ttk.Label(toolbar, text="Size:", style="Secondary.TLabel").pack(side="left", padx=(0, 5))
        
        self.size_var = tk.StringVar(value="14")
        size_combo = ttk.Combobox(toolbar, textvariable=self.size_var, width=5, state="readonly")
        size_combo['values'] = [str(i) for i in range(8, 73, 2)]
        size_combo.pack(side="left", padx=(0, 15))
        size_combo.bind("<<ComboboxSelected>>", lambda e: self._apply_font())
        
        # Separator
        sep = tk.Frame(toolbar, width=1, bg=colors["divider"])
        sep.pack(side="left", fill="y", padx=10)
        
        # Formatting buttons
        ttk.Button(toolbar, text="B", style="Toolbar.TButton", width=3,
                  command=self.toggle_bold).pack(side="left", padx=2)
        ttk.Button(toolbar, text="I", style="Toolbar.TButton", width=3,
                  command=self.toggle_italic).pack(side="left", padx=2)
        ttk.Button(toolbar, text="U", style="Toolbar.TButton", width=3,
                  command=self.toggle_underline).pack(side="left", padx=2)
        
        # Separator
        sep2 = tk.Frame(toolbar, width=1, bg=colors["divider"])
        sep2.pack(side="left", fill="y", padx=10)
        
        # Alignment buttons
        ttk.Button(toolbar, text="⬅", style="Toolbar.TButton", width=3,
                  command=lambda: self._set_alignment("left")).pack(side="left", padx=2)
        ttk.Button(toolbar, text="⬌", style="Toolbar.TButton", width=3,
                  command=lambda: self._set_alignment("center")).pack(side="left", padx=2)
        ttk.Button(toolbar, text="➡", style="Toolbar.TButton", width=3,
                  command=lambda: self._set_alignment("right")).pack(side="left", padx=2)
        
    def _build_editor(self):
        """Build the text editor widget"""
        colors = self.theme.get_colors()
        
        # Container for editor with padding
        editor_container = tk.Frame(self, bg=colors["bg"])
        editor_container.pack(fill="both", expand=True, padx=10, pady=10)
        
        # Text widget
        self.text = tk.Text(
            editor_container,
            wrap="word",
            undo=True,
            bg=colors["bg_editor"],
            fg=colors["fg_primary"],
            insertbackground=colors["fg_primary"],
            selectbackground=colors["bg_active"],
            selectforeground=colors["fg_primary"],
            relief="flat",
            borderwidth=0,
            padx=20,
            pady=20,
            spacing1=2,
            spacing2=2,
            spacing3=2
        )
        self.text.pack(fill="both", expand=True)
        
        # Configure default font
        self._apply_font()
        
        # Configure tags for formatting
        self._configure_tags()
        
        # Bind events
        self.text.bind("<<Modified>>", self._on_modified)
        self.text.bind("<KeyRelease>", self._on_key_release)
        
    def _configure_tags(self):
        """Configure text tags for formatting"""
        colors = self.theme.get_colors()
        
        # Font style tags
        self.text.tag_configure("bold", font=(self.font_var.get(), int(self.size_var.get()), "bold"))
        self.text.tag_configure("italic", font=(self.font_var.get(), int(self.size_var.get()), "italic"))
        self.text.tag_configure("underline", underline=True)
        self.text.tag_configure("bold_italic", font=(self.font_var.get(), int(self.size_var.get()), "bold italic"))
        
        # Alignment tags
        self.text.tag_configure("left", justify="left")
        self.text.tag_configure("center", justify="center")
        self.text.tag_configure("right", justify="right")
        
        # Spell check tag
        self.text.tag_configure("spell", underline=True, foreground="#e57373")
        
        # Heading tags
        for i in range(1, 7):
            size = int(self.size_var.get()) + (7 - i) * 4
            self.text.tag_configure(f"h{i}", font=(self.font_var.get(), size, "bold"))
    
    def _apply_font(self):
        """Apply selected font to editor"""
        font_family = self.font_var.get()
        font_size = int(self.size_var.get())
        
        # Update default font
        self.text.configure(font=(font_family, font_size))
        
        # Update tag fonts
        self._configure_tags()
    
    def toggle_bold(self):
        """Toggle bold formatting on selection"""
        self._toggle_tag("bold")
    
    def toggle_italic(self):
        """Toggle italic formatting on selection"""
        self._toggle_tag("italic")
    
    def toggle_underline(self):
        """Toggle underline formatting on selection"""
        self._toggle_tag("underline")
    
    def _toggle_tag(self, tag_name):
        """Toggle a tag on the current selection"""
        try:
            start = self.text.index("sel.first")
            end = self.text.index("sel.last")
        except tk.TclError:
            return
        
        # Check if tag is already applied
        if tag_name in self.text.tag_names(start):
            self.text.tag_remove(tag_name, start, end)
        else:
            self.text.tag_add(tag_name, start, end)
    
    def _set_alignment(self, align):
        """Set text alignment for current line"""
        try:
            start = self.text.index("insert linestart")
            end = self.text.index("insert lineend")
        except tk.TclError:
            return
        
        # Remove other alignment tags
        for tag in ["left", "center", "right"]:
            self.text.tag_remove(tag, start, end)
        
        # Apply new alignment
        self.text.tag_add(align, start, end)
    
    def get_content(self) -> str:
        """Get editor content"""
        return self.text.get("1.0", tk.END)
    
    def set_content(self, content: str):
        """Set editor content"""
        self.text.delete("1.0", tk.END)
        self.text.insert("1.0", content)
        self.text.edit_reset()
        self._run_spellcheck()
    
    def _on_modified(self, event=None):
        """Handle text modification"""
        self.text.edit_modified(0)
        if self.on_text_change:
            self.on_text_change()
    
    def _on_key_release(self, event=None):
        """Handle key release for spell check"""
        if event and event.keysym not in {"space", "Return", "BackSpace", "period", "comma"}:
            return
        self._run_spellcheck()
    
    def _run_spellcheck(self):
        """Run spell check on content"""
        self.text.tag_remove("spell", "1.0", tk.END)
        
        content = self.get_content()
        words = []
        idx = "1.0"
        word = ""
        pos_map = []
        
        while True:
            ch = self.text.get(idx)
            if ch == "\n" or ch == "":
                if word:
                    pos_map.append((start_idx, idx, word))
                    word = ""
                if self.text.compare(idx, ">=", tk.END):
                    break
                idx = self.text.index(f"{idx}+1c")
                continue
            
            if ch.isalpha() or ch == "'":
                if not word:
                    start_idx = idx
                word += ch
                idx = self.text.index(f"{idx}+1c")
            else:
                if word:
                    pos_map.append((start_idx, idx, word))
                    word = ""
                idx = self.text.index(f"{idx}+1c")
            
            if self.text.compare(idx, ">=", tk.END):
                if word:
                    pos_map.append((start_idx, idx, word))
                break
        
        check_words = [w for (_, _, w) in pos_map]
        misspelled = set(self.spell.unknown([w.lower() for w in check_words]))
        
        for s, e, w in pos_map:
            if w.lower() in misspelled:
                self.text.tag_add("spell", s, e)
    
    def _open_context_menu(self, event):
        """Open context menu for spell suggestions"""
        try:
            index = self.text.index(f"@{event.x},{event.y}")
        except Exception:
            return
        
        start = self._word_start(index)
        end = self._word_end(index)
        if not start or not end:
            return
        
        word = self.text.get(start, end).strip()
        if not word:
            return
        
        suggestions = []
        if word and not word.isspace():
            if word.lower() not in self.spell:
                suggestions = list(self.spell.candidates(word))[:5]
        
        # Build menu
        self._menu.delete(0, tk.END)
        if suggestions:
            for s in suggestions:
                self._menu.add_command(
                    label=f"Replace with '{s}'",
                    command=lambda s=s, a=start, b=end: self._replace_range(a, b, s)
                )
            self._menu.add_separator()
        
        self._menu.add_command(label="Add to dictionary", command=lambda w=word: self._add_to_dictionary(w))
        self._menu.add_separator()
        self._menu.add_command(label="Cut", command=lambda: self.text.event_generate('<<Cut>>'))
        self._menu.add_command(label="Copy", command=lambda: self.text.event_generate('<<Copy>>'))
        self._menu.add_command(label="Paste", command=lambda: self.text.event_generate('<<Paste>>'))
        
        self._menu.tk_popup(event.x_root, event.y_root)
    
    def _replace_range(self, start, end, value):
        """Replace text range with value"""
        self.text.delete(start, end)
        self.text.insert(start, value)
        self._run_spellcheck()
    
    def _add_to_dictionary(self, word: str):
        """Add word to dictionary"""
        try:
            self.spell.word_frequency.add(word.lower())
        except Exception:
            pass
        self._run_spellcheck()
    
    def _word_start(self, index: str) -> str:
        """Find start of word at index"""
        pos = index
        while True:
            prev = self.text.index(f"{pos}-1c")
            ch = self.text.get(prev)
            if not ch.isalpha() and ch != "'":
                return pos
            if self.text.compare(prev, "==", "1.0"):
                return prev
            pos = prev
    
    def _word_end(self, index: str) -> str:
        """Find end of word at index"""
        pos = index
        while True:
            ch = self.text.get(pos)
            if not ch.isalpha() and ch != "'":
                return pos
            nexti = self.text.index(f"{pos}+1c")
            if self.text.compare(nexti, ">=", tk.END):
                return pos
            pos = nexti
    
    def open_search_replace(self):
        """Open find/replace dialog"""
        from .editor import SearchReplace
        SearchReplace(self.winfo_toplevel(), self.text)
