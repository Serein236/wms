async function checkLogin() {
            try {
                const response = await fetch('/api/auth/current-user');
                if (!response.ok) {
                    throw new Error(`HTTP错误: ${response.status}`);
                }
                const data = await response.json();

                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                } else {
                    document.getElementById('currentUser').textContent = `欢迎, ${data.username}`;
                    loadDashboardData();
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
                window.location.href = 'login.html';
            }
        }

        async function loadDashboardData() {
            try {
                const productsRes = await fetch('/api/products');
                if (!productsRes.ok) {
                    throw new Error(`HTTP错误: ${productsRes.status}`);
                }
                const products = await productsRes.json();
                document.getElementById('totalProducts').textContent = products.length;

                const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
                document.getElementById('totalStock').textContent = totalStock;

                const today = new Date().toISOString().split('T')[0];
                const inRes = await fetch('/api/in-records');
                if (!inRes.ok) {
                    throw new Error(`HTTP错误: ${inRes.status}`);
                }
                const inRecords = await inRes.json();
                const todayIn = inRecords.filter(record => record.recorded_date === today)
                    .reduce((sum, record) => sum + record.quantity, 0);
                document.getElementById('todayIn').textContent = todayIn;

                const outRes = await fetch('/api/out-records');
                if (!outRes.ok) {
                    throw new Error(`HTTP错误: ${outRes.status}`);
                }
                const outRecords = await outRes.json();
                const todayOut = outRecords.filter(record => record.recorded_date === today)
                    .reduce((sum, record) => sum + record.quantity, 0);
                document.getElementById('todayOut').textContent = todayOut;
            } catch (error) {
                console.error('加载仪表盘数据失败:', error);
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