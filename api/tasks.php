<?php
require_once 'config.php';

header('Content-Type: application/json');
session_start();

function sendResponse($success, $message, $data = []) {
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

if (!isset($_SESSION['user_id'])) {
    sendResponse(false, 'Unauthorized');
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    // Fetch Lists and Tasks for a Project
    $project_id = $_GET['project_id'] ?? 0;
    
    if (!$project_id) {
        sendResponse(false, 'Project ID required');
    }

    try {
        // Check if project has lists
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM lists WHERE project_id = ?");
        $stmt->execute([$project_id]);
        $count = $stmt->fetchColumn();

        if ($count == 0) {
            // Create default lists
            $default_lists = ['To Do', 'In Progress', 'Done'];
            $list_stmt = $pdo->prepare("INSERT INTO lists (project_id, title, position) VALUES (?, ?, ?)");
            foreach ($default_lists as $index => $list_title) {
                $list_stmt->execute([$project_id, $list_title, $index]);
            }
        }

        // Fetch Lists
        $stmt = $pdo->prepare("SELECT * FROM lists WHERE project_id = ? ORDER BY position ASC");
        $stmt->execute([$project_id]);
        $lists = $stmt->fetchAll();

        // Fetch Tasks for each list
        foreach ($lists as &$list) {
            $stmt = $pdo->prepare("SELECT * FROM tasks WHERE list_id = ? ORDER BY position ASC");
            $stmt->execute([$list['id']]);
            $list['tasks'] = $stmt->fetchAll();
        }

        sendResponse(true, 'Board data fetched', $lists);
    } catch (PDOException $e) {
        sendResponse(false, 'Error fetching board: ' . $e->getMessage());
    }

} elseif ($method === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    if ($action === 'create_task') {
        $list_id = $data['list_id'] ?? 0;
        $title = $data['title'] ?? '';
        
        if (empty($title) || empty($list_id)) {
            sendResponse(false, 'Title and List ID required');
        }

        try {
            $stmt = $pdo->prepare("INSERT INTO tasks (list_id, title) VALUES (?, ?)");
            $stmt->execute([$list_id, $title]);
            sendResponse(true, 'Task created', ['id' => $pdo->lastInsertId(), 'title' => $title]);
        } catch (PDOException $e) {
            sendResponse(false, 'Error creating task: ' . $e->getMessage());
        }
    } elseif ($action === 'move_task') {
        $task_id = $data['task_id'] ?? 0;
        $list_id = $data['list_id'] ?? 0;
        
        if (!$task_id || !$list_id) {
            sendResponse(false, 'Task ID and List ID required');
        }

        try {
            $stmt = $pdo->prepare("UPDATE tasks SET list_id = ? WHERE id = ?");
            $stmt->execute([$list_id, $task_id]);
            sendResponse(true, 'Task moved successfully');
        } catch (PDOException $e) {
            sendResponse(false, 'Error moving task: ' . $e->getMessage());
        }

    } elseif ($action === 'update_task') {
        $task_id = $data['task_id'] ?? 0;
        $title = $data['title'] ?? '';
        $description = $data['description'] ?? '';
        $due_date = $data['due_date'] ?? null;

        if (!$task_id || empty($title)) {
            sendResponse(false, 'Task ID and Title required');
        }

        try {
            $stmt = $pdo->prepare("UPDATE tasks SET title = ?, description = ?, due_date = ? WHERE id = ?");
            $stmt->execute([$title, $description, $due_date ?: null, $task_id]);
            sendResponse(true, 'Task updated successfully');
        } catch (PDOException $e) {
            sendResponse(false, 'Error updating task: ' . $e->getMessage());
        }

    } elseif ($action === 'delete_task') {
        $task_id = $data['task_id'] ?? 0;

        if (!$task_id) {
            sendResponse(false, 'Task ID required');
        }

        try {
            $stmt = $pdo->prepare("DELETE FROM tasks WHERE id = ?");
            $stmt->execute([$task_id]);
            sendResponse(true, 'Task deleted successfully');
        } catch (PDOException $e) {
            sendResponse(false, 'Error deleting task: ' . $e->getMessage());
        }
    }
}
?>
