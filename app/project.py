import tkinter as tk
from tkinter import ttk, simpledialog, messagebox


class ProjectFrame(ttk.Frame):
    def __init__(self, parent, storage, on_open_item, on_save_content_request):
        super().__init__(parent, padding=(6, 6))
        self.storage = storage
        self.on_open_item = on_open_item
        self.on_save_content_request = on_save_content_request

        ttk.Label(self, text="Project").pack(anchor="w")

        self.tree = ttk.Treeview(self)
        self.tree.pack(fill="both", expand=True, pady=(4, 6))
        self.tree.bind("<Double-1>", self._open_selected)

        btns = ttk.Frame(self)
        btns.pack(fill="x")
        ttk.Button(btns, text="Add Chapter", command=self._add_chapter).pack(side="left", padx=2)
        ttk.Button(btns, text="Add Scene", command=self._add_scene).pack(side="left", padx=2)
        ttk.Button(btns, text="Delete", command=self._delete_item).pack(side="left", padx=2)
        ttk.Button(btns, text="Open", command=self._open_selected).pack(side="left", padx=2)
        ttk.Button(btns, text="Save Content", command=self._save_content).pack(side="left", padx=2)

        self._refresh()

    def _refresh(self):
        self.tree.delete(*self.tree.get_children())
        chapters = self.storage.list_chapters()
        for ch in chapters:
            ch_id = self.tree.insert("", "end", text=ch["title"], open=True, values=["chapter"])
            for sc in ch.get("scenes", []):
                self.tree.insert(ch_id, "end", text=sc["title"], values=["scene", ch["title"]])

    def _add_chapter(self):
        title = simpledialog.askstring("New Chapter", "Title:")
        if not title:
            return
        self.storage.add_chapter(title)
        self._refresh()

    def _add_scene(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showinfo("Project", "Select a chapter to add a scene under.")
            return
        item = sel[0]
        parent = item if not self.tree.parent(item) else self.tree.parent(item)
        ch_title = self.tree.item(parent, "text")
        title = simpledialog.askstring("New Scene", "Title:")
        if not title:
            return
        self.storage.add_scene(ch_title, title)
        self._refresh()

    def _delete_item(self):
        sel = self.tree.selection()
        if not sel:
            return
        item = sel[0]
        parent = self.tree.parent(item)
        if not parent:
            # delete chapter
            ch_title = self.tree.item(item, "text")
            self.storage.delete_chapter(ch_title)
        else:
            ch_title = self.tree.item(parent, "text")
            sc_title = self.tree.item(item, "text")
            self.storage.delete_scene(ch_title, sc_title)
        self._refresh()

    def _open_selected(self, event=None):
        sel = self.tree.selection()
        if not sel:
            return
        item = sel[0]
        parent = self.tree.parent(item)
        if not parent:
            ch_title = self.tree.item(item, "text")
            self.on_open_item({"type": "chapter", "chapter": ch_title})
        else:
            ch_title = self.tree.item(parent, "text")
            sc_title = self.tree.item(item, "text")
            self.on_open_item({"type": "scene", "chapter": ch_title, "scene": sc_title})

    def _save_content(self):
        sel = self.tree.selection()
        if not sel:
            return
        item = sel[0]
        parent = self.tree.parent(item)
        if not parent:
            ch_title = self.tree.item(item, "text")
            self.on_save_content_request({"type": "chapter", "chapter": ch_title})
        else:
            ch_title = self.tree.item(parent, "text")
            sc_title = self.tree.item(item, "text")
            self.on_save_content_request({"type": "scene", "chapter": ch_title, "scene": sc_title})
