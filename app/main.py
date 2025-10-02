import tkinter as tk
from tkinter import ttk, filedialog, messagebox, simpledialog

from .themes import ThemeManager
from .rich_editor import RichTextEditor
from .planning import PlanningFrame
from .storage import Storage
from .git_integration import GitIntegration
from .project import ProjectFrame
from .characters import CharacterFrame, CharacterEditor
from .settings import SettingsDialog

APP_TITLE = "Novelist"


class PopoutSidebar(tk.Toplevel):
    """Popout sidebar window for planning and characters"""
    
    def __init__(self, parent, storage, theme_manager, on_note_open=None, on_project_open=None, on_character_open=None):
        super().__init__(parent)
        self.storage = storage
        self.theme = theme_manager
        self.on_note_open = on_note_open
        self.on_project_open = on_project_open
        self.on_character_open = on_character_open
        
        self.title("Novelist - Sidebar")
        self.geometry("350x700")
        
        colors = self.theme.get_colors()
        self.configure(bg=colors["bg_sidebar"])
        
        # Build notebook with tabs
        self.notebook = ttk.Notebook(self)
        self.notebook.pack(fill="both", expand=True)
        
        # Planning tab
        self.planning = PlanningFrame(self.notebook, self.storage, on_note_open=self.on_note_open)
        self.notebook.add(self.planning, text="Planning")
        
        # Project tab
        self.project = ProjectFrame(self.notebook, self.storage, 
                                   on_open_item=self.on_project_open,
                                   on_save_content_request=lambda item: None)
        self.notebook.add(self.project, text="Project")
        
        # Characters tab
        self.characters = CharacterFrame(self.notebook, self.storage, on_character_open=self.on_character_open)
        self.notebook.add(self.characters, text="Characters")
        
        # Handle close
        self.protocol("WM_DELETE_WINDOW", self._on_close)
        self._is_open = True
    
    def _on_close(self):
        """Handle window close"""
        self._is_open = False
        self.withdraw()
    
    def show(self):
        """Show the sidebar"""
        self._is_open = True
        self.deiconify()
    
    def is_open(self):
        """Check if sidebar is open"""
        return self._is_open


