<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');

// Helper function to send JSON response
function sendResponse($success, $message, $data = []) {
    echo json_encode(['success' => $success, 'message' => $message, 'data' => $data]);
    exit;
}

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);
$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'register') {
    $username = $data['username'] ?? '';
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($username) || empty($email) || empty($password)) {
        sendResponse(false, 'All fields are required');
    }

    // Check if user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ? OR username = ?");
    $stmt->execute([$email, $username]);
    if ($stmt->fetch()) {
        sendResponse(false, 'User already exists');
    }

    // Hash password
    $password_hash = password_hash($password, PASSWORD_BCRYPT);

    // Insert user
    try {
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $password_hash]);
        sendResponse(true, 'Registration successful');
    } catch (PDOException $e) {
        sendResponse(false, 'Registration failed: ' . $e->getMessage());
    }

} elseif ($action === 'login') {
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        sendResponse(false, 'Email and password are required');
    }

    // Fetch user
    $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if ($user && password_verify($password, $user['password_hash'])) {
        // Session already started at top
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        
        sendResponse(true, 'Login successful', ['redirect' => 'dashboard.html']);
    } else {
        sendResponse(false, 'Invalid credentials');
    }

} else {
    sendResponse(false, 'Invalid action');
}
