import sys
import os
import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

from .themes import ThemeManager
from .editor import EditorFrame
from .preview import PreviewFrame
from .planning import PlanningFrame
from .storage import Storage
from .git_integration import GitIntegration
from .onboarding import maybe_show_onboarding
from .project import ProjectFrame
from tkinter import simpledialog

APP_TITLE = "Novelist"


class NovelistApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("1200x750")
        self.minsize(980, 620)

        # Storage and settings
        self.storage = Storage()
        self.state = {
            "current_file": None,
            "project_root": None,
            "current_item": None,  # chapter/scene descriptor
        }

        # Theme
        self.theme = ThemeManager(self)
        self.theme.apply(self.storage.get_setting("theme", "dark"))

        # Git
        self.git = GitIntegration()

        # Layout: Sidebar | Editor | Preview
        self.columnconfigure(1, weight=3)
        self.columnconfigure(2, weight=2)
        self.rowconfigure(1, weight=1)

        # Initialize editor before building menu
        self.editor = EditorFrame(self, on_text_change=self._on_text_change)
        self.editor.grid(row=1, column=1, sticky="nsew")

        # Now build menu which references self.editor
        self._build_menu()
        self._build_toolbar()

        # Sidebar notebook with Planning and Project
        self.sidebar = ttk.Notebook(self)
        self.sidebar.grid(row=1, column=0, sticky="nsew")
        self.planning = PlanningFrame(self.sidebar, self.storage, on_note_open=self._open_note)
        self.project = ProjectFrame(self.sidebar, self.storage, on_open_item=self._open_project_item, on_save_content_request=self._save_project_item)
        self.sidebar.add(self.planning, text="Planning")
        self.sidebar.add(self.project, text="Project")

        # Preview frame
        self.preview = PreviewFrame(self)
        self.preview.grid(row=1, column=2, sticky="nsew")
        self.preview.set_theme_provider(self.theme)

        # Onboarding
        self.after(300, lambda: maybe_show_onboarding(self, self.storage))

        # Apply initial preview
        self._render_preview()

    # UI Builders
    def _build_menu(self):
        menubar = tk.Menu(self)

        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="New", command=self._new_file)
        file_menu.add_command(label="Open...", command=self._open_file)
        file_menu.add_command(label="Save", command=self._save_file)
        file_menu.add_command(label="Save As...", command=self._save_file_as)
        file_menu.add_separator()
        file_menu.add_command(label="Quit", command=self.quit)
        menubar.add_cascade(label="File", menu=file_menu)

        edit_menu = tk.Menu(menubar, tearoff=0)
        edit_menu.add_command(label="Undo", command=lambda: self.editor.text.event_generate("<<Undo>>"))
        edit_menu.add_command(label="Redo", command=lambda: self.editor.text.event_generate("<<Redo>>"))
        edit_menu.add_separator()
        edit_menu.add_command(label="Find / Replace", command=self.editor.open_search_replace)
        menubar.add_cascade(label="Edit", menu=edit_menu)

        view_menu = tk.Menu(menubar, tearoff=0)
        view_menu.add_command(label="Dark Theme", command=lambda: self._set_theme("dark"))
        view_menu.add_command(label="Light Theme", command=lambda: self._set_theme("light"))
        menubar.add_cascade(label="View", menu=view_menu)

        git_menu = tk.Menu(menubar, tearoff=0)
        git_menu.add_command(label="Init Repo", command=self._git_init)
        git_menu.add_command(label="Status", command=self._git_status)
        git_menu.add_command(label="Commit...", command=self._git_commit)
        git_menu.add_separator()
        git_menu.add_command(label="Set Remote...", command=self._git_set_remote)
        git_menu.add_command(label="Push", command=self._git_push)
        git_menu.add_command(label="Pull", command=self._git_pull)
        menubar.add_cascade(label="Git", menu=git_menu)

        help_menu = tk.Menu(menubar, tearoff=0)
        help_menu.add_command(label="About", command=lambda: messagebox.showinfo(APP_TITLE, "Novelist - Markdown editor for novelists"))
        menubar.add_cascade(label="Help", menu=help_menu)

        self.config(menu=menubar)

    def _build_toolbar(self):
        bar = ttk.Frame(self)
        bar.grid(row=0, column=0, columnspan=3, sticky="ew", padx=6, pady=4)
        bar.columnconfigure(10, weight=1)

        ttk.Button(bar, text="Bold", command=self.editor.toggle_bold).grid(row=0, column=0, padx=2)
        ttk.Button(bar, text="Italic", command=self.editor.toggle_italic).grid(row=0, column=1, padx=2)
        ttk.Button(bar, text="H1", command=lambda: self.editor.insert_heading(1)).grid(row=0, column=2, padx=2)
        ttk.Button(bar, text="H2", command=lambda: self.editor.insert_heading(2)).grid(row=0, column=3, padx=2)
        ttk.Button(bar, text="H3", command=lambda: self.editor.insert_heading(3)).grid(row=0, column=4, padx=2)
        ttk.Button(bar, text="Highlight", command=self.editor.toggle_highlight).grid(row=0, column=5, padx=2)
        ttk.Button(bar, text="Preview", command=self._render_preview).grid(row=0, column=6, padx=12)

        ttk.Label(bar, text="Focus:").grid(row=0, column=7)
        self.focus_entry = ttk.Entry(bar, width=18)
        self.focus_entry.grid(row=0, column=8, padx=4)
        ttk.Button(bar, text="Highlight", command=self._apply_focus_highlight).grid(row=0, column=9, padx=2)

    # Event handlers
    def _on_text_change(self):
        self._render_preview(delayed=True)

    def _render_preview(self, delayed=False):
        content = self.editor.get_markdown()
        self.preview.render_markdown(content)

    def _apply_focus_highlight(self):
        term = self.focus_entry.get().strip()
        self.editor.apply_focus_highlight(term)

    # File operations
    def _new_file(self):
        if not self._maybe_save_changes():
            return
        self.state["current_file"] = None
        self.editor.set_markdown("")
        self._render_preview()

    def _open_file(self):
        path = filedialog.askopenfilename(filetypes=[("Markdown", "*.md"), ("Text", "*.txt"), ("All", "*.*")])
        if not path:
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                text = f.read()
            self.editor.set_markdown(text)
            self.state["current_file"] = path
            self._render_preview()
        except Exception as e:
            messagebox.showerror("Open error", str(e))

    def _save_file(self):
        if not self.state["current_file"]:
            return self._save_file_as()
        try:
            with open(self.state["current_file"], "w", encoding="utf-8") as f:
                f.write(self.editor.get_markdown())
        except Exception as e:
            messagebox.showerror("Save error", str(e))

    def _save_file_as(self):
        path = filedialog.asksaveasfilename(defaultextension=".md", filetypes=[("Markdown", "*.md"), ("Text", "*.txt")])
        if not path:
            return
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(self.editor.get_markdown())
            self.state["current_file"] = path
        except Exception as e:
            messagebox.showerror("Save error", str(e))

    def _maybe_save_changes(self):
        # Simple prompt if buffer differs from file (not tracking; always prompt)
        if messagebox.askyesno("Save changes?", "Do you want to save current changes?"):
            self._save_file()
        return True

    # Notes open callback
    def _open_note(self, note_title, content):
        self.editor.set_markdown(content)
        self._render_preview()

    # Project open/save callbacks
    def _open_project_item(self, item: dict):
        self.state["current_item"] = item
        content = self.storage.get_content(item)
        self.editor.set_markdown(content)
        self._render_preview()

    def _save_project_item(self, item: dict):
        content = self.editor.get_markdown()
        self.storage.set_content(item, content)
        messagebox.showinfo("Project", "Content saved to project")

    # Theme
    def _set_theme(self, name: str):
        self.theme.apply(name)
        self.storage.set_setting("theme", name)
        # re-render preview with new CSS
        self._render_preview()

    # Git
    def _git_init(self):
        root = filedialog.askdirectory(title="Select project root for git repo")
        if not root:
            return
        ok, out = self.git.init_repo(root)
        if ok:
            self.state["project_root"] = root
            messagebox.showinfo("Git", out or "Initialized repo")
        else:
            messagebox.showerror("Git", out)

    def _git_status(self):
        root = self.state.get("project_root")
        if not root:
            messagebox.showinfo("Git", "No project selected. Use Git > Init Repo first.")
            return
        ok, out = self.git.status(root)
        messagebox.showinfo("Git Status", out if ok else f"Error:\n{out}")

    def _git_commit(self):
        root = self.state.get("project_root")
        if not root:
            messagebox.showinfo("Git", "No project selected. Use Git > Init Repo first.")
            return
        msg = simpledialog.askstring("Commit", "Commit message:")
        if not msg:
            return
        ok, out = self.git.commit_all(root, msg)
        if ok:
            messagebox.showinfo("Git", out)
        else:
            messagebox.showerror("Git", out)

    def _git_set_remote(self):
        root = self.state.get("project_root")
        if not root:
            messagebox.showinfo("Git", "No project selected. Use Git > Init Repo first.")
            return
        url = simpledialog.askstring("Set Remote", "Remote URL (e.g., https://... .git):")
        if not url:
            return
        name = "origin"
        ok, out = self.git.set_remote(root, name, url)
        if ok:
            messagebox.showinfo("Git", f"Remote '{name}' set to:\n{url}")
        else:
            messagebox.showerror("Git", out)

    def _git_push(self):
        root = self.state.get("project_root")
        if not root:
            messagebox.showinfo("Git", "No project selected. Use Git > Init Repo first.")
            return
        ok, branch = self.git.get_current_branch(root)
        if not ok:
            branch = "main"
        ok, out = self.git.push(root, "origin", branch)
        messagebox.showinfo("Git Push", out if ok else f"Error:\n{out}")

    def _git_pull(self):
        root = self.state.get("project_root")
        if not root:
            messagebox.showinfo("Git", "No project selected. Use Git > Init Repo first.")
            return
        ok, branch = self.git.get_current_branch(root)
        if not ok:
            branch = "main"
        ok, out = self.git.pull(root, "origin", branch)
        messagebox.showinfo("Git Pull", out if ok else f"Error:\n{out}")


def main():
    app = NovelistApp()
    app.mainloop()


if __name__ == "__main__":
    main()
