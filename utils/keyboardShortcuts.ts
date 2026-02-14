/**
 * Keyboard shortcuts for the application
 * Provides a central registry and handler for keyboard shortcuts
 */

export type ShortcutAction = () => void | Promise<void>;

export interface Shortcut {
  key: string; // e.g., 'k', 'e', 's'
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac
  description: string;
  action: ShortcutAction;
}

class KeyboardShortcutManager {
  private shortcuts: Map<string, Shortcut> = new Map();
  private enabled: boolean = true;

  /**
   * Register a keyboard shortcut
   */
  register(
    key: string,
    action: ShortcutAction,
    description: string,
    options: {
      ctrl?: boolean;
      shift?: boolean;
      alt?: boolean;
      meta?: boolean;
    } = {}
  ): void {
    const shortcut: Shortcut = {
      key,
      description,
      action,
      ...options,
    };

    const id = this.getShortcutId(shortcut);
    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregister(key: string, options: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}): void {
    const shortcut = { key, ...options } as Shortcut;
    const id = this.getShortcutId(shortcut);
    this.shortcuts.delete(id);
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): Shortcut[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcut display string (e.g., "Cmd+K" or "Ctrl+Shift+S")
   */
  getDisplayString(shortcut: Shortcut): string {
    const parts: string[] = [];

    if (shortcut.meta) parts.push('Cmd');
    else if (shortcut.ctrl) parts.push('Ctrl');

    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');

    parts.push(shortcut.key.toUpperCase());

    return parts.join('+');
  }

  /**
   * Initialize keyboard event listener
   */
  init(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
  }

  /**
   * Disable shortcuts temporarily
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * Enable shortcuts
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * Handle keyboard event
   */
  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    if (!this.enabled) return;

    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA'].includes(target.tagName)) {
      return;
    }

    const shortcut = this.findMatchingShortcut(event);
    if (shortcut) {
      event.preventDefault();
      try {
        await shortcut.action();
      } catch (error) {
        console.error('Shortcut action failed:', error);
      }
    }
  }

  /**
   * Find shortcut matching keyboard event
   */
  private findMatchingShortcut(event: KeyboardEvent): Shortcut | undefined {
    const key = event.key.toLowerCase();

    for (const shortcut of this.shortcuts.values()) {
      if (shortcut.key.toLowerCase() === key && this.checkModifiers(event, shortcut)) {
        return shortcut;
      }
    }

    return undefined;
  }

  /**
   * Check if keyboard event modifiers match shortcut
   */
  private checkModifiers(event: KeyboardEvent, shortcut: Shortcut): boolean {
    const metaKey = event.metaKey || event.ctrlKey; // Cmd on Mac, Ctrl elsewhere

    return (
      (shortcut.ctrl ? event.ctrlKey : !event.ctrlKey || !shortcut.meta) &&
      (shortcut.shift ? event.shiftKey : !event.shiftKey) &&
      (shortcut.alt ? event.altKey : !event.altKey) &&
      (shortcut.meta ? metaKey : !metaKey || shortcut.ctrl)
    );
  }

  /**
   * Generate unique ID for shortcut
   */
  private getShortcutId(shortcut: Shortcut): string {
    const parts = [shortcut.key.toLowerCase()];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.meta) parts.push('meta');
    return parts.join('+');
  }
}

// Export singleton instance
export const keyboardShortcuts = new KeyboardShortcutManager();

/**
 * Common shortcut definitions
 */
export const COMMON_SHORTCUTS = {
  SEARCH: { key: 'k', meta: true, description: 'Open smart search' },
  EXPORT: { key: 'e', meta: true, description: 'Export current meeting' },
  SAVE: { key: 's', meta: true, description: 'Save notes' },
  SHARE: { key: 'shift+s', meta: true, description: 'Share meeting' },
  ESCAPE: { key: 'Escape', description: 'Close modal or cancel action' },
  ENTER: { key: 'Enter', description: 'Submit form or confirm action' },
};

/**
 * Helper to show shortcuts hint modal
 */
export function showShortcutsHint(): void {
  const shortcuts = keyboardShortcuts.getShortcuts();
  const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  const message = shortcuts
    .map(s => `${keyboardShortcuts.getDisplayString(s)} - ${s.description}`)
    .join('\n');

  alert(`Keyboard Shortcuts:\n\n${message}\n\nPress ? to view shortcuts anytime`);
}

export default keyboardShortcuts;
