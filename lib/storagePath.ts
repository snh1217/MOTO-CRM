export function getStoragePathFromUrl(url: string | null, bucket: string) {
  if (!url) return null;
  const publicMarker = `/storage/v1/object/public/${bucket}/`;
  const privateMarker = `/storage/v1/object/${bucket}/`;

  const publicIndex = url.indexOf(publicMarker);
  if (publicIndex !== -1) {
    return decodeURIComponent(url.slice(publicIndex + publicMarker.length));
  }

  const privateIndex = url.indexOf(privateMarker);
  if (privateIndex !== -1) {
    return decodeURIComponent(url.slice(privateIndex + privateMarker.length));
  }

  return null;
}

export function getStorageInfoFromUrl(url: string | null): { bucket: string; path: string } | null {
  if (!url) return null;
  const publicMarker = `/storage/v1/object/public/`;
  const privateMarker = `/storage/v1/object/`;

  const publicIndex = url.indexOf(publicMarker);
  if (publicIndex !== -1) {
    const rest = url.slice(publicIndex + publicMarker.length);
    const slash = rest.indexOf('/');
    if (slash > 0) {
      const bucket = rest.slice(0, slash);
      const path = decodeURIComponent(rest.slice(slash + 1));
      return bucket && path ? { bucket, path } : null;
    }
  }

  const privateIndex = url.indexOf(privateMarker);
  if (privateIndex !== -1) {
    const rest = url.slice(privateIndex + privateMarker.length);
    const slash = rest.indexOf('/');
    if (slash > 0) {
      const bucket = rest.slice(0, slash);
      const path = decodeURIComponent(rest.slice(slash + 1));
      return bucket && path ? { bucket, path } : null;
    }
  }

  return null;
}
