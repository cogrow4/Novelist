import tkinter as tk
from tkinter import ttk


class ThemeManager:
    def __init__(self, root: tk.Misc):
        self.root = root
        self.style = ttk.Style(root)
        self.current = "dark"

    def apply(self, name: str):
        self.current = name if name in {"light", "dark"} else "dark"
        if name == "light":
            self._apply_light()
        else:
            self._apply_dark()

    def _apply_dark(self):
        bg = "#1f2430"
        fg = "#d8dee9"
        text_bg = "#232834"
        select_bg = "#3a3f4b"
        self.root.configure(bg=bg)
        self.style.theme_use("clam")
        self.style.configure("TFrame", background=bg)
        self.style.configure("TLabel", background=bg, foreground=fg)
        self.style.configure("TButton", background=bg, foreground=fg)
        self.style.configure("Treeview", background=text_bg, fieldbackground=text_bg, foreground=fg)
        self.style.map("TButton", background=[("active", select_bg)])

    def _apply_light(self):
        bg = "#f5f6f7"
        fg = "#2b2b2b"
        text_bg = "#ffffff"
        select_bg = "#e0e0e0"
        self.root.configure(bg=bg)
        self.style.theme_use("clam")
        self.style.configure("TFrame", background=bg)
        self.style.configure("TLabel", background=bg, foreground=fg)
        self.style.configure("TButton", background=bg, foreground=fg)
        self.style.configure("Treeview", background=text_bg, fieldbackground=text_bg, foreground=fg)
        self.style.map("TButton", background=[("active", select_bg)])

    def webview_css(self) -> str:
        if self.current == "light":
            bg = "#ffffff"; fg = "#2b2b2b"; code_bg = "#f0f0f0"
        else:
            bg = "#232834"; fg = "#d8dee9"; code_bg = "#2b3140"
        return f"""
        body {{ background: {bg}; color: {fg}; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 12px; }}
        h1,h2,h3,h4,h5,h6 {{ color: {fg}; margin-top: 1em; }}
        code, pre {{ background: {code_bg}; color: {fg}; }}
        a {{ color: #6aa9ff; }}
        blockquote {{ border-left: 4px solid #7aa2f7; padding-left: 10px; opacity: 0.9; }}
        table {{ border-collapse: collapse; }}
        th, td {{ border: 1px solid #6663; padding: 6px 8px; }}
        """
