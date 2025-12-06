document.addEventListener('DOMContentLoaded', function () {
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    const showRegisterBtn = document.getElementById('show-register');
    const showLoginBtn = document.getElementById('show-login');

    const navRegisterBtn = document.getElementById('nav-register');
    const navLoginBtn = document.getElementById('nav-login');

    // Toggle to Register
    function showRegister(e) {
        if (e) e.preventDefault();
        loginCard.classList.add('d-none');
        registerCard.classList.remove('d-none');
        navLoginBtn.classList.remove('active');
        navRegisterBtn.classList.add('active');
    }

    // Toggle to Login
    function showLogin(e) {
        if (e) e.preventDefault();
        registerCard.classList.add('d-none');
        loginCard.classList.remove('d-none');
        navRegisterBtn.classList.remove('active');
        navLoginBtn.classList.add('active');
    }

    showRegisterBtn.addEventListener('click', showRegister);
    showLoginBtn.addEventListener('click', showLogin);
    navRegisterBtn.addEventListener('click', showRegister);
    navLoginBtn.addEventListener('click', showLogin);

    // Handle Login Submit
    document.getElementById('login-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        fetch('api/auth.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    window.location.href = data.data.redirect;
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error:', error));
    });

    // Handle Register Submit
    document.getElementById('register-form').addEventListener('submit', function (e) {
        e.preventDefault();
        const username = document.getElementById('reg-username').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        fetch('api/auth.php?action=register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Registration successful! Please login.');
                    // Switch to login view
                    registerCard.classList.add('d-none');
                    loginCard.classList.remove('d-none');
                } else {
                    alert(data.message);
                }
            })
            .catch(error => console.error('Error:', error));
    });
});
