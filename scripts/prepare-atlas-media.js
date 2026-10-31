import { copyFile, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const atlasRoot = path.join(root, 'atlas');
const catalogPath = path.join(root, 'dados', 'episodios_2026-10-30.json');
const indexPath = path.join(atlasRoot, 'index.json');
const outputRoot = path.join(root, 'assets', 'atlas');
const audioTypes = ['uk', 'us', 'ex', 'ex2'];

const [catalog, atlasIndex] = await Promise.all([
    readFile(catalogPath, 'utf8').then(JSON.parse),
    readFile(indexPath, 'utf8').then(JSON.parse)
]);

if (!Array.isArray(catalog.episodios) || !Array.isArray(atlasIndex.words)) {
    throw new Error('O catálogo ou o índice do Atlas está em um formato inválido.');
}

const vocabulary = new Set();
for (const episode of catalog.episodios) {
    for (const [category, entries] of Object.entries(episode)) {
        if (category === 'episodio' || !Array.isArray(entries)) continue;
        for (const entry of entries) {
            const word = String(entry.palavra || '').trim().toLowerCase();
            if (word) {
                vocabulary.add(word);
                continue;
            }
            for (const exercise of entry.exercicios || []) {
                const focus = String(exercise.foco || '').trim().toLowerCase();
                if (focus) vocabulary.add(focus);
            }
        }
    }
}

const atlasWords = new Map(atlasIndex.words.map((row) => [
    String(row[0] || '').toLowerCase(),
    String(row[0] || '')
]));
const mediaIndex = {};
let copiedFiles = 0;
let copiedBytes = 0;

async function copyMedia(source, destination) {
    try {
        const fileInfo = await stat(source);
        if (!fileInfo.isFile()) return false;
        await mkdir(path.dirname(destination), { recursive: true });
        await copyFile(source, destination);
        copiedFiles += 1;
        copiedBytes += fileInfo.size;
        return true;
    } catch (error) {
        if (error.code === 'ENOENT') return false;
        throw error;
    }
}

for (const word of vocabulary) {
    const atlasId = atlasWords.get(word);
    if (!atlasId || path.basename(atlasId) !== atlasId) continue;

    const record = {};
    if (await copyMedia(
        path.join(atlasRoot, 'img', `${atlasId}.webp`),
        path.join(outputRoot, 'img', `${atlasId}.webp`)
    )) {
        record.image = `img/${atlasId}.webp`;
    }

    const audio = {};
    for (const type of audioTypes) {
        if (await copyMedia(
            path.join(atlasRoot, 'audio', type, `${atlasId}.mp3`),
            path.join(outputRoot, 'audio', type, `${atlasId}.mp3`)
        )) {
            audio[type] = `audio/${type}/${atlasId}.mp3`;
        }
    }
    if (Object.keys(audio).length) record.audio = audio;
    if (record.image || record.audio) mediaIndex[word] = record;
}

await mkdir(outputRoot, { recursive: true });
await writeFile(
    path.join(outputRoot, 'media-index.json'),
    `${JSON.stringify({
        name: atlasIndex.name,
        license: atlasIndex.license,
        media: mediaIndex
    }, null, 2)}\n`,
    'utf8'
);

console.log(
    `Atlas: ${Object.keys(mediaIndex).length}/${vocabulary.size} palavras; ` +
    `${copiedFiles} arquivos (${(copiedBytes / 1024 / 1024).toFixed(1)} MB).`
);
