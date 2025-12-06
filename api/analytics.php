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

$user_id = $_SESSION['user_id'];
$project_id = $_GET['project_id'] ?? 0;

if (!$project_id) {
    sendResponse(false, 'Project ID required');
}

// Verify project belongs to user
$stmt = $pdo->prepare("SELECT id FROM projects WHERE id = ? AND user_id = ?");
$stmt->execute([$project_id, $user_id]);
if (!$stmt->fetch()) {
    sendResponse(false, 'Project not found or access denied');
}

try {
    // 1. Task Distribution (Bar Chart)
    $stmt = $pdo->prepare("
        SELECT l.title as status, count(t.id) as count 
        FROM lists l 
        LEFT JOIN tasks t ON l.id = t.list_id 
        WHERE l.project_id = ? 
        GROUP BY l.id, l.title
    ");
    $stmt->execute([$project_id]);
    $distribution = $stmt->fetchAll();

    // 2. Summary Stats
    // Total Tasks
    $stmt = $pdo->prepare("
        SELECT count(t.id) as total 
        FROM tasks t 
        JOIN lists l ON t.list_id = l.id 
        WHERE l.project_id = ?
    ");
    $stmt->execute([$project_id]);
    $totalTasks = $stmt->fetch()['total'];

    // Completed Tasks (Assuming 'Done' list title implies completion)
    // Adjust logic if 'Done' list has a specific ID or flag
    $stmt = $pdo->prepare("
        SELECT count(t.id) as completed 
        FROM tasks t 
        JOIN lists l ON t.list_id = l.id 
        WHERE l.project_id = ? AND l.title = 'Done'
    ");
    $stmt->execute([$project_id]);
    $completedTasks = $stmt->fetch()['completed'];

    // Overdue Tasks (Assuming due_date is set)
    // For now, we don't have due_date UI setting, so this might be 0, but logic is here
    $stmt = $pdo->prepare("
        SELECT count(t.id) as overdue 
        FROM tasks t 
        JOIN lists l ON t.list_id = l.id 
        WHERE l.project_id = ? AND t.due_date < NOW() AND l.title != 'Done'
    ");
    $stmt->execute([$project_id]);
    $overdueTasks = $stmt->fetch()['overdue'];

    // Calculate Completion Rate
    $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;

    // 3. Upcoming Deadlines (Next 7 days)
    $stmt = $pdo->prepare("
        SELECT t.title, t.due_date 
        FROM tasks t 
        JOIN lists l ON t.list_id = l.id 
        WHERE l.project_id = ? 
        AND t.due_date BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
        AND l.title != 'Done'
        ORDER BY t.due_date ASC
        LIMIT 5
    ");
    $stmt->execute([$project_id]);
    $upcoming = $stmt->fetchAll();

    sendResponse(true, 'Analytics fetched', [
        'distribution' => $distribution,
        'summary' => [
            'total' => $totalTasks,
            'completed' => $completedTasks,
            'overdue' => $overdueTasks,
            'rate' => $completionRate
        ],
        'upcoming' => $upcoming
    ]);
} catch (PDOException $e) {
    sendResponse(false, 'Error fetching analytics: ' . $e->getMessage());
}
?>
