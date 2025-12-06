<?php
require_once 'config.php';

header('Content-Type: application/json');
session_start();

// Helper function
function sendResponse($success, $message, $data = []) {
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

// Check auth
if (!isset($_SESSION['user_id'])) {
    sendResponse(false, 'Unauthorized');
}

$user_id = $_SESSION['user_id'];
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Fetch user's projects
    try {
        $stmt = $pdo->prepare("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user_id]);
        $projects = $stmt->fetchAll();
        sendResponse(true, 'Projects fetched', $projects);
    } catch (PDOException $e) {
        sendResponse(false, 'Error fetching projects: ' . $e->getMessage());
    }

} elseif ($method === 'POST') {
    // Create new project
    $data = json_decode(file_get_contents('php://input'), true);
    $title = $data['title'] ?? '';
    $description = $data['description'] ?? '';

    if (empty($title)) {
        sendResponse(false, 'Title is required');
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO projects (user_id, title, description) VALUES (?, ?, ?)");
        $stmt->execute([$user_id, $title, $description]);
        
        $project_id = $pdo->lastInsertId();
        
        // Create default lists for the new project
        $default_lists = ['To Do', 'In Progress', 'Done'];
        $list_stmt = $pdo->prepare("INSERT INTO lists (project_id, title, position) VALUES (?, ?, ?)");
        
        foreach ($default_lists as $index => $list_title) {
            $list_stmt->execute([$project_id, $list_title, $index]);
        }

        sendResponse(true, 'Project created successfully', ['id' => $project_id, 'title' => $title]);
    } catch (PDOException $e) {
        sendResponse(false, 'Error creating project: ' . $e->getMessage());
    }
} else {
    sendResponse(false, 'Invalid method');
}
?>
