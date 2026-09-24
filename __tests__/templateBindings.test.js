/**
 * 模板绑定完整性回归测试
 *
 * 背景：提交 ac9f4b1 删除 src/utils/config.js 时，LoginView.vue 与 AppLayout.vue
 * 的模板里仍残留 {{ config.companyName }}。Vue 的渲染代理对未声明的标识符返回
 * undefined，取属性即抛 TypeError，整个页面渲染失败——这类「重构删了模块、
 * 模板引用没跟着改」的缺陷不会让构建失败，只在运行时炸，所以需要静态兜住。
 *
 * 做法：扫描所有 .vue 文件，收集「模板表达式中被当作对象取属性的根标识符」
 * （如 config.companyName 里的 config），逐个确认它在 <script setup> 里有声明：
 * import / const / let / var / function / class / 解构 / v-for 别名 / slot prop。
 * 不在声明集合、也不在 JS/Vue 内置白名单里的，即判定为失效引用。
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');

// 模板中被引用的根标识符：只取成员访问链的根（a.b.c 取 a），
// 前置负向断言排除标识符/点/美元符，避免把 $slots.footer 截成 slots、
// 或把 a.b.c 的中间段 b 也当成根。
const ROOT_IDENTIFIER_RE = /(?<![\w$.])([A-Za-z_$][\w$]*)\s*\./g;

// 字符串字面量（含模板串）——扫描前先剔除，否则 'https://beian.miit.gov.cn/'
// 里的 beian/miit/gov 会被误判为标识符
const STRING_LITERAL_RE = /'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g;

// 模板中承载 JS 表达式的位置：插值 + 绑定属性
const MUSTACHE_RE = /\{\{([\s\S]*?)\}\}/g;
const BOUND_ATTR_RE = /(?::[\w.:-]+|v-[\w:.-]+|@[\w.:-]+)\s*=\s*"([^"]*)"/g;

// 模板中的局部作用域声明
const V_FOR_RE = /\bv-for\s*=\s*"([^"]*)"/g;
const SLOT_PROP_RE = /(?:\bv-slot(?::[\w-]+)?|#[\w-]+)\s*=\s*"([^"]*)"/g;

// <script setup> 中的声明
const IMPORT_DEFAULT_RE = /\bimport\s+([A-Za-z_$][\w$]*)\s*(?:,|from)/g;
const IMPORT_NAMESPACE_RE = /\bimport\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g;
const IMPORT_NAMED_RE = /\bimport\s*\{([^}]*)\}/g;
const DECLARE_RE = /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g;
const DESTRUCT_OBJ_RE = /\b(?:const|let|var)\s*\{([^}]*)\}/g;
const DESTRUCT_ARR_RE = /\b(?:const|let|var)\s*\[([^\]]*)\]/g;

// JS / 浏览器 / Vue 模板内置，模板里可直接使用
const GLOBALS = new Set([
    '$route', '$router', '$store', '$t', '$attrs', '$slots', '$refs', '$emit', '$props', '$event',
    'Math', 'JSON', 'Date', 'Number', 'String', 'Boolean', 'Array', 'Object', 'RegExp',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'Infinity', 'NaN',
    'console', 'window', 'document', 'navigator', 'location', 'history', 'screen', 'performance',
    'localStorage', 'sessionStorage', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'requestAnimationFrame', 'fetch', 'URL', 'URLSearchParams', 'Blob', 'File', 'FileReader',
    'FormData', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Error', 'Symbol', 'BigInt', 'Intl',
    'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI',
    'alert', 'confirm', 'prompt', 'crypto', 'structuredClone', 'atob', 'btoa'
]);

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (entry.name.endsWith('.vue')) out.push(full);
    }
    return out;
}

function extractBlocks(source) {
    const grab = (re) => {
        const out = [];
        let m;
        while ((m = re.exec(source)) !== null) out.push(m[1]);
        return out;
    };
    return {
        template: grab(/<template>([\s\S]*?)<\/template>/g).join('\n'),
        script: grab(/<script[^>]*>([\s\S]*?)<\/script>/g).join('\n')
    };
}

/** 收集 <script> 中声明的所有标识符 */
function collectDeclarations(script) {
    const names = new Set();
    const add = (n) => {
        const clean = String(n).trim().split(/[:=]/)[0].trim().replace(/^\.\.\./, '');
        if (/^[A-Za-z_$][\w$]*$/.test(clean)) names.add(clean);
    };

    let m;
    IMPORT_DEFAULT_RE.lastIndex = 0;
    while ((m = IMPORT_DEFAULT_RE.exec(script)) !== null) add(m[1]);

    IMPORT_NAMESPACE_RE.lastIndex = 0;
    while ((m = IMPORT_NAMESPACE_RE.exec(script)) !== null) add(m[1]);

    IMPORT_NAMED_RE.lastIndex = 0;
    while ((m = IMPORT_NAMED_RE.exec(script)) !== null) {
        m[1].split(',').forEach((part) => {
            const seg = part.trim();
            const alias = seg.includes(' as ') ? seg.split(' as ').pop() : seg;
            add(alias.replace(/^type\s+/, ''));
        });
    }

    DECLARE_RE.lastIndex = 0;
    while ((m = DECLARE_RE.exec(script)) !== null) add(m[1]);

    DESTRUCT_OBJ_RE.lastIndex = 0;
    while ((m = DESTRUCT_OBJ_RE.exec(script)) !== null) {
        m[1].split(',').forEach((part) => {
            const seg = part.trim();
            if (!seg) return;
            const alias = seg.includes(':') ? seg.split(':').pop() : seg;
            add(alias.trim().split('=')[0]);
        });
    }

    DESTRUCT_ARR_RE.lastIndex = 0;
    while ((m = DESTRUCT_ARR_RE.exec(script)) !== null) {
        m[1].split(',').forEach((part) => add(part.trim().split('=')[0]));
    }

    return names;
}

