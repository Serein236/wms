// 客户管理 - 使用 suppliers 表作为客户数据源
let customers = [];
let customerModal = null;
let customerPagination = PaginationHelper.getDefaultState();
let searchTimeout = null;

async function checkLogin() {
    try {
        const resp = await fetch('/api/auth/current-user');
        const data = await resp.json();
        if (!data.loggedIn) { window.location.href = 'login.html'; return; }
        document.getElementById('currentUser').textContent = '欢迎, ' + data.username;
        customerModal = new bootstrap.Modal(document.getElementById('customerModal'));
        loadCustomers();
    } catch (e) { window.location.href = 'login.html'; }
}

function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => { customerPagination.page = 1; loadCustomers(); }, 300);
}

async function loadCustomers(page) {
    const paginationDiv = document.getElementById('paginationControls');
    const searchQuery = document.getElementById('searchInput').value.trim();
    if (page) customerPagination.page = page;

    try {
        const params = {};
        if (searchQuery) params.query = searchQuery;
        const url = PaginationHelper.buildUrl('/api/customers', params, customerPagination);
        const response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const result = await response.json();

        if (result.success && result.data) {
            customers = result.data;
            customerPagination = { ...customerPagination, ...result.pagination };
        } else {
            customers = Array.isArray(result) ? result : [];
        }

        renderCustomers();
        if (paginationDiv && result.pagination) {
            paginationDiv.innerHTML = PaginationHelper.render(result.pagination, 'loadCustomers');
        } else if (paginationDiv) {
            paginationDiv.innerHTML = '';
        }

        const badge = document.getElementById('customerCountBadge');
        if (badge) badge.textContent = result.pagination ? result.pagination.total : customers.length;
    } catch (error) { console.error('加载客户失败:', error); }
}

function renderCustomers() {
    const tbody = document.getElementById('customerTable');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML = '';
    if (customers.length === 0) { emptyState.classList.remove('d-none'); return; }
    emptyState.classList.add('d-none');

    customers.forEach((customer, index) => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + ((customerPagination.page - 1) * customerPagination.pageSize + index + 1) + '</td>' +
            '<td>' + escapeHtml(customer.name) + '</td>' +
            '<td>' + (escapeHtml(customer.contact_person) || '-') + '</td>' +
            '<td>' + (escapeHtml(customer.phone) || '-') + '</td>' +
            '<td>' + (escapeHtml(customer.email) || '-') + '</td>' +
            '<td>' + (escapeHtml(customer.address) || '-') + '</td>' +
            '<td><span class="badge ' + (customer.is_active ? 'bg-success' : 'bg-secondary') + '">' + (customer.is_active ? '启用' : '禁用') + '</span></td>' +
            '<td><button class="btn btn-sm btn-primary" onclick="editCustomer(' + customer.id + ')"><i class="bi bi-pencil"></i> 编辑</button> ' +
            '<button class="btn btn-sm btn-danger" onclick="deleteCustomer(' + customer.id + ')"><i class="bi bi-trash"></i> 删除</button></td>';
        tbody.appendChild(row);
    });
}

function showAddModal() {
    document.getElementById('customerModalTitle').textContent = '新增客户';
    document.getElementById('customerId').value = '';
    document.getElementById('customerName').value = '';
    document.getElementById('customerContact').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerEmail').value = '';
    document.getElementById('customerAddress').value = '';
    document.getElementById('customerRemark').value = '';
    customerModal.show();
}

function editCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    document.getElementById('customerModalTitle').textContent = '编辑客户';
    document.getElementById('customerId').value = customer.id;
    document.getElementById('customerName').value = customer.name || '';
    document.getElementById('customerContact').value = customer.contact_person || '';
    document.getElementById('customerPhone').value = customer.phone || '';
    document.getElementById('customerEmail').value = customer.email || '';
    document.getElementById('customerAddress').value = customer.address || '';
    document.getElementById('customerRemark').value = customer.remark || '';
    customerModal.show();
}

async function saveCustomer() {
    const id = document.getElementById('customerId').value;
    const name = document.getElementById('customerName').value.trim();
    if (!name) { alert('客户名称不能为空'); return; }

    const data = {
        name: name,
        contact_person: document.getElementById('customerContact').value.trim() || null,
        phone: document.getElementById('customerPhone').value.trim() || null,
        email: document.getElementById('customerEmail').value.trim() || null,
        address: document.getElementById('customerAddress').value.trim() || null,
        remark: document.getElementById('customerRemark').value.trim() || null
    };

    try {
        const url = id ? '/api/customers/' + id : '/api/customers';
        const method = id ? 'PUT' : 'POST';
        const resp = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const result = await resp.json();
        if (result.success) { customerModal.hide(); alert(id ? '更新成功' : '创建成功'); loadCustomers(); }
        else { alert(result.message || '操作失败'); }
    } catch (e) { alert('保存失败: ' + e.message); }
}

async function deleteCustomer(id) {
    if (!confirm('确定要删除该客户吗？')) return;
    try {
        const resp = await fetch('/api/customers/' + id, { method: 'DELETE' });
        const result = await resp.json();
        if (result.success) { alert('删除成功'); loadCustomers(); }
        else { alert(result.message || '删除失败'); }
    } catch (e) { alert('删除失败'); }
}

async function logout() { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = 'login.html'; }
document.addEventListener('DOMContentLoaded', function() { renderSidebar('customers.html'); checkLogin(); });
