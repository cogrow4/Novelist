import tkinter as tk
from tkinter import ttk
import markdown as md
import os


class PreviewFrame(ttk.Frame):
    def __init__(self, parent):
        super().__init__(parent)
        self._theme_provider = None
        self.has_web = False
        self.web = None
        # Allow users to disable webview to avoid crashes on older macOS
        disable = os.environ.get("NOVELIST_DISABLE_WEBVIEW", "0") == "1"
        if not disable:
            try:
                from tkinterweb import HtmlFrame  # type: ignore
                self.web = HtmlFrame(self, messages_enabled=False)
                self.web.pack(fill="both", expand=True)
                self.has_web = True
            except Exception:
                self.has_web = False
        if not self.has_web:
            self.text = tk.Text(self, wrap="word", state="disabled")
            self.text.pack(fill="both", expand=True)

    def set_theme_provider(self, provider):
        # expects object with webview_css() -> str
        self._theme_provider = provider

    def render_markdown(self, content: str):
        html_body = md.markdown(content, extensions=["fenced_code", "tables", "toc"]) or ""
        css = self._theme_provider.webview_css() if self._theme_provider else ""
        full = f"<html><head><meta charset='utf-8'><style>{css}</style></head><body>{html_body}</body></html>"
        if self.has_web and self.web is not None:
            try:
                self.web.load_html(full)
                return
            except Exception:
                self.has_web = False
        # Fallback to plain text rendering
        plain = self._html_to_plain(html_body)
        if hasattr(self, "text"):
            self.text.configure(state="normal")
            self.text.delete("1.0", tk.END)
            self.text.insert("1.0", plain)
            self.text.configure(state="disabled")

    def _html_to_plain(self, html: str) -> str:
        # naive fallback rendering for Tk Text (no HTML support)
        import re
        text = re.sub(r"<[^>]+>", "", html)
        return text
