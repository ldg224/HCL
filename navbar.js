(function() {
    // 1. Create and inject global navigation styles dynamically
    const style = document.createElement('style');
    style.textContent = `
        .hcl-navbar {
            width: 100%;
            background: #ffffff;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: center;
            box-sizing: border-box;
            position: sticky;
            top: 0;
            z-index: 9999;
        }
        .hcl-navbar-container {
            width: 100%;
            max-width: 1200px;
            padding: 0 20px;
            height: 64px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
        }
        .hcl-navbar-brand {
            display: flex;
            align-items: center;
            text-decoration: none;
            gap: 10px;
        }
        .hcl-navbar-logo {
            height: 32px;
            object-fit: contain;
        }
        .hcl-navbar-links {
            display: flex;
            gap: 24px;
            list-style: none;
            margin: 0;
            padding: 0;
            height: 100%;
        }
        .hcl-navbar-links li {
            height: 100%;
        }
        .hcl-navbar-links a {
            display: flex;
            align-items: center;
            height: 100%;
            text-decoration: none;
            color: #64748b;
            font-size: 0.9rem;
            font-weight: 600;
            padding: 0 4px;
            position: relative;
            transition: color 0.15s;
        }
        .hcl-navbar-links a:hover {
            color: #0066cc;
        }
        .hcl-navbar-links a.active {
            color: #0f172a;
        }
        .hcl-navbar-links a.active::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background-color: #0066cc;
            border-radius: 3px 3px 0 0;
        }
        @media (max-width: 600px) {
            .hcl-navbar-container { height: 56px; }
            .hcl-navbar-links { gap: 16px; }
            .hcl-navbar-links a { font-size: 0.85rem; }
            .hcl-navbar-logo { height: 26px; }
        }
    `;
    document.head.appendChild(style);

    // 2. Build the structural HTML layout for the header
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    
    const navbarHtml = `
        <div class="hcl-navbar">
            <div class="hcl-navbar-container">
                <a href="index.html" class="hcl-navbar-brand">
                    <img src="logo_hcl_main.png" alt="HCL Logo" class="hcl-navbar-logo">
                </a>
                <ul class="hcl-navbar-links">
                    <li><a href="index.html" class="${currentPage === 'index.html' ? 'active' : ''}">Matches</a></li>
                    <li><a href="standings.html" class="${currentPage === 'standings.html' ? 'active' : ''}">Standings</a></li>
                    <li><a href="market.html" class="${currentPage === 'market.html' ? 'active' : ''}">Players & Market</a></li>
                </ul>
            </div>
        </div>
    `;

    // 3. Inject it cleanly right at the top of the body element
    document.body.insertAdjacentHTML('afterbegin', navbarHtml);
})();
