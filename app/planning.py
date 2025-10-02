import tkinter as tk
from tkinter import ttk, simpledialog


class PlanningFrame(ttk.Frame):
    def __init__(self, parent, storage, on_note_open):
        super().__init__(parent, padding=(6, 6))
        self.storage = storage
        self.on_note_open = on_note_open

        ttk.Label(self, text="Planning").pack(anchor="w")

        self.tree = ttk.Treeview(self)
        self.tree.pack(fill="both", expand=True, pady=(4, 6))
        self.tree.bind("<Double-1>", self._open_selected)

        btns = ttk.Frame(self)
        btns.pack(fill="x")
        ttk.Button(btns, text="Add", command=self._add_note).pack(side="left", padx=2)
        ttk.Button(btns, text="Delete", command=self._delete_note).pack(side="left", padx=2)
        ttk.Button(btns, text="Open", command=self._open_selected).pack(side="left", padx=2)

        self._refresh()

    def _refresh(self):
        self.tree.delete(*self.tree.get_children())
        cols = self.storage.list_collections()
        for col_name, items in cols.items():
            parent = self.tree.insert("", "end", text=col_name, open=True)
            for it in items:
                self.tree.insert(parent, "end", text=it.get("title"))

    def _add_note(self):
        col = self._ask_collection()
        if not col:
            return
        title = simpledialog.askstring("New Note", "Title:")
        if not title:
            return
        self.storage.add_note(col, title, content="")
        self._refresh()

    def _delete_note(self):
        sel = self.tree.selection()
        if not sel:
            return
        item = sel[0]
        parent = self.tree.parent(item)
        if not parent:
            return  # don't delete collection
        col = self.tree.item(parent, "text")
        title = self.tree.item(item, "text")
        self.storage.delete_note(col, title)
        self._refresh()

    def _open_selected(self, event=None):
        sel = self.tree.selection()
        if not sel:
            return
        item = sel[0]
        parent = self.tree.parent(item)
        if not parent:
            return
        col = self.tree.item(parent, "text")
        title = self.tree.item(item, "text")
        note = self.storage.get_note(col, title)
        if note:
            self.on_note_open(title, note.get("content", ""))

    def _ask_collection(self):
        cols = list(self.storage.list_collections().keys())
        win = tk.Toplevel(self)
        win.title("Collection")
        tk.Label(win, text="Add to collection:").pack(padx=8, pady=8)
        var = tk.StringVar(value=cols[0] if cols else "Notes")
        combo = ttk.Combobox(win, values=cols, textvariable=var, state="readonly")
        combo.pack(padx=8, pady=8)
        res = {"ok": False}
        def ok():
            res["ok"] = True
            win.destroy()
        ttk.Button(win, text="OK", command=ok).pack(padx=8, pady=8)
        win.transient(self.winfo_toplevel())
        win.grab_set()
        self.wait_window(win)
        return var.get() if res["ok"] else None
