let selectedFile = null;

async function checkLogin() {
    try {
        const resp = await fetch('/api/auth/current-user');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        if (!data.loggedIn) {
            window.location.href = 'login.html';
        } else {
            document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
        }
    } catch (e) { console.error(e); }
}

const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFile(e.target.files[0]);
});

function handleFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
        alert('只支持 .xlsx, .xls, .csv 格式文件');
        return;
    }
    if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过 10MB');
        return;
    }
    selectedFile = file;
    document.getElementById('fileName').textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    document.getElementById('selectedFile').classList.remove('d-none');
    uploadZone.classList.add('d-none');
}

function clearFile() {
    selectedFile = null;
    fileInput.value = '';
    document.getElementById('selectedFile').classList.add('d-none');
    uploadZone.classList.remove('d-none');
    document.getElementById('importResult').classList.add('d-none');
}

async function startImport() {
    if (!selectedFile) return;

    const btn = document.getElementById('importBtn');
    const progress = document.getElementById('importProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split me-1"></i>导入中...';
    progress.classList.remove('d-none');
    progressBar.style.width = '30%';
    progressText.textContent = '正在上传并解析文件...';

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        progressBar.style.width = '60%';
        const resp = await fetch('/api/import/products', { method: 'POST', body: formData });
        const result = await resp.json();
        progressBar.style.width = '100%';

        if (result.success) {
            progressText.textContent = '导入完成！';
            showResult(result);
        } else {
            progressText.textContent = '导入失败: ' + (result.message || '未知错误');
            progressBar.classList.remove('bg-success');
            progressBar.classList.add('bg-danger');
        }
    } catch (e) {
        progressText.textContent = '导入失败: ' + e.message;
        progressBar.classList.add('bg-danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-arrow-up me-1"></i>开始导入';
    }
}

function showResult(result) {
    document.getElementById('resultTotal').textContent = result.total || 0;
    document.getElementById('resultImported').textContent = result.imported || 0;
    document.getElementById('resultSkipped').textContent = result.skipped || 0;
    document.getElementById('resultErrors').textContent = (result.errors || []).length;

    const errorList = document.getElementById('errorList');
    const errorItems = document.getElementById('errorItems');
    if (result.errors && result.errors.length) {
        errorItems.innerHTML = result.errors.map(e => `<li class="list-group-item text-danger">${escapeHtml(e)}</li>`).join('');
        errorList.classList.remove('d-none');
    } else {
        errorList.classList.add('d-none');
    }
    document.getElementById('importResult').classList.remove('d-none');
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
}

async function logout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = 'login.html';
    } catch (e) { console.error('退出失败:', e); }
}

document.addEventListener('DOMContentLoaded', checkLogin);
