export function stripExtension(filename = '') {
  return filename.replace(/\.[^/.]+$/, '');
}

const PROMO_TAG_PATTERN =
  /[\s\p{P}\p{S}]*masstamilan(?:\.?\s*com)?[\s\p{P}\p{S}]*/giu;

export function cleanSiteTag(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.replace(PROMO_TAG_PATTERN, ' ').replace(/\s+/g, ' ').trim();
}

export function parseSongMeta(filename) {
  const name = stripExtension(filename || 'Unknown');
  const parts = name
    .split(' - ')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return {
      artist: parts[0],
      title: parts.slice(1).join(' - '),
    };
  }

  return {
    artist: 'Unknown Artist',
    title: name || 'Unknown',
  };
}

export function formatDuration(value) {
  if (value == null || Number.isNaN(value)) {
    return '--:--';
  }

  const totalSeconds =
    value > 10000 ? Math.round(value / 1000) : Math.round(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
