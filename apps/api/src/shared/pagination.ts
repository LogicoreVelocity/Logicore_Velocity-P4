export function parseListQuery(q: any) {
  const limit = Math.min(Math.max(parseInt(q.limit ?? "25", 10), 1), 200);
  const offset = Math.max(parseInt(q.offset ?? "0", 10), 0);
  const search = (q.search ?? "").toString().trim();
  const sort = (q.sort ?? "updated_at:desc").toString().trim();

  const filters: Record<string, string> = {};
  // supports filters[field]=value
  Object.keys(q).forEach((k) => {
    const m = k.match(/^filters\[(.+)\]$/);
    if (m) filters[m[1]] = String(q[k]);
  });

  return { limit, offset, search, sort, filters };
}
