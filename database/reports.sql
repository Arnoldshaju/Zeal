-- 1. Documents per user
SELECT u.username, COUNT(d.id) AS document_count
FROM auth_user AS u
LEFT JOIN documents_document AS d ON d.owner_id = u.id
GROUP BY u.id, u.username
ORDER BY document_count DESC;

-- 2. Documents per workspace
SELECT w.name, COUNT(d.id) AS document_count
FROM workspaces_workspace AS w
LEFT JOIN documents_document AS d ON d.workspace_id = w.id
GROUP BY w.id, w.name
ORDER BY document_count DESC;

-- 3. Workspace members grouped by role
SELECT w.name, wm.role, COUNT(*) AS member_count
FROM workspaces_workspacemember AS wm
JOIN workspaces_workspace AS w ON w.id = wm.workspace_id
GROUP BY w.id, w.name, wm.role
ORDER BY w.name, wm.role;

-- 4. Most recently updated documents
SELECT id, title, workspace_id, updated_at
FROM documents_document
ORDER BY updated_at DESC
LIMIT 20;

-- 5. Documents with the most revisions
SELECT d.title, COUNT(r.id) AS revision_count
FROM documents_document AS d
LEFT JOIN documents_documentrevision AS r ON r.document_id = d.id
GROUP BY d.id, d.title
ORDER BY revision_count DESC;

-- 6. Users who created the most revisions
SELECT u.username, COUNT(r.id) AS revision_count
FROM auth_user AS u
JOIN documents_documentrevision AS r ON r.author_id = u.id
GROUP BY u.id, u.username
ORDER BY revision_count DESC;

-- 7. Unresolved comments per document
SELECT d.title, COUNT(c.id) AS unresolved_comments
FROM documents_document AS d
LEFT JOIN documents_comment AS c
    ON c.document_id = d.id AND c.is_resolved = FALSE
GROUP BY d.id, d.title
ORDER BY unresolved_comments DESC;

-- 8. Documents grouped by tag
SELECT t.name AS tag, COUNT(dt.document_id) AS document_count
FROM documents_tag AS t
LEFT JOIN documents_document_tags AS dt ON dt.tag_id = t.id
GROUP BY t.id, t.name
ORDER BY document_count DESC, t.name;

-- 9. Workspace activity during the last 30 days
WITH workspace_activity AS (
    SELECT workspace_id, COUNT(*) AS event_count
    FROM workspaces_auditlog
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY workspace_id
)
SELECT w.name, wa.event_count
FROM workspace_activity AS wa
JOIN workspaces_workspace AS w ON w.id = wa.workspace_id
ORDER BY wa.event_count DESC;

-- 10. Users who have not created documents
SELECT u.id, u.username
FROM auth_user AS u
WHERE NOT EXISTS (
    SELECT 1
    FROM documents_document AS d
    WHERE d.owner_id = u.id
)
ORDER BY u.username;
