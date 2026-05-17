import { createPool, getPostgresCandidates, getPostgresDatabaseCandidates } from "@/lib/db/postgres";

function getQnaPoolCache() {
  if (!globalThis.__qnaPostgresPools) {
    globalThis.__qnaPostgresPools = new Map();
  }
  return globalThis.__qnaPostgresPools;
}

async function hasQnaTables(pool) {
  const [category] = await pool.query("SHOW TABLES LIKE 'qna_category'");
  const [item] = await pool.query("SHOW TABLES LIKE 'qna_item'");
  return Boolean(category.length && item.length);
}

export async function getQnaPool() {
  const caches = getQnaPoolCache();
  const hosts = getPostgresCandidates();
  const databases = getPostgresDatabaseCandidates();
  let lastError = "";

  for (const candidate of hosts) {
    for (const database of databases) {
      const key = `${candidate.host}:${candidate.port}/${database}`;
      let pool = caches.get(key);
      if (!pool) {
        pool = createPool({ ...candidate, database });
        caches.set(key, pool);
      }

      try {
        if (await hasQnaTables(pool)) {
          return pool;
        }
      } catch (error) {
        lastError = `${key}: ${error.message}`;
        caches.delete(key);
        await pool.end().catch(() => {});
      }
    }
  }

  throw new Error(lastError || "Tabel qna_category dan qna_item belum tersedia di database aktif.");
}

export async function getQnaOverview({ publishedOnly = false } = {}) {
  const pool = await getQnaPool();
  const categoryWhere = publishedOnly ? "WHERE c.`is_active` = 1" : "";
  const itemJoinFilter = publishedOnly ? "AND i.`status` = 'published'" : "";
  const itemWhere = publishedOnly ? "WHERE i.`status` = 'published' AND c.`is_active` = 1" : "";

  const [categories] = await pool.query(
    `SELECT
       c.*,
       COUNT(i.\`id\`) AS item_count,
       SUM(CASE WHEN i.\`status\` = 'published' THEN 1 ELSE 0 END) AS published_count,
       SUM(CASE WHEN i.\`status\` = 'draft' THEN 1 ELSE 0 END) AS draft_count
     FROM \`qna_category\` c
     LEFT JOIN \`qna_item\` i
       ON i.\`category_id\` = c.\`id\`
      ${itemJoinFilter}
     ${categoryWhere}
     GROUP BY c.\`id\`
     ORDER BY c.\`sort_order\` ASC, c.\`name\` ASC`
  );

  const [items] = await pool.query(
    `SELECT
       i.*,
       c.\`name\` AS category_name,
       c.\`description\` AS category_description,
       c.\`sort_order\` AS category_sort_order,
       c.\`is_active\` AS category_is_active
     FROM \`qna_item\` i
     INNER JOIN \`qna_category\` c ON c.\`id\` = i.\`category_id\`
     ${itemWhere}
     ORDER BY c.\`sort_order\` ASC, c.\`name\` ASC, i.\`updated_at\` DESC, i.\`id\` DESC`
  );

  const normalizedCategories = categories.map((category) => ({
    ...category,
    item_count: Number(category.item_count || 0),
    published_count: Number(category.published_count || 0),
    draft_count: Number(category.draft_count || 0),
    is_active: Boolean(category.is_active)
  }));

  const normalizedItems = items.map((item) => ({
    ...item,
    category_is_active: Boolean(item.category_is_active)
  }));

  const itemsByCategory = new Map();
  for (const item of normalizedItems) {
    const list = itemsByCategory.get(item.category_id) || [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  }

  return {
    categories: normalizedCategories.map((category) => ({
      ...category,
      items: itemsByCategory.get(category.id) || []
    })),
    items: normalizedItems
  };
}