/** 收集模板局部作用域（v-for 别名、slot props） */
function collectTemplateScope(template) {
    const names = new Set();
    let m;

    V_FOR_RE.lastIndex = 0;
    while ((m = V_FOR_RE.exec(template)) !== null) {
        const expr = m[1];
        const inIdx = expr.search(/\s+in\s+|\s+of\s+/);
        if (inIdx === -1) continue;
        expr
            .slice(0, inIdx)
            .replace(/[(){}[\]]/g, ' ')
            .split(',')
            .forEach((part) => {
                const seg = part.trim().split(':').pop();
                if (/^[A-Za-z_$][\w$]*$/.test(seg)) names.add(seg);
            });
    }

    SLOT_PROP_RE.lastIndex = 0;
    while ((m = SLOT_PROP_RE.exec(template)) !== null) {
        m[1]
            .replace(/[{}]/g, ',')
            .split(',')
            .forEach((part) => {
                const seg = part.trim().split(':').pop().trim().split('=')[0].trim();
                if (/^[A-Za-z_$][\w$]*$/.test(seg)) names.add(seg);
            });
    }

    return names;
}

/** 收集模板表达式中被取属性的根标识符 */
function collectTemplateRoots(template) {
    const roots = new Map(); // name -> 首次出现的片段（便于报错定位）
    const scan = (expression, raw) => {
        const cleaned = expression.replace(STRING_LITERAL_RE, '""');
        ROOT_IDENTIFIER_RE.lastIndex = 0;
        let m;
        while ((m = ROOT_IDENTIFIER_RE.exec(cleaned)) !== null) {
            const name = m[1];
            if (!roots.has(name)) {
                roots.set(name, String(raw || expression).trim().slice(0, 80));
            }
        }
    };

    let m;
    MUSTACHE_RE.lastIndex = 0;
    while ((m = MUSTACHE_RE.exec(template)) !== null) scan(m[1], m[0]);

    BOUND_ATTR_RE.lastIndex = 0;
    while ((m = BOUND_ATTR_RE.exec(template)) !== null) scan(m[1], m[0]);

    return roots;
}

describe('Vue 模板绑定完整性', () => {
    const files = walk(SRC_DIR);

    test('至少扫描到若干 .vue 文件（防止路径写错导致空跑）', () => {
        expect(files.length).toBeGreaterThan(10);
    });

    test('模板中引用的根标识符都必须在 script 中声明', () => {
        const problems = [];

        for (const file of files) {
            const source = fs.readFileSync(file, 'utf8');
            const { template, script } = extractBlocks(source);
            if (!template) continue;

            const declared = collectDeclarations(script);
            const scoped = collectTemplateScope(template);
            const roots = collectTemplateRoots(template);
            const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');

            for (const [name, snippet] of roots) {
                if (declared.has(name) || scoped.has(name) || GLOBALS.has(name)) continue;
                problems.push(`  ${rel}: 未声明的标识符 "${name}" —— 出处: ${snippet}`);
            }
        }

        expect(problems.join('\n')).toBe(''); // 失败时打印全部问题
    });
});
