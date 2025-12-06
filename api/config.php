<?php
// Database Configuration
$host = 'localhost';
$db_name = 'project_management';
$username = 'root'; // Default XAMPP/WAMP username
$password = '';     // Default XAMPP/WAMP password

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db_name;charset=utf8", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    die("Connection failed: " . $e->getMessage());
}
