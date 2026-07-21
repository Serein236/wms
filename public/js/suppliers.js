function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

let suppliers = [];
let supplierModal = null;
let supplierPagination = PaginationHelper.getDefaultState();
let searchTimeout = null;

async function checkLogin() {
    try {
        const response = await fetch('/api/auth/current-user');
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
        const data = await response.json();
        if (!data.loggedIn) {
            window.location.href = 'login.html';
        } else {
            var el = document.getElementById('currentUser');
            if (el) el.textContent = `欢迎, ${data.username}`;
            supplierModal = new bootstrap.Modal(document.getElementById('supplierModal'));
            loadSuppliers();
        }
    } catch (error) { console.error(error); }
}

function debounceSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        supplierPagination.page = 1;
        loadSuppliers();
    }, 300);
}

async function loadSuppliers(page) {
    const paginationDiv = document.getElementById('paginationControls');
    const searchQuery = document.getElementById('searchInput').value.trim();

    if (page) supplierPagination.page = page;

    try {
        const params = {};
        if (searchQuery) params.query = searchQuery;
        const url = PaginationHelper.buildUrl('/api/suppliers', params, supplierPagination);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
        const result = await response.json();

        if (result.success && result.data) {
            suppliers = result.data;
            supplierPagination = { ...supplierPagination, ...result.pagination };
        } else {
            suppliers = Array.isArray(result) ? result : [];
        }

        renderSuppliers();

        if (paginationDiv && result.pagination) {
            paginationDiv.innerHTML = PaginationHelper.render(result.pagination, 'loadSuppliers');
        } else if (paginationDiv) {
            paginationDiv.innerHTML = '';
        }

        const badge = document.getElementById('supplierCountBadge');
        if (badge) badge.textContent = result.pagination ? result.pagination.total : suppliers.length;
    } catch (error) {
        console.error('加载供应商失败:', error);
    }
}

function renderSuppliers() {
    const tbody = document.getElementById('supplierTable');
    const emptyState = document.getElementById('emptyState');
    tbody.innerHTML = '';

    if (suppliers.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }
    emptyState.classList.add('d-none');

    suppliers.forEach((supplier, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${(supplierPagination.page - 1) * supplierPagination.pageSize + index + 1}</td>
            <td>${escapeHtml(supplier.name)}</td>
            <td>${escapeHtml(supplier.contact_person) || '-'}</td>
            <td>${escapeHtml(supplier.phone) || '-'}</td>
            <td>${escapeHtml(supplier.email) || '-'}</td>
            <td>${escapeHtml(supplier.address) || '-'}</td>
            <td>
                <span class="badge ${supplier.is_active ? 'bg-success' : 'bg-secondary'}">
                    ${supplier.is_active ? '启用' : '禁用'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary btn-action" onclick="editSupplier(${supplier.id})">
                    <i class="bi bi-pencil"></i> 编辑
                </button>
                <button class="btn btn-sm ${supplier.is_active ? 'btn-warning' : 'btn-success'} btn-action" onclick="toggleSupplier(${supplier.id})">
                    <i class="bi ${supplier.is_active ? 'bi-pause-circle' : 'bi-play-circle'}"></i> ${supplier.is_active ? '禁用' : '启用'}
                </button>
                <button class="btn btn-sm btn-danger btn-action" onclick="deleteSupplier(${supplier.id})">
                    <i class="bi bi-trash"></i> 删除
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function showAddModal() {
    document.getElementById('supplierModalTitle').textContent = '新增供应商';
    document.getElementById('supplierId').value = '';
    document.getElementById('supplierName').value = '';
    document.getElementById('supplierContact').value = '';
    document.getElementById('supplierPhone').value = '';
    document.getElementById('supplierEmail').value = '';
    document.getElementById('supplierAddress').value = '';
    document.getElementById('supplierRemark').value = '';
    supplierModal.show();
}

function editSupplier(id) {
    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) return;

    document.getElementById('supplierModalTitle').textContent = '编辑供应商';
    document.getElementById('supplierId').value = supplier.id;
    document.getElementById('supplierName').value = supplier.name || '';
    document.getElementById('supplierContact').value = supplier.contact_person || '';
    document.getElementById('supplierPhone').value = supplier.phone || '';
    document.getElementById('supplierEmail').value = supplier.email || '';
    document.getElementById('supplierAddress').value = supplier.address || '';
    document.getElementById('supplierRemark').value = supplier.remark || '';
    supplierModal.show();
}

async function saveSupplier() {
    const id = document.getElementById('supplierId').value;
    const name = document.getElementById('supplierName').value.trim();
    if (!name) {
        alert('供应商名称不能为空');
        return;
    }

    const data = {
        name,
        contact_person: document.getElementById('supplierContact').value.trim() || null,
        phone: document.getElementById('supplierPhone').value.trim() || null,
        email: document.getElementById('supplierEmail').value.trim() || null,
        address: document.getElementById('supplierAddress').value.trim() || null,
        remark: document.getElementById('supplierRemark').value.trim() || null
    };

    try {
        const url = id ? `/api/suppliers/${id}` : '/api/suppliers';
        const method = id ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const err = await response.json();
            alert(err.message || '操作失败');
            return;
        }
        const result = await response.json();
        if (result.success) {
            supplierModal.hide();
            alert(id ? '更新成功' : '创建成功');
            loadSuppliers();
        } else {
            alert(result.message || '操作失败');
        }
    } catch (error) {
        console.error('保存供应商失败:', error);
        alert('保存供应商失败');
    }
}

async function deleteSupplier(id) {
    if (!confirm('确定要删除该供应商吗？')) return;
    try {
        const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
        const result = await response.json();
        if (result.success) {
            alert('删除成功');
            loadSuppliers();
        } else {
            alert(result.message || '删除失败');
        }
    } catch (error) {
        console.error('删除供应商失败:', error);
        alert('删除供应商失败');
    }
}

async function toggleSupplier(id) {
    try {
        const response = await fetch(`/api/suppliers/${id}/toggle`, { method: 'POST' });
        if (!response.ok) throw new Error(`HTTP错误: ${response.status}`);
        const result = await response.json();
        if (result.success) {
            alert(result.message);
            loadSuppliers();
        } else {
            alert(result.message || '操作失败');
        }
    } catch (error) {
        console.error('切换供应商状态失败:', error);
        alert('操作失败');
    }
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = 'login.html';
    } catch (error) {
        console.error('退出登录失败:', error);
    }
}

document.addEventListener('DOMContentLoaded', checkLogin);
