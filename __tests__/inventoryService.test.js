/**
 * InventoryService 关键业务规则单元测试（mock 数据层，不依赖 MySQL）
 * 覆盖本次修复的 P1/P2 项：
 *  - P1-2 禁止修改批次号/商品
 *  - P2-7 数量必须为正整数
 *  - 合计金额联动：改数量/单价未显式传 total_amount 时按 数量×单价 重算
 */

jest.mock('../utils/dbUtils', () => ({
    executeTransaction: jest.fn((fn) => fn({})),
    queryOne: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
    query: jest.fn()
}));
jest.mock('../models/InRecordModel', () => ({
    findById: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
}));
jest.mock('../models/OutRecordModel', () => ({
    findById: jest.fn(),
    update: jest.fn(),
    create: jest.fn(),
    delete: jest.fn()
}));
jest.mock('../models/StockModel', () => ({
    findByProductId: jest.fn(),
    updateStock: jest.fn()
}));
jest.mock('../models/ProductModel', () => ({}));
jest.mock('../services/BackupService', () => ({}));
jest.mock('../services/SettingsService', () => ({}));

const dbUtils = require('../utils/dbUtils');
const InRecordModel = require('../models/InRecordModel');
const OutRecordModel = require('../models/OutRecordModel');
const StockModel = require('../models/StockModel');
const InventoryService = require('../services/InventoryService');

const originalIn = { id: 1, product_id: 5, batch_number: 'B1', quantity: 10, unit_price: 7 };
const originalOut = { id: 2, product_id: 5, batch_number: 'B1', quantity: 4, unit_price: 77 };

beforeEach(() => {
    jest.clearAllMocks();
    InRecordModel.findById.mockResolvedValue({ ...originalIn });
    OutRecordModel.findById.mockResolvedValue({ ...originalOut });
    dbUtils.queryOne.mockResolvedValue({ id: 9, batch_current_stock: 50 });
    StockModel.findByProductId.mockResolvedValue({ current_stock: 100 });
});

describe('updateInStock 批次/商品不可变（P1-2）', () => {
    test('修改批次号应被拒绝', async () => {
        await expect(
            InventoryService.updateInStock(1, { quantity: 10, batch_number: 'B2' })
        ).rejects.toThrow('不允许修改批次号');
        expect(InRecordModel.update).not.toHaveBeenCalled();
    });

    test('修改商品应被拒绝', async () => {
        await expect(
            InventoryService.updateInStock(1, { quantity: 10, product_id: 6 })
        ).rejects.toThrow('不允许修改商品');
        expect(InRecordModel.update).not.toHaveBeenCalled();
    });

    test('批次号与商品原样提交应放行', async () => {
        const result = await InventoryService.updateInStock(1, {
            quantity: 12, batch_number: 'B1', product_id: 5
        });
        expect(result.success).toBe(true);
        expect(InRecordModel.update).toHaveBeenCalled();
    });
});

describe('updateInStock 数量校验（P2-7）', () => {
    test.each([0, -5, 3.9, 'abc'])('非法数量 %p 应被拒绝', async (q) => {
        await expect(
            InventoryService.updateInStock(1, { quantity: q })
        ).rejects.toThrow('数量必须为正整数');
    });
});

describe('合计金额联动（改数量/单价自动重算 total_amount）', () => {
    test('改数量未传 total_amount 时按 数量×原单价 重算', async () => {
        await InventoryService.updateInStock(1, { quantity: 12 });
        const data = InRecordModel.update.mock.calls[0][1];
        expect(data.total_amount).toBe(84); // 12 × 7
    });

    test('改单价未传 total_amount 时按 原数量×单价 重算', async () => {
        await InventoryService.updateInStock(1, { quantity: 10, unit_price: 8.5 });
        const data = InRecordModel.update.mock.calls[0][1];
        expect(data.total_amount).toBe(85); // 10 × 8.5
    });

    test('显式传入 total_amount 时尊重调用方', async () => {
        await InventoryService.updateInStock(1, { quantity: 10, total_amount: 66.6 });
        const data = InRecordModel.update.mock.calls[0][1];
        expect(data.total_amount).toBe(66.6);
    });

    test('出库记录改单价同样重算（用户反馈场景）', async () => {
        await InventoryService.updateOutStock(2, { quantity: 1, unit_price: 77 });
        const data = OutRecordModel.update.mock.calls[0][1];
        expect(data.total_amount).toBe(77); // 1 × 77，不再是历史残留 207
    });
});

describe('updateOutStock 批次/商品不可变（P1-2）', () => {
    test('修改批次号应被拒绝', async () => {
        await expect(
            InventoryService.updateOutStock(2, { quantity: 4, batch_number: 'B9' })
        ).rejects.toThrow('不允许修改批次号');
        expect(OutRecordModel.update).not.toHaveBeenCalled();
    });
});

describe('inStock/outStock 外部事务连接复用（P1-3 盘点原子性）', () => {
    test('传入外部 connection 时不再自建事务', async () => {
        InRecordModel.create.mockResolvedValue({ id: 99 });
        const fakeConn = { name: 'external-conn' };
        await InventoryService.inStock(
            { product_id: 5, batch_number: 'B1', quantity: 3, production_date: '2026-09-24', expiration_date: '9999-12-31' },
            fakeConn
        );
        expect(dbUtils.executeTransaction).not.toHaveBeenCalled();
        expect(InRecordModel.create).toHaveBeenCalledWith(expect.anything(), fakeConn);
    });

    test('不传 connection 时维持自建事务', async () => {
        InRecordModel.create.mockResolvedValue({ id: 100 });
        await InventoryService.inStock(
            { product_id: 5, batch_number: 'B1', quantity: 3, production_date: '2026-09-24', expiration_date: '9999-12-31' }
        );
        expect(dbUtils.executeTransaction).toHaveBeenCalled();
    });
});
