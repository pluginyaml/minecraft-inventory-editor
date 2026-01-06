# Minecraft Inventory Editor

A web application for editing Minecraft inventories. Features GUI selection, item placement, and saving capabilities.

[![](preview.png)](https://minecraft-inventory.s7a.dev)

## Features

- Multiple GUI type selection (Chest, Inventory, etc.)
- Drag and drop item placement
- Item search functionality
- Recently used items display
- Automatic image resizing
- Animated texture support

## Development Setup

```bash
# Clone the repository
git clone https://github.com/sya-ri/minecraft-inventory.git
cd minecraft-inventory

# Install dependencies
npm install

# Start development server
npm run dev
```

## Downloading Minecraft Assets

To prepare item images locally, use the download script. The script automatically fetches the latest version from [InventivetalentDev/minecraft-assets](https://github.com/InventivetalentDev/minecraft-assets), clones the repository, and copies all item textures:

```bash
npm run download-assets
```

The script will:
1. Automatically detect the latest Minecraft version from the GitHub repository
2. Clone the repository for the latest version
3. Read all item definitions from `_all.json` in the cloned repository
4. Resolve textures through Minecraft's asset resolution system (same as the game)
5. Copy all item textures to `public/items/`
6. Create an `items.json` file at `public/items.json` with the item list

**Source:** Assets are cloned from [InventivetalentDev/minecraft-assets](https://github.com/InventivetalentDev/minecraft-assets) using the same asset resolution path as Minecraft.

## Acknowledgments

Special thanks to:
- [v0.dev](https://v0.dev/) - For providing the initial UI design and components
- [Cursor](https://cursor.sh/) - For the excellent development environment and AI assistance
- [@YOHEMAL](https://github.com/YOHEMAL) - For creating and providing the Minecraft inventory GUI images
- [InventivetalentDev/minecraft-assets](https://github.com/InventivetalentDev/minecraft-assets) - For providing extracted Minecraft assets

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details. 