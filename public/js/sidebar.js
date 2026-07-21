// 侧边栏导航组件
function renderSidebar(activePage) {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    const menus = [
        {
            icon: 'bi-house-door', label: '首页', href: 'index.html',
            active: ['index.html']
        },
        {
            icon: 'bi-box-seam', label: '商品管理', href: 'product_list.html',
            active: ['product_list.html', 'products.html'],
            children: [
                { icon: 'bi-plus-circle', label: '新增商品', href: 'products.html' },
                { icon: 'bi-list-check', label: '商品列表', href: 'product_list.html' }
            ]
        },
        {
            icon: 'bi-arrow-left-right', label: '出入库管理', href: 'in.html',
            active: ['in.html', 'out.html', 'in_records.html', 'out_records.html', 'batch.html'],
            children: [
                {
                    icon: 'bi-arrow-down-circle', label: '入库管理', href: 'in.html',
                    active: ['in.html', 'in_records.html'],
                    children: [
                        { icon: 'bi-plus-circle', label: '新增入库', href: 'in.html' },
                        { icon: 'bi-list-ul', label: '入库列表', href: 'in_records.html' }
                    ]
                },
                {
                    icon: 'bi-arrow-up-circle', label: '出库管理', href: 'out.html',
                    active: ['out.html', 'out_records.html'],
                    children: [
                        { icon: 'bi-plus-circle', label: '新增出库', href: 'out.html' },
                        { icon: 'bi-list-ul', label: '出库列表', href: 'out_records.html' }
                    ]
                },
                {
                    icon: 'bi-list-columns', label: '批量管理', href: 'batch.html',
                    active: ['batch.html'],
                    children: [
                        { icon: 'bi-arrow-down-circle', label: '批量入库', href: 'batch.html' },
                        { icon: 'bi-arrow-up-circle', label: '批量出库', href: 'batch.html' }
                    ]
                }
            ]
        },
        {
            icon: 'bi-clipboard-data', label: '库存管理', href: 'stock.html',
            active: ['stock.html', 'query.html'],
            children: [
                { icon: 'bi-table', label: '库存列表', href: 'stock.html' },
                { icon: 'bi-search', label: '库存查询', href: 'query.html' }
            ]
        },
        {
            icon: 'bi-truck', label: '供应商管理', href: 'suppliers.html',
            active: ['suppliers.html'],
            children: [
                { icon: 'bi-plus-circle', label: '新增供应商', href: 'suppliers.html' },
                { icon: 'bi-list-check', label: '供应商列表', href: 'suppliers.html' }
            ]
        },
        {
            icon: 'bi-people', label: '客户管理', href: 'customers.html',
            active: ['customers.html'],
            children: [
                { icon: 'bi-plus-circle', label: '新增客户', href: 'customers.html' },
                { icon: 'bi-list-check', label: '客户列表', href: 'customers.html' }
            ]
        },
        {
            icon: 'bi-bar-chart-line', label: '看板大屏', href: 'dashboard.html',
            active: ['dashboard.html']
        },
        {
            icon: 'bi-gear', label: '设置', href: 'settings.html',
            active: ['settings.html']
        }
    ];

    let html = '<div class="sidebar-brand"><i class="bi bi-warehouse me-2"></i>仓库管理系统</div>';
    html += '<nav class="sidebar-nav">';

    menus.forEach(menu => {
        const isActive = menu.active.includes(activePage);
        const hasChildren = menu.children && menu.children.length > 0;

        if (hasChildren) {
            html += `<div class="sidebar-item ${isActive ? 'active' : ''}">
                <a class="sidebar-link has-children" href="javascript:void(0)" onclick="toggleSubmenu(this)">
                    <i class="bi ${menu.icon} me-2"></i><span>${menu.label}</span>
                    <i class="bi bi-chevron-down ms-auto arrow"></i>
                </a>
                <div class="sidebar-submenu ${isActive ? 'show' : ''}">`;

            menu.children.forEach(child => {
                const childActive = child.active && child.active.includes(activePage);
                if (child.children && child.children.length > 0) {
                    html += `<div class="sidebar-sub-item ${childActive ? 'active' : ''}">
                        <a class="sidebar-link has-children" href="javascript:void(0)" onclick="toggleSubmenu(this)">
                            <i class="bi ${child.icon} me-2"></i><span>${child.label}</span>
                            <i class="bi bi-chevron-down ms-auto arrow"></i>
                        </a>
                        <div class="sidebar-submenu ${childActive ? 'show' : ''}">`;
                    child.children.forEach(grandchild => {
                        html += `<a class="sidebar-link ${grandchild.href === activePage ? 'active' : ''}" href="${grandchild.href}">
                            <i class="bi ${grandchild.icon} me-2"></i><span>${grandchild.label}</span>
                        </a>`;
                    });
                    html += '</div></div>';
                } else {
                    html += `<a class="sidebar-link ${child.href === activePage ? 'active' : ''}" href="${child.href}">
                        <i class="bi ${child.icon} me-2"></i><span>${child.label}</span>
                    </a>`;
                }
            });

            html += '</div></div>';
        } else {
            html += `<div class="sidebar-item">
                <a class="sidebar-link ${isActive ? 'active' : ''}" href="${menu.href}">
                    <i class="bi ${menu.icon} me-2"></i><span>${menu.label}</span>
                </a>
            </div>`;
        }
    });

    html += '</nav>';

    // 用户信息
    html += `<div class="sidebar-footer">
        <div class="sidebar-user">
            <i class="bi bi-person-circle me-2"></i>
            <span id="currentUser">未登录</span>
        </div>
        <button class="btn btn-outline-light btn-sm w-100" onclick="logout()">
            <i class="bi bi-box-arrow-right me-1"></i>退出登录
        </button>
    </div>`;

    sidebar.innerHTML = html;

    // 恢复展开状态
    const savedState = localStorage.getItem('sidebar_state');
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            document.querySelectorAll('.sidebar-submenu').forEach((menu, i) => {
                if (state[i]) menu.classList.add('show');
            });
        } catch (e) {}
    }
}

function toggleSubmenu(el) {
    const submenu = el.nextElementSibling;
    if (!submenu) return;
    submenu.classList.toggle('show');

    // 保存展开状态
    const state = [];
    document.querySelectorAll('.sidebar-submenu').forEach(menu => {
        state.push(menu.classList.contains('show'));
    });
    localStorage.setItem('sidebar_state', JSON.stringify(state));
}
