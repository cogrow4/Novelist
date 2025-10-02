import tkinter as tk
from tkinter import messagebox


def maybe_show_onboarding(root, storage):
    if storage.get_setting("onboarded", False):
        return
    messagebox.showinfo(
        "Welcome to Novelist",
        "Novelist helps you write with Markdown + live preview, planning sidebar, spell check, and simple Git.\n\nUse the toolbar for formatting. Find/Replace is in Edit menu. Switch Dark/Light in View menu."
    )
    storage.set_setting("onboarded", True)
