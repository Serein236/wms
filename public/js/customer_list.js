// 客户列表
let customers = [];
let customerPagination = PaginationHelper.getDefaultState();

async function checkLogin() {
    try {
        const resp = await fetch('/api/auth/current-user');
        const data = await resp.json();
        if (!data.loggedIn) { window.location.href = 'login.html'; return; }
        document.getElementById('currentUser').textContent = '欢迎, ' + data.username;
        loadProducts();
    } catch (e) { window.location.href = 'login.html'; }
}

async function loadProducts(page) {
    const paginationDiv = document.getElementById('paginationControls');
    const searchQuery = document.getElementById('searchInput').value.trim();
    if (page) customerPagination.page = page;

    try {
        const params = {};
        if (searchQuery) params.query = searchQuery;
        const url = PaginationHelper.buildUrl('/api/customers', params, customerPagination);
        const resp = await fetch(url);
        const result = await resp.json();

        if (result.success && result.data) {
            customers = result.data;
            customerPagination = { ...customerPagination, ...result.pagination };
        } else { customers = Array.isArray(result) ? result : []; }

        renderCustomers();
        if (paginationDiv && result.pagination) {
            paginationDiv.innerHTML = PaginationHelper.render(result.pagination, 'loadProducts');
        } else if (paginationDiv) { paginationDiv.innerHTML = ''; }
    } catch (e) { console.error('加载客户失败:', e); }
}

function renderCustomers() {
    const tbody = document.getElementById('customersTable');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML = '';
    if (customers.length === 0) { emptyState.classList.remove('d-none'); return; }
    emptyState.classList.add('d-none');

    customers.forEach((c, i) => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + c.id + '</td><td>' + escapeHtml(c.name) + '</td><td>' + (escapeHtml(c.contact_person) || '-') + '</td><td>' + (escapeHtml(c.phone) || '-') + '</td><td>' + (escapeHtml(c.email) || '-') + '</td><td>' + (escapeHtml(c.address) || '-') + '</td><td><a href="customers.html?id=' + c.id + '" class="btn btn-sm btn-primary"><i class="bi bi-pencil"></i> 编辑</a> <button class="btn btn-sm btn-danger" onclick="deleteCustomer(' + c.id + ')"><i class="bi bi-trash"></i> 删除</button></td>';
        tbody.appendChild(row);
    });
}

function escapeHtml(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = String(s); return d.innerHTML; }

async function deleteCustomer(id) {
    if (!confirm('确定删除？')) return;
    await fetch('/api/customers/' + id, { method: 'DELETE' });
    loadProducts();
}

document.addEventListener('DOMContentLoaded', function() { renderSidebar('customer_list.html'); checkLogin(); });
