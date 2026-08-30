import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import jsmediatags from 'jsmediatags/build2/jsmediatags';
import ArrayFileReader from 'jsmediatags/build2/ArrayFileReader';
import { PermissionsAndroid, Platform } from 'react-native';

import { cleanSiteTag, parseSongMeta } from './songs';

export const LIBRARY_FOLDER_NAME = 'King Music Player';
const ANDROID_SHARED_ROOT = 'file:///storage/emulated/0/King Music Player';
const LIBRARY_SAF_URI_KEY = '@king-music/library-saf-uri';
const LIBRARY_SAF_DENIED_KEY = '@king-music/library-saf-denied';
const SKIP_DIRECTORY_NAMES = new Set([
  'playlist-transfer-imported',
  'RCTAsyncLocalStorage',
]);
const AUDIO_EXTENSIONS = new Set(['.mp3']);
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ARTWORK_CACHE_DIR_NAME = 'king-music-artwork';

function getExtension(name = '') {
  const index = name.lastIndexOf('.');
  if (index < 0) {
    return '';
  }
  return name.slice(index).toLowerCase();
}

function isAudioName(name = '') {
  return AUDIO_EXTENSIONS.has(getExtension(name));
}

function isAudioFile(item) {
  return isAudioName(item?.name || '');
}

function nameFromUri(uri = '') {
  const parts = uri.split('/');
  return decodeURIComponent(parts[parts.length - 1] || '');
}

function bytesToBase64(bytes) {
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];

    output += alphabet[first >> 2];
    output += alphabet[((first & 3) << 4) | ((second ?? 0) >> 4)];
    output +=
      second === undefined
        ? '='
        : alphabet[((second & 15) << 2) | ((third ?? 0) >> 6)];
    output += third === undefined ? '=' : alphabet[third & 63];
  }

  return output;
}

function baseNameFromUri(uri = '') {
  const name = nameFromUri(uri);
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(0, index) : name;
}

function parentUriFromFileUri(fileUri = '') {
  const index = fileUri.lastIndexOf('/');
  if (index <= 'file://'.length) {
    return null;
  }

  return fileUri.slice(0, index);
}

async function findSidecarArtworkUri(fileUri) {
  const parentUri = parentUriFromFileUri(fileUri);
  const basename = baseNameFromUri(fileUri);

  if (!parentUri || !basename) {
    return null;
  }

  for (const extension of IMAGE_EXTENSIONS) {
    const uri = `${parentUri}/${basename}${extension}`;
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      return uri;
    }
  }

  return null;
}

async function mediaTagFilePath(fileUri) {
  if (fileUri.startsWith('file://')) {
    return decodeURIComponent(fileUri.replace(/^file:\/\//, ''));
  }

  const separator = Paths.cache.endsWith('/') ? '' : '/';
  const cacheUri = `${Paths.cache}${separator}king-music-tag-${encodeURIComponent(
    fileUri,
  )}.mp3`;
  const exists = await FileSystem.getInfoAsync(cacheUri);
  if (!exists.exists) {
    await FileSystem.copyAsync({ from: fileUri, to: cacheUri });
  }

  return decodeURIComponent(cacheUri.replace(/^file:\/\//, ''));
}

function readTagsFromBytes(bytes) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out reading media tags.'));
    }, 10000);
    const done = (value) => {
      clearTimeout(timeout);
      resolve(value);
    };
    const fail = (error) => {
      clearTimeout(timeout);
      reject(error);
    };

    try {
      new jsmediatags.Reader(bytes)
        .setFileReader(ArrayFileReader)
        .read({ onSuccess: done, onError: fail });
    } catch (error) {
      fail(error);
    }
  });
}

async function readMediaTags(fileUri) {
  const filePath = await mediaTagFilePath(fileUri);
  const bytes = await new File(filePath).bytes();
  return readTagsFromBytes(bytes);
}

async function extractEmbeddedArtworkUri(fileUri, mediaTags) {
  const tag = mediaTags || (await readMediaTags(fileUri));
  const picture = tag?.tags?.picture;
  if (!picture?.data?.length) {
    return null;
  }

  const separator = Paths.cache.endsWith('/') ? '' : '/';
  const cacheDirectory = `${Paths.cache}${separator}${ARTWORK_CACHE_DIR_NAME}`;
  await FileSystem.makeDirectoryAsync(cacheDirectory, { intermediates: true });

  const extension = picture.format?.split('/')[1] || 'jpeg';
  const fileName = `${encodeURIComponent(fileUri)}.${extension}`;
  const cacheUri = `${cacheDirectory}/${fileName}`;

  const exists = await FileSystem.getInfoAsync(cacheUri);
  if (!exists.exists) {
    await FileSystem.writeAsStringAsync(cacheUri, bytesToBase64(picture.data), {
      encoding: FileSystem.EncodingType.Base64,
    });
  }

  return cacheUri;
}

export async function resolveSongArtworkUri(fileUri, mediaTags) {
  if (!fileUri) {
    return null;
  }

  const sidecar = await findSidecarArtworkUri(fileUri);
  if (sidecar) {
    return sidecar;
  }

  try {
    return await extractEmbeddedArtworkUri(fileUri, mediaTags);
  } catch {
    return null;
  }
}

function collectAudioFiles(directory, results = []) {
  if (!directory?.exists || typeof directory.list !== 'function') {
    return results;
  }

  let items = [];
  try {
    items = directory.list();
  } catch {
    return results;
  }

  items.forEach((item) => {
    if (!item?.name || item.name.startsWith('.')) {
      return;
    }

    if (item instanceof File) {
      if (isAudioFile(item)) {
        results.push(item);
      }
      return;
    }

    if (item instanceof Directory || typeof item.list === 'function') {
      if (SKIP_DIRECTORY_NAMES.has(item.name)) {
        return;
      }
      collectAudioFiles(item, results);
      return;
    }

    if (item?.uri && isAudioFile(item)) {
      results.push(item);
    }
  });

  return results;
}

async function collectSafAudioFiles(directoryUri, results = []) {
  let uris = [];
  try {
    uris =
      await FileSystem.StorageAccessFramework.readDirectoryAsync(directoryUri);
  } catch {
    return results;
  }

  for (const uri of uris) {
    const name = nameFromUri(uri);
    if (!name || name.startsWith('.')) {
      continue;
    }

    if (isAudioName(name)) {
      results.push({ uri, name });
      continue;
    }

    await collectSafAudioFiles(uri, results);
  }

  return results;
}

function tryAndroidSharedDirectory() {
  try {
    const shared = new Directory(ANDROID_SHARED_ROOT);
    if (!shared.exists) {
      shared.create({ intermediates: true });
    }
    return shared.exists ? shared : null;
  } catch {
    return null;
  }
}

function documentsDirectory() {
  const documents = new Directory(Paths.document);
  if (!documents.exists) {
    documents.create({ intermediates: true });
  }
  return documents;
}

function appSandboxLibraryDirectory() {
  const documents = documentsDirectory();
  const separator = documents.uri.endsWith('/') ? '' : '/';
  const directory = new Directory(`${documents.uri}${separator}`);

  if (!directory.exists) {
    directory.create({ intermediates: true });
  }

  return directory;
}

export function getLibraryFolderHint() {
  if (Platform.OS === 'ios') {
    return `Add MP3 files in the Files app under On My iPhone → ${LIBRARY_FOLDER_NAME}.`;
  }

  if (Platform.OS === 'android') {
    return `Add MP3 files in the Files app under Internal storage → ${LIBRARY_FOLDER_NAME}.`;
  }

  return 'Local music files are available on iOS and Android.';
}

export async function requestFileStoragePermission({
  forcePrompt = false,
} = {}) {
  if (Platform.OS !== 'android') {
    return { granted: true, canAskAgain: true, status: 'granted' };
  }

  const apiLevel = Number(Platform.Version);
  if (Number.isNaN(apiLevel) || apiLevel < 33) {
    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      {
        title: 'File storage permission',
        message: `${LIBRARY_FOLDER_NAME} needs file storage access to create its folder and read MP3 files.`,
        buttonNegative: 'Deny',
        buttonPositive: 'Allow',
      },
    );

    const granted = status === PermissionsAndroid.RESULTS.GRANTED;
    return {
      granted,
      canAskAgain: status !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
      status: granted ? 'granted' : 'denied',
    };
  }

  if (tryAndroidSharedDirectory()) {
    return { granted: true, canAskAgain: true, status: 'granted' };
  }

  const savedUri = await AsyncStorage.getItem(LIBRARY_SAF_URI_KEY);
  if (savedUri) {
    return { granted: true, canAskAgain: true, status: 'granted' };
  }

  const skipped = await AsyncStorage.getItem(LIBRARY_SAF_DENIED_KEY);
  if (skipped && !forcePrompt) {
    return { granted: false, canAskAgain: true, status: 'denied' };
  }

  const permissions =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permissions.granted) {
    await AsyncStorage.setItem(LIBRARY_SAF_DENIED_KEY, '1');
    return { granted: false, canAskAgain: true, status: 'denied' };
  }

  let directoryUri = permissions.directoryUri;
  try {
    directoryUri = await FileSystem.StorageAccessFramework.makeDirectoryAsync(
      permissions.directoryUri,
      LIBRARY_FOLDER_NAME,
    );
  } catch {
    directoryUri = permissions.directoryUri;
  }

  await AsyncStorage.setItem(LIBRARY_SAF_URI_KEY, directoryUri);
  await AsyncStorage.removeItem(LIBRARY_SAF_DENIED_KEY);
  return { granted: true, canAskAgain: true, status: 'granted' };
}

export async function ensureLibraryDirectory() {
  if (Platform.OS === 'android') {
    const shared = tryAndroidSharedDirectory();
    if (shared) {
      return { kind: 'file', directory: shared };
    }

    const savedUri = await AsyncStorage.getItem(LIBRARY_SAF_URI_KEY);
    if (savedUri) {
      return { kind: 'saf', uri: savedUri };
    }
  }

  return { kind: 'file', directory: appSandboxLibraryDirectory() };
}

export async function mapFileToSong(file) {
  const filename = file.name || 'Unknown';
  const fallbackMeta = parseSongMeta(filename);
  let mediaTags = null;
  try {
    mediaTags = await readMediaTags(file.uri);
  } catch {}
  const taggedTitle = mediaTags?.tags?.title;
  const taggedArtist = mediaTags?.tags?.artist || mediaTags?.tags?.author;
  const title =
    cleanSiteTag(taggedTitle) || cleanSiteTag(fallbackMeta.title) || 'Unknown';
  const artist =
    cleanSiteTag(taggedArtist) ||
    cleanSiteTag(fallbackMeta.artist) ||
    'Unknown Artist';
  const artworkUri = await resolveSongArtworkUri(file.uri, mediaTags);

  return {
    id: file.uri,
    title,
    artist,
    filename,
    duration: null,
    uri: file.uri,
    artworkUri,
  };
}

export async function loadLibrarySongs() {
  const library = await ensureLibraryDirectory();
  const files =
    library.kind === 'saf'
      ? await collectSafAudioFiles(library.uri)
      : collectAudioFiles(library.directory);

  const songs = await Promise.all(files.map(mapFileToSong));
  return songs.sort((a, b) => a.title.localeCompare(b.title));
}
