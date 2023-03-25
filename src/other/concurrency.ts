export const concurrentMap = async <OUTPUT, INPUT>(
  input: INPUT[],
  mapper: (arg: INPUT) => Promise<OUTPUT>,
  threads: number
): Promise<OUTPUT[]> => {
  let pMap;
  try {
    pMap = await import("p-map");
  } catch (err) {
    //console.warn("p-map not supported")
  }
  if (pMap !== undefined) {
    const concurrency = Math.round(Math.max(1, threads));
    return await pMap.default(input, mapper, { concurrency });
  }
  const results: OUTPUT[] = [];
  for (const a of input) {
    results.push(await mapper(a));
  }
  return results;
};
