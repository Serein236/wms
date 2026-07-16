let stocktakings = [];
let currentStocktaking = null;
let editingItemId = null;
let createModal, editItemModal;

async function checkLogin() {
    try {
        const resp = await fetch('/api/auth/current-user');
        const data = await resp.json();
        if (!data.loggedIn) { window.location.href = 'login.html'; return; }
        document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
        createModal = new bootstrap.Modal(document.getElementById('createModal'));
        editItemModal = new bootstrap.Modal(document.getElementById('editItemModal'));
        loadStocktakings();
    } catch (e) { console.error(e); }
}

async function loadStocktakings() {
    try {
        const resp = await fetch('/api/stocktaking');
        const result = await resp.json();
        stocktakings = result.data || [];
        renderList();
    } catch (e) { console.error('加载盘点列表失败:', e); }
}

function renderList() {
    const tbody = document.getElementById('stocktakingList');
    const empty = document.getElementById('emptyState');
    if (!stocktakings.length) { tbody.innerHTML = ''; empty.classList.remove('d-none'); return; }
    empty.classList.add('d-none');

    const statusMap = { draft: ['secondary', '草稿'], in_progress: ['primary', '进行中'], completed: ['success', '已完成'], cancelled: ['danger', '已取消'] };
    tbody.innerHTML = stocktakings.map(s => {
        const [cls, label] = statusMap[s.status] || ['secondary', s.status];
        return `<tr>
            <td>${escapeHtml(s.name)}</td>
            <td><span class="badge bg-${cls}">${label}</span></td>
            <td>${formatDate(s.created_at)}</td>
            <td>${s.completed_at ? formatDate(s.completed_at) : '-'}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" onclick="viewDetail(${s.id})"><i class="bi bi-eye"></i></button>
            </td>
        </tr>`;
    }).join('');
}

async function viewDetail(id) {
    try {
        const resp = await fetch(`/api/stocktaking/${id}`);
        const result = await resp.json();
        currentStocktaking = result.data;
        document.getElementById('listView').classList.add('d-none');
        document.getElementById('detailView').classList.remove('d-none');
        document.getElementById('detailName').textContent = currentStocktaking.name;

        const statusMap = { draft: ['secondary', '草稿'], in_progress: ['primary', '进行中'], completed: ['success', '已完成'], cancelled: ['danger', '已取消'] };
        const [cls, label] = statusMap[currentStocktaking.status] || ['secondary', currentStocktaking.status];
        document.getElementById('detailStatus').className = `badge bg-${cls} ms-2`;
        document.getElementById('detailStatus').textContent = label;

        document.getElementById('btnStart').style.display = currentStocktaking.status === 'draft' ? '' : 'none';
        document.getElementById('btnComplete').style.display = currentStocktaking.status === 'in_progress' ? '' : 'none';
        document.getElementById('btnCancel').style.display = ['draft', 'in_progress'].includes(currentStocktaking.status) ? '' : 'none';

        renderItems();
    } catch (e) { console.error('加载盘点详情失败:', e); }
}

function renderItems() {
    const tbody = document.getElementById('detailItems');
    const items = currentStocktaking.items || [];
    const isInProgress = currentStocktaking.status === 'in_progress';

    tbody.innerHTML = items.map(item => {
        const diffClass = item.actual_stock === null ? 'text-muted' : (item.difference > 0 ? 'text-success' : item.difference < 0 ? 'text-danger' : 'text-primary');
        const diffText = item.actual_stock === null ? '-' : (item.difference > 0 ? `+${item.difference}` : item.difference);
        return `<tr>
            <td>${escapeHtml(item.product_name)}</td>
            <td>${escapeHtml(item.spec) || '-'}</td>
            <td>${escapeHtml(item.unit) || '-'}</td>
            <td>${item.system_stock}</td>
            <td>${item.actual_stock !== null ? item.actual_stock : '<span class="text-muted">未盘点</span>'}</td>
            <td class="${diffClass} fw-bold">${diffText}</td>
            <td>${escapeHtml(item.remark) || '-'}</td>
            <td>${isInProgress && item.actual_stock === null ? `<button class="btn btn-sm btn-outline-primary" onclick="editItem(${item.id}, '${escapeHtml(item.product_name)}', ${item.system_stock})"><i class="bi bi-pencil"></i></button>` : ''}</td>
        </tr>`;
    }).join('');
}

function showCreateModal() { createModal.show(); }

async function createStocktaking() {
    const name = document.getElementById('stocktakingName').value.trim();
    if (!name) { alert('请输入盘点名称'); return; }
    try {
        const resp = await fetch('/api/stocktaking', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        const result = await resp.json();
        if (result.success) {
            createModal.hide();
            document.getElementById('stocktakingName').value = '';
            loadStocktakings();
        } else { alert(result.message || '创建失败'); }
    } catch (e) { alert('创建失败: ' + e.message); }
}

async function startStocktaking() {
    if (!confirm('确定开始盘点？开始后将锁定盘点单。')) return;
    try {
        await fetch(`/api/stocktaking/${currentStocktaking.id}/start`, { method: 'POST' });
        viewDetail(currentStocktaking.id);
    } catch (e) { alert('操作失败'); }
}

async function completeStocktaking() {
    if (!confirm('确定完成盘点？系统将根据盘点结果自动调整库存。')) return;
    try {
        const resp = await fetch(`/api/stocktaking/${currentStocktaking.id}/complete`, { method: 'POST' });
        const result = await resp.json();
        if (result.success) {
            alert(`盘点完成！调整了 ${result.adjustedCount} 个商品的库存。`);
            viewDetail(currentStocktaking.id);
        } else { alert(result.message || '完成失败'); }
    } catch (e) { alert('操作失败: ' + e.message); }
}

async function cancelStocktaking() {
    if (!confirm('确定取消盘点？')) return;
    try {
        await fetch(`/api/stocktaking/${currentStocktaking.id}/cancel`, { method: 'POST' });
        viewDetail(currentStocktaking.id);
    } catch (e) { alert('操作失败'); }
}

function editItem(itemId, productName, systemStock) {
    editingItemId = itemId;
    document.getElementById('editItemName').textContent = productName;
    document.getElementById('editItemSystem').textContent = systemStock;
    document.getElementById('editItemActual').value = '';
    document.getElementById('editItemRemark').value = '';
    editItemModal.show();
}

async function saveItem() {
    const actual = document.getElementById('editItemActual').value;
    if (actual === '' || parseInt(actual) < 0) { alert('请输入有效的实际库存数量'); return; }
    try {
        await fetch(`/api/stocktaking/${currentStocktaking.id}/items/${editingItemId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actual_stock: parseInt(actual), remark: document.getElementById('editItemRemark').value.trim() })
        });
        editItemModal.hide();
        viewDetail(currentStocktaking.id);
    } catch (e) { alert('保存失败'); }
}

function showList() {
    document.getElementById('listView').classList.remove('d-none');
    document.getElementById('detailView').classList.add('d-none');
    loadStocktakings();
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('zh-CN');
}

function escapeHtml(str) {
    if (!str) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); window.location.href = 'login.html'; } catch (e) {}
}

document.addEventListener('DOMContentLoaded', checkLogin);
