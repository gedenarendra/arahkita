import Dexie from "dexie";

export const db = new Dexie("ArahKitaDB");

// Deklarasi skema tabel IndexedDB
// Contoh format penambahan tabel di masa mendatang:
// db.version(1).stores({
//   userProfile: '++id, name, grade',
//   testResults: '++id, testId, completedAt',
// });
db.version(1).stores({
  majorNodes: 'id, major_name, circle_color, child_id',
});

db.version(2).stores({
  majorNodes: 'id, major_name, circle_color, child_id',
  recommendationResults: 'id, major_name, circle_color, matching_percentage, is_completed',
  userProfile: 'id, minat, nilai',
  previews: 'id, major_node_id, matching_percentage',
});

db.version(3).stores({
  majorNodes: 'id, major_name, circle_color, child_id',
  recommendationResults: 'id, major_name, circle_color, matching_percentage, is_completed',
  userProfile: 'id, minat, nilai',
  previews: 'id, major_node_id, matching_percentage',
  minicases: 'id, parent_id, minicase_number, node_type, is_done',
});

export default db;
