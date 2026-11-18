/** Builds a .ico file that embeds PNG images (supported by all current browsers and Windows Vista+). */
export function icoFromPngs(images: { size: number; data: Uint8Array }[]) {
  const headerSize = 6 + images.length * 16;
  const total = headerSize + images.reduce((sum, image) => sum + image.data.length, 0);
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  let offset = headerSize;
  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    out[entry] = image.size >= 256 ? 0 : image.size;
    out[entry + 1] = image.size >= 256 ? 0 : image.size;
    out[entry + 2] = 0;
    out[entry + 3] = 0;
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, image.data.length, true);
    view.setUint32(entry + 12, offset, true);
    out.set(image.data, offset);
    offset += image.data.length;
  });
  return out;
}

export function faviconHtml(name = "My site", theme = "#ffffff") {
  return [
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">',
    '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">',
    `<meta name="theme-color" content="${theme.replace(/[^#0-9a-z]/gi, "")}">`,
    `<!-- ${name.replace(/--/g, "")} -->`,
  ].join("\n");
}

export function webManifest(name: string, theme: string) {
  return JSON.stringify(
    {
      name,
      short_name: name.slice(0, 12),
      icons: [
        { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
        { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
      ],
      theme_color: theme,
      background_color: theme,
      display: "standalone",
    },
    null,
    2,
  );
}
