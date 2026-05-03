import db from "../config/db.js";

export const getAdminDashboardStats = async () => {
  const [[{ totalUsers }]] = await db.promise().query("SELECT COUNT(*) as totalUsers FROM users WHERE role = 'user'");
  const [[{ totalTemplates }]] = await db.promise().query("SELECT COUNT(*) as totalTemplates FROM templates");
  const [[{ totalDocuments }]] = await db.promise().query("SELECT COUNT(*) as totalDocuments FROM documents");

  const [recentDocuments] = await db.promise().query(`
    SELECT d.id, d.title, d.status, d.created_at, u.fullName as author, t.name as template_name
    FROM documents d
    JOIN users u ON d.user_id = u.id
    JOIN templates t ON d.template_id = t.id
    ORDER BY d.created_at DESC LIMIT 5
  `);

  const [docsByType] = await db.promise().query(`
    SELECT dt.name, COUNT(d.id) as count
    FROM documents d
    JOIN templates t ON d.template_id = t.id
    JOIN document_types dt ON t.document_type_id = dt.id
    GROUP BY dt.id, dt.name
  `);

  return {
    stats: { totalUsers, totalTemplates, totalDocuments },
    recentDocuments,
    docsByType
  };
};

export const getUserDashboardStats = async (userId) => {
  const [[{ totalDocuments }]] = await db.promise().query("SELECT COUNT(*) as totalDocuments FROM documents WHERE user_id = ?", [userId]);
  const [[{ completedDocs }]] = await db.promise().query("SELECT COUNT(*) as completedDocs FROM documents WHERE user_id = ? AND status = 'completed'", [userId]);
  
  const [recentDocuments] = await db.promise().query(`
    SELECT d.id, d.title, d.status, d.created_at, t.name as template_name
    FROM documents d
    JOIN templates t ON d.template_id = t.id
    WHERE d.user_id = ?
    ORDER BY d.created_at DESC LIMIT 5
  `, [userId]);

  const [docsByStatus] = await db.promise().query(`
    SELECT status as name, COUNT(id) as count
    FROM documents
    WHERE user_id = ?
    GROUP BY status
  `, [userId]);

  return {
    stats: { 
      totalDocuments, 
      completedDocs, 
      draftDocs: totalDocuments - completedDocs 
    },
    recentDocuments,
    docsByStatus: docsByStatus.length ? docsByStatus : [{name: "Draft", count: 0}, {name: "Completed", count: 0}]
  };
};
