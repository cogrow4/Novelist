import tkinter as tk
from tkinter import ttk
from tkinter import simpledialog
from spellchecker import SpellChecker


class SearchReplace(tk.Toplevel):
    def __init__(self, parent, text_widget: tk.Text):
        super().__init__(parent)
        self.title("Find / Replace")
        self.resizable(False, False)
        self.text = text_widget
        self.transient(parent)
        self.grab_set()

        ttk.Label(self, text="Find:").grid(row=0, column=0, padx=6, pady=6)
        self.find_var = tk.StringVar()
        ttk.Entry(self, textvariable=self.find_var, width=30).grid(row=0, column=1, padx=6, pady=6)

        ttk.Label(self, text="Replace:").grid(row=1, column=0, padx=6, pady=6)
        self.replace_var = tk.StringVar()
        ttk.Entry(self, textvariable=self.replace_var, width=30).grid(row=1, column=1, padx=6, pady=6)

        btns = ttk.Frame(self)
        btns.grid(row=2, column=0, columnspan=2, pady=6)
        ttk.Button(btns, text="Find Next", command=self.find_next).grid(row=0, column=0, padx=4)
        ttk.Button(btns, text="Replace", command=self.replace_one).grid(row=0, column=1, padx=4)
        ttk.Button(btns, text="Replace All", command=self.replace_all).grid(row=0, column=2, padx=4)

        self._last_idx = "1.0"

    def find_next(self):
        term = self.find_var.get()
        if not term:
            return
        start = self.text.search(term, self._last_idx, stopindex=tk.END, nocase=True)
        if not start:
            self._last_idx = "1.0"
            return
        end = f"{start}+{len(term)}c"
        self.text.tag_remove("sel", "1.0", tk.END)
        self.text.tag_add("sel", start, end)
        self.text.mark_set("insert", end)
        self.text.see(start)
        self._last_idx = end

    def replace_one(self):
        if self.text.tag_ranges("sel"):
            self.text.delete("sel.first", "sel.last")
            self.text.insert("insert", self.replace_var.get())
        self.find_next()

    def replace_all(self):
        term = self.find_var.get()
        repl = self.replace_var.get()
        if not term:
            return
        idx = "1.0"
        while True:
            pos = self.text.search(term, idx, stopindex=tk.END, nocase=True)
            if not pos:
                break
            end = f"{pos}+{len(term)}c"
            self.text.delete(pos, end)
            self.text.insert(pos, repl)
            idx = f"{pos}+{len(repl)}c"