class NovelistApp(tk.Tk):
    """Main Novelist application"""
    
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("1400x900")
        self.minsize(800, 600)
        
        # Storage and settings
        self.storage = Storage()
        self.state = {
            "current_file": None,
            "current_item": None,
        }
        
        # Theme
        self.theme = ThemeManager(self)
        self.theme.apply(self.storage.get_setting("theme", "dark"))
        
        # Git
        self.git = GitIntegration()
        
        # Configure colors
        colors = self.theme.get_colors()
        self.configure(bg=colors["bg"])
        
        # Build UI - editor first, then menu
        self._build_editor()
        self._build_menu()
        
        # Popout sidebar (initially hidden)
        self.sidebar = None
        
        # Auto-save timer
        self._setup_autosave()
    
    def _build_menu(self):
        """Build menu bar"""
        menubar = tk.Menu(self)
        
        # File menu
        file_menu = tk.Menu(menubar, tearoff=0)
        file_menu.add_command(label="New", command=self._new_file, accelerator="Cmd+N")
        file_menu.add_command(label="Open...", command=self._open_file, accelerator="Cmd+O")
        file_menu.add_command(label="Save", command=self._save_file, accelerator="Cmd+S")
        file_menu.add_command(label="Save As...", command=self._save_file_as, accelerator="Cmd+Shift+S")
        file_menu.add_separator()
        file_menu.add_command(label="Settings...", command=self._open_settings)
        file_menu.add_separator()
        file_menu.add_command(label="Quit", command=self.quit, accelerator="Cmd+Q")
        menubar.add_cascade(label="File", menu=file_menu)
        
        # Edit menu
        edit_menu = tk.Menu(menubar, tearoff=0)
        edit_menu.add_command(label="Undo", command=lambda: self.editor.text.event_generate("<<Undo>>"), accelerator="Cmd+Z")
        edit_menu.add_command(label="Redo", command=lambda: self.editor.text.event_generate("<<Redo>>"), accelerator="Cmd+Shift+Z")
        edit_menu.add_separator()
        edit_menu.add_command(label="Cut", command=lambda: self.editor.text.event_generate("<<Cut>>"), accelerator="Cmd+X")
        edit_menu.add_command(label="Copy", command=lambda: self.editor.text.event_generate("<<Copy>>"), accelerator="Cmd+C")
        edit_menu.add_command(label="Paste", command=lambda: self.editor.text.event_generate("<<Paste>>"), accelerator="Cmd+V")
        edit_menu.add_separator()
        edit_menu.add_command(label="Find / Replace", command=self.editor.open_search_replace, accelerator="Cmd+F")
        menubar.add_cascade(label="Edit", menu=edit_menu)
        
        # View menu
        view_menu = tk.Menu(menubar, tearoff=0)
        view_menu.add_command(label="Toggle Sidebar", command=self._toggle_sidebar, accelerator="Cmd+B")
        view_menu.add_separator()
        view_menu.add_command(label="Dark Theme", command=lambda: self._set_theme("dark"))
        view_menu.add_command(label="Light Theme", command=lambda: self._set_theme("light"))
        menubar.add_cascade(label="View", menu=view_menu)
        
        # Git menu
        git_menu = tk.Menu(menubar, tearoff=0)
        git_menu.add_command(label="Init Repository", command=self._git_init)
        git_menu.add_command(label="Status", command=self._git_status)
        git_menu.add_command(label="Commit...", command=self._git_commit)
        git_menu.add_separator()
        git_menu.add_command(label="Set Remote...", command=self._git_set_remote)
        git_menu.add_command(label="Push", command=self._git_push)
        git_menu.add_command(label="Pull", command=self._git_pull)
        menubar.add_cascade(label="Git", menu=git_menu)
        
        self.config(menu=menubar)
        
        # Keyboard shortcuts
        self.bind_all("<Command-n>", lambda e: self._new_file())
        self.bind_all("<Command-o>", lambda e: self._open_file())
        self.bind_all("<Command-s>", lambda e: self._save_file())
        self.bind_all("<Command-Shift-S>", lambda e: self._save_file_as())
        self.bind_all("<Command-f>", lambda e: self.editor.open_search_replace())
        self.bind_all("<Command-b>", lambda e: self._toggle_sidebar())
        self.bind_all("<Command-q>", lambda e: self.quit())
    
    def _build_editor(self):
        """Build main editor"""
        # Main container
        main_container = tk.Frame(self, bg=self.theme.get_colors()["bg"])
        main_container.pack(fill="both", expand=True)
        
        # Rich text editor
        self.editor = RichTextEditor(main_container, self.theme, on_text_change=self._on_text_change)
        self.editor.pack(fill="both", expand=True)
        
        # Load default font settings
        default_font = self.storage.get_setting("default_font", "Helvetica")
        default_size = self.storage.get_setting("default_font_size", 14)
        self.editor.font_var.set(default_font)
        self.editor.size_var.set(str(default_size))
        self.editor._apply_font()
    
    def _toggle_sidebar(self):
        """Toggle sidebar visibility"""
        if self.sidebar is None or not self.sidebar.is_open():
            if self.sidebar is None:
                self.sidebar = PopoutSidebar(
                    self,
                    self.storage,
                    self.theme,
                    on_note_open=self._open_note,
                    on_project_open=self._open_project_item,
                    on_character_open=self._open_character
                )
            self.sidebar.show()
        else:
            self.sidebar._on_close()
    
    def _on_text_change(self):
        """Handle text change"""
        # Mark as modified
        self.state["modified"] = True
    
    def _setup_autosave(self):
        """Setup auto-save timer"""
        if self.storage.get_setting("autosave", True):
            # Auto-save every 2 minutes
            self.after(120000, self._autosave)
    
    def _autosave(self):
        """Auto-save current file"""
        if self.state.get("modified") and self.state.get("current_file"):
            self._save_file()
        self._setup_autosave()
    
    # File operations
    def _new_file(self):
        """Create new file"""
        if self.state.get("modified"):
            if not messagebox.askyesno("Unsaved Changes", "You have unsaved changes. Continue?"):
                return
        
        self.editor.set_content("")
        self.state["current_file"] = None
        self.state["current_item"] = None
        self.state["modified"] = False
        self.title(APP_TITLE)
    
    def _open_file(self):
        """Open file"""
        path = filedialog.askopenfilename(
            title="Open File",
            filetypes=[("Text Files", "*.txt"), ("Markdown Files", "*.md"), ("All Files", "*.*")]
        )
        if path:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                self.editor.set_content(content)
                self.state["current_file"] = path
                self.state["current_item"] = None
                self.state["modified"] = False
                self.title(f"{APP_TITLE} - {path}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to open file: {e}")
    
    def _save_file(self):
        """Save file"""
        if self.state.get("current_item"):
            # Save to project item
            content = self.editor.get_content()
            self.storage.set_content(self.state["current_item"], content)
            self.state["modified"] = False
            return
        
        if not self.state.get("current_file"):
            self._save_file_as()
        else:
            try:
                with open(self.state["current_file"], "w", encoding="utf-8") as f:
                    f.write(self.editor.get_content())
                self.state["modified"] = False
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save file: {e}")
    
    def _save_file_as(self):
        """Save file as"""
        path = filedialog.asksaveasfilename(
            title="Save As",
            defaultextension=".txt",
            filetypes=[("Text Files", "*.txt"), ("Markdown Files", "*.md"), ("All Files", "*.*")]
        )
        if path:
            try:
                with open(path, "w", encoding="utf-8") as f:
                    f.write(self.editor.get_content())
                self.state["current_file"] = path
                self.state["current_item"] = None
                self.state["modified"] = False
                self.title(f"{APP_TITLE} - {path}")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to save file: {e}")
    
    def _open_note(self, collection: str, title: str):
        """Open a planning note"""
        note = self.storage.get_note(collection, title)
        if note:
            self.editor.set_content(note.get("content", ""))
            self.state["current_file"] = None
            self.state["current_item"] = {"type": "note", "collection": collection, "title": title}
            self.state["modified"] = False
            self.title(f"{APP_TITLE} - {title}")
    
    def _open_project_item(self, item: dict):
        """Open a project chapter/scene"""
        content = self.storage.get_content(item)
        self.editor.set_content(content)
        self.state["current_file"] = None
        self.state["current_item"] = item
        self.state["modified"] = False
        
        if item.get("type") == "chapter":
            self.title(f"{APP_TITLE} - Chapter: {item['chapter']}")
        elif item.get("type") == "scene":
            self.title(f"{APP_TITLE} - {item['chapter']} / {item['scene']}")
    
    def _open_character(self, character: dict):
        """Open character editor"""
        CharacterEditor(self, self.storage, character, self.theme)
    
    def _open_settings(self):
        """Open settings dialog"""
        SettingsDialog(self, self.storage, self.theme, on_apply=self._apply_settings)
    
    def _apply_settings(self):
        """Apply settings changes"""
        # Reload theme
        theme = self.storage.get_setting("theme", "dark")
        self.theme.apply(theme)
        
        # Update editor font
        default_font = self.storage.get_setting("default_font", "Helvetica")
        default_size = self.storage.get_setting("default_font_size", 14)
        self.editor.font_var.set(default_font)
        self.editor.size_var.set(str(default_size))
        self.editor._apply_font()
        
        # Rebuild editor to apply theme
        colors = self.theme.get_colors()
        self.editor.text.configure(
            bg=colors["bg_editor"],
            fg=colors["fg_primary"],
            insertbackground=colors["fg_primary"],
            selectbackground=colors["bg_active"],
            selectforeground=colors["fg_primary"]
        )
        
        # Update sidebar if open
        if self.sidebar and self.sidebar.is_open():
            self.sidebar.destroy()
            self.sidebar = None
    
    def _set_theme(self, theme: str):
        """Set theme"""
        self.storage.set_setting("theme", theme)
        self._apply_settings()
    
    # Git operations
    def _git_init(self):
        """Initialize git repository"""
        path = filedialog.askdirectory(title="Select Project Directory")
        if path:
            result = self.git.init_repo(path)
            messagebox.showinfo("Git Init", result)
    
    def _git_status(self):
        """Show git status"""
        path = filedialog.askdirectory(title="Select Project Directory")
        if path:
            result = self.git.status(path)
            messagebox.showinfo("Git Status", result)
    
    def _git_commit(self):
        """Commit changes"""
        path = filedialog.askdirectory(title="Select Project Directory")
        if path:
            message = simpledialog.askstring("Commit", "Commit message:", parent=self)
            if message:
                result = self.git.commit(path, message)
                messagebox.showinfo("Git Commit", result)
    
    def _git_set_remote(self):
        """Set git remote"""
        path = filedialog.askdirectory(title="Select Project Directory")
        if path:
            url = simpledialog.askstring("Set Remote", "Remote URL:", parent=self)
            if url:
                result = self.git.set_remote(path, "origin", url)
                messagebox.showinfo("Git Remote", result)
    
    def _git_push(self):
        """Push to remote"""
        path = filedialog.askdirectory(title="Select Project Directory")
        if path:
            result = self.git.push(path)
            messagebox.showinfo("Git Push", result)
    
    def _git_pull(self):
        """Pull from remote"""
        path = filedialog.askdirectory(title="Select Project Directory")
        if path:
            result = self.git.pull(path)
            messagebox.showinfo("Git Pull", result)


def main():
    app = NovelistApp()
    app.mainloop()


if __name__ == "__main__":
    main()
