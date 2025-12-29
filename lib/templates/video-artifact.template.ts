export function generateVideoArtifactHtml(
    videoUrl: string,
    thumbnailUrl: string,
    artifactName: string,
): string {
    return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${artifactName}</title>
  </head>
  <body>
    <video
      controls
      poster="${thumbnailUrl}"
      src="${videoUrl}"
      style="width: 100%; max-width: 100%; height: auto;"
    >
      Your browser does not support the video tag.
    </video>
  </body>
  </html>`;
}