class EditorFrame(ttk.Frame):
    def __init__(self, parent, on_text_change=None):
        super().__init__(parent)
        self.on_text_change = on_text_change

        self.text = tk.Text(self, wrap="word", undo=True)
        self.text.pack(fill="both", expand=True)

        # Tags for styling
        self.text.tag_configure("bold", font=(None, 12, "bold"))
        self.text.tag_configure("italic", font=(None, 12, "italic"))
        self.text.tag_configure("highlight", background="#464d5e")
        self.text.tag_configure("focus", background="#29434e")
        self.text.tag_configure("spell", underline=True, foreground="#e57373")

        # Spell checker
        self.spell = SpellChecker()
        self.text.bind("<KeyRelease>", self._on_key_release)

        # Track changes
        self.text.bind("<<Modified>>", self._on_modified)

        # Context menu for spell suggestions
        self.text.bind("<Button-3>", self._open_context_menu)
        self.text.bind("<Button-2>", self._open_context_menu)  # macOS fallback
        self._menu = tk.Menu(self, tearoff=0)

    # Formatting actions
    def toggle_bold(self):
        self._toggle_tag("bold")

    def toggle_italic(self):
        self._toggle_tag("italic")

    def toggle_highlight(self):
        self._toggle_tag("highlight")

    def insert_heading(self, level: int):
        line_start = self.text.index("insert linestart")
        hashes = "#" * max(1, min(6, level)) + " "
        self.text.insert(line_start, hashes)

    def _toggle_tag(self, tag: str):
        try:
            start = self.text.index("sel.first")
            end = self.text.index("sel.last")
        except tk.TclError:
            return
        if tag in self.text.tag_names("sel.first"):
            self.text.tag_remove(tag, start, end)
        else:
            self.text.tag_add(tag, start, end)

    # Search/replace
    def open_search_replace(self):
        SearchReplace(self.winfo_toplevel(), self.text)

    # Focus highlight
    def apply_focus_highlight(self, term: str):
        self.text.tag_remove("focus", "1.0", tk.END)
        if not term:
            return
        idx = "1.0"
        while True:
            pos = self.text.search(term, idx, stopindex=tk.END, nocase=True)
            if not pos:
                break
            end = f"{pos}+{len(term)}c"
            self.text.tag_add("focus", pos, end)
            idx = end

    # Content API
    def get_markdown(self) -> str:
        return self.text.get("1.0", tk.END)

    def set_markdown(self, content: str):
        self.text.delete("1.0", tk.END)
        self.text.insert("1.0", content)
        self.text.edit_reset()
        self._run_spellcheck()

    # Change tracking
    def _on_modified(self, event=None):
        self.text.edit_modified(0)
        if self.on_text_change:
            self.on_text_change()

    # Spell check
    def _on_key_release(self, event=None):
        # simple debounce by only checking on space/newline/punct
        if event and event.keysym not in {"space", "Return", "BackSpace", "period", "comma", "exclam", "question"}:
            return
        self._run_spellcheck()

    def _run_spellcheck(self):
        content = self.get_markdown()
        self.text.tag_remove("spell", "1.0", tk.END)
        words = []
        idx = "1.0"
        word = ""
        pos_map = []  # list of (start_idx, end_idx, word)
        while True:
            ch = self.text.get(idx)
            if ch == "\n":
                if word:
                    pos_map.append((start_idx, idx, word))
                    word = ""
                line_end = self.text.index(f"{idx} lineend")
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

    # Context menu logic
    def _open_context_menu(self, event):
        try:
            index = self.text.index(f"@{event.x},{event.y}")
        except Exception:
            return
        # Determine word bounds at index
        start = self._word_start(index)
        end = self._word_end(index)
        if not start or not end:
            return
        word = self.text.get(start, end).strip()
        if not word:
            return
        suggestions = []
        if word and not word.isspace():
            if word.lower() in self.spell:  # in dictionary
                suggestions = []
            else:
                suggestions = list(self.spell.candidates(word))[:5]
        # Build menu
        self._menu.delete(0, tk.END)
        if suggestions:
            for s in suggestions:
                self._menu.add_command(label=f"Replace with '{s}'", command=lambda s=s, a=start, b=end: self._replace_range(a, b, s))
            self._menu.add_separator()
        self._menu.add_command(label="Add to dictionary", command=lambda w=word: self._add_to_dictionary(w))
        self._menu.add_separator()
        self._menu.add_command(label="Cut", command=lambda: self.text.event_generate('<<Cut>>'))
        self._menu.add_command(label="Copy", command=lambda: self.text.event_generate('<<Copy>>'))
        self._menu.add_command(label="Paste", command=lambda: self.text.event_generate('<<Paste>>'))
        self._menu.tk_popup(event.x_root, event.y_root)

    def _replace_range(self, start, end, value):
        self.text.delete(start, end)
        self.text.insert(start, value)
        self._run_spellcheck()

    def _add_to_dictionary(self, word: str):
        # Simple local add: extend word frequency to treat as known in this session
        # SpellChecker supports word_frequency.add()
        try:
            self.spell.word_frequency.add(word.lower())
        except Exception:
            pass
        self._run_spellcheck()

    def _word_start(self, index: str) -> str:
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
        pos = index
        while True:
            ch = self.text.get(pos)
            if not ch.isalpha() and ch != "'":
                return pos
            nexti = self.text.index(f"{pos}+1c")
            if self.text.compare(nexti, ">=", tk.END):
                return pos
            pos = nexti
