#!/usr/bin/env node

import { execSync } from "node:child_process";
import {
    cpSync,
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
    writeFileSync,
} from "node:fs";
import { join } from "node:path";

interface GitHubBranch {
    name: string;
    commit: {
        sha: string;
        url: string;
    };
    protected: boolean;
}

interface ItemInfo {
    name: string;
    texture: string;
    url: string;
}

interface ItemModel {
    type: string;
    model: string;
}

interface ItemDefinition {
    model: ItemModel | { type: string; [key: string]: unknown };
}

interface AllItemsJson {
    [itemName: string]: ItemDefinition;
}

interface ModelJson {
    parent?: string;
    textures?: {
        layer0?: string;
        [key: string]: string | undefined;
    };
    [key: string]: unknown;
}

function parseVersion(versionString: string): number[] {
    // Convert "1.21.11" to [1, 21, 11]
    return versionString.split(".").map(Number);
}

function compareVersions(v1: string, v2: string): number {
    const parts1 = parseVersion(v1);
    const parts2 = parseVersion(v2);
    const maxLength = Math.max(parts1.length, parts2.length);

    for (let i = 0; i < maxLength; i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
    }
    return 0;
}

async function getAllBranches(): Promise<GitHubBranch[]> {
    const branches: GitHubBranch[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const apiUrl = `https://api.github.com/repos/InventivetalentDev/minecraft-assets/branches?page=${page}&per_page=${perPage}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(
                `GitHub API error: ${response.status} ${response.statusText}`,
            );
        }

        const pageBranches: GitHubBranch[] = await response.json();

        if (pageBranches.length === 0) {
            break;
        }

        branches.push(...pageBranches);

        // Check if there are more pages
        const linkHeader = response.headers.get("link");
        if (!linkHeader || !linkHeader.includes('rel="next"')) {
            break;
        }

        page++;
    }

    return branches;
}

async function getLatestVersion(): Promise<string> {
    try {
        console.log("Fetching all branches from GitHub...");
        const branches = await getAllBranches();
        console.log(`Found ${branches.length} total branches`);

        // Filter branches that look like version numbers (e.g., "1.21.11")
        const versionPattern = /^\d+\.\d+(\.\d+)?$/;
        const versions = branches
            .map((branch) => branch.name)
            .filter((name) => versionPattern.test(name))
            .sort((a, b) => compareVersions(b, a)); // Sort descending

        if (versions.length === 0) {
            throw new Error("No version branches found");
        }

        console.log(`Found ${versions.length} version branches`);
        return versions[0];
    } catch (error) {
        console.error("Error fetching latest version:", error);
        throw error;
    }
}

function resolveModelPath(modelPath: string): string {
    // Convert "minecraft:item/apple" to "assets/minecraft/models/item/apple.json"
    const parts = modelPath.replace("minecraft:", "").split("/");
    if (parts.length === 2) {
        return `assets/minecraft/models/${parts[0]}/${parts[1]}.json`;
    }
    return modelPath;
}

function resolveTexturePath(texturePath: string): string {
    // Convert "minecraft:item/apple" to "assets/minecraft/textures/item/apple.png"
    const parts = texturePath.replace("minecraft:", "").split("/");
    if (parts.length === 2) {
        return `assets/minecraft/textures/${parts[0]}/${parts[1]}.png`;
    }
    return texturePath;
}

async function getTextureFromModel(
    repoRoot: string,
    modelPath: string,
    visited: Set<string> = new Set(),
): Promise<string | null> {
    // Prevent infinite loops
    if (visited.has(modelPath)) {
        return null;
    }
    visited.add(modelPath);

    const resolvedPath = resolveModelPath(modelPath);
    const modelFilePath = join(repoRoot, resolvedPath);

    if (!existsSync(modelFilePath)) {
        return null;
    }

    try {
        const modelJson = readFileSync(modelFilePath, "utf8");
        const model: ModelJson = JSON.parse(modelJson);

        if (model.textures?.layer0) {
            return model.textures.layer0;
        }

        if (model.parent) {
            return await getTextureFromModel(repoRoot, model.parent, visited);
        }
    } catch (error) {
        console.error(`Error parsing model ${modelPath}:`, error);
    }

    return null;
}

function itemNameToDisplayName(name: string): string {
    return name
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

function prepareLocalRepo(version: string): string {
    const cacheRoot = join(process.cwd(), ".cache", "minecraft-assets");
    const repoRoot = join(cacheRoot, version);

    if (!existsSync(cacheRoot)) {
        mkdirSync(cacheRoot, { recursive: true });
    }

    if (existsSync(repoRoot)) {
        rmSync(repoRoot, { recursive: true, force: true });
    }

    const repoUrl =
        "https://github.com/InventivetalentDev/minecraft-assets.git";

    console.log(`Cloning ${repoUrl} (branch ${version}) into ${repoRoot}...`);
    execSync(
        `git clone --depth 1 --branch ${version} ${repoUrl} "${repoRoot}"`,
        {
            stdio: "inherit",
        },
    );

    return repoRoot;
}

async function downloadAssets(): Promise<void> {
    const type = "items";

    console.log("Fetching latest version from GitHub...");
    const version = await getLatestVersion();
    console.log(`Latest version found: ${version}`);

    console.log(`Preparing local repository for version ${version}...`);
    const repoRoot = prepareLocalRepo(version);
    console.log(`Using assets from local repo: ${repoRoot}`);

    try {
        const allJsonPath = join(repoRoot, "assets/minecraft/items/_all.json");
        if (!existsSync(allJsonPath)) {
            throw new Error(`_all.json not found at ${allJsonPath}`);
        }

        const allJsonContent = readFileSync(allJsonPath, "utf8");
        const allItems: AllItemsJson = JSON.parse(allJsonContent);
        const itemNames = Object.keys(allItems);
        console.log(`Found ${itemNames.length} item definitions`);

        const outputDir = join(process.cwd(), "public", type);
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }

        const items: ItemInfo[] = [];
        let copied = 0;
        let failed = 0;

        for (let i = 0; i < itemNames.length; i++) {
            const itemName = itemNames[i];
            const itemDef = allItems[itemName];

            let modelPath: string | null = null;
            if (
                itemDef.model &&
                typeof itemDef.model === "object" &&
                "model" in itemDef.model
            ) {
                const model = itemDef.model as ItemModel;
                if (model.type === "minecraft:model") {
                    modelPath = model.model;
                }
            }

            if (!modelPath) {
                console.warn(`Skipping ${itemName}: no valid model path`);
                failed++;
                continue;
            }

            const texturePath = await getTextureFromModel(repoRoot, modelPath);
            if (!texturePath) {
                console.warn(`Skipping ${itemName}: could not resolve texture`);
                failed++;
                continue;
            }

            const resolvedTexturePath = resolveTexturePath(texturePath);
            const textureSourcePath = join(repoRoot, resolvedTexturePath);

            const textureName =
                texturePath.split("/").pop()?.replace("minecraft:", "") ||
                itemName;
            const fileName = `${textureName}.png`;
            const filePath = join(outputDir, fileName);

            try {
                cpSync(textureSourcePath, filePath);
                copied++;
            } catch (error) {
                console.error(
                    `Failed to copy texture for ${itemName} from ${textureSourcePath}:`,
                    error,
                );
                failed++;
            }

            items.push({
                name: itemNameToDisplayName(itemName),
                texture: textureName,
                url: `/${type}/${fileName}`,
            });

            console.log(
                `\r[${i + 1}/${itemNames.length}] Copied: ${copied}, Failed: ${failed}`,
            );

            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const itemsJsonPath = join(process.cwd(), "public", "items.json");
        writeFileSync(itemsJsonPath, JSON.stringify(items, null, 2));
        console.log(`\n\nItems list saved to: ${itemsJsonPath}`);

        console.log(`\nAsset copy complete!`);
        console.log(`  Copied: ${copied}`);
        console.log(`  Failed: ${failed}`);
        console.log(`  Total items: ${items.length}`);
        console.log(`  Output directory: ${outputDir}`);
    } catch (error) {
        console.error(`Error downloading items for version ${version}:`, error);
        process.exit(1);
    }
}

downloadAssets().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
