export interface DownloadFileInfo {
  buffer: Buffer;
  fileName?: string;
}

export const downloadFile = async (url: string): Promise<DownloadFileInfo> => {
  const fetchPromise = await import("node-fetch");
  const fetch = fetchPromise.default;
  const response = await fetch(url);
  if (response.status !== 200) {
    throw Error(
      `Download of ${url} returned ${response.status} (${response.statusText})`
    );
  }
  const header = response.headers.get("Content-Disposition");
  const fileName = header?.split(";")[1].split("=")[1].replaceAll('"', "");
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, fileName };
};
