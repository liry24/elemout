# Elemout

> [!IMPORTANT]
> This extension is now in beta.

Hide any unwanted element on a web page with a single click. Select an element interactively, manage reusable rules with CSS selectors and URL patterns, and keep your data in sync across browsers via GitHub Gist.

<div align="center">

![Last commit](https://www.shieldcn.dev/github/last-commit/liry24/elemout.svg?variant=secondary&size=xs)
![Commits](https://www.shieldcn.dev/github/commits/liry24/elemout.svg?variant=secondary&size=xs)
![License](https://www.shieldcn.dev/github/license/liry24/elemout.svg?variant=secondary&size=xs)

</div>

## Features

- **Interactive element selection** — Click any element on a page to hide it instantly. Use the scroll wheel to navigate to parent or child elements for precise targeting.
- **Rule management** — Create named rules with CSS selectors and URL/hostname patterns. Rules apply automatically on matching pages.
- **Selector optimization** — Automatically simplifies generated CSS selectors to keep rules concise and robust.
- **GitHub Gist sync** — Back up and sync your hidden elements and rules across devices via GitHub Gist. Conflict resolution is built in.
- **Import / Export** — Export your data as a ZIP archive or JSON file, and import it on any device.
- **Keyboard shortcuts** — Configure a global shortcut to start selection mode and a key to toggle scroll mode.
- **Multilingual** — English and Japanese interface.

## Browser Support

| Browser | Status       | Link          |
| ------- | ------------ | ------------- |
| Chrome  | ✅ Supported | _Coming soon_ |
| Firefox | 🔜 Planned   |               |
| Edge    | 🔜 Planned   |               |

## GitHub Gist Sync

Log in with your GitHub account from the Settings screen to enable Gist sync. Your hidden elements and rules are stored in a private Gist and can be synced across browsers or devices at any time. When local data and Gist data differ, the conflict resolution dialog lets you choose to keep local data, use Gist data, or merge both.

Settings (behavior preferences) can optionally be included in sync and backup via **Settings → Include settings in sync & backup**.

## License

[MIT](LICENSE)
