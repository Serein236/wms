const SupplierModel = require('../models/SupplierModel');
const { parsePagination, addPagination, buildPaginationResponse } = require('../utils/pagination');
const dbUtils = require('../utils/dbUtils');
const logger = require('../utils/logger');

const supplierController = {
    async list(req, res) {
        try {
            const { query, page, pageSize } = req.query;
            const pagination = parsePagination({ page, pageSize }, { defaultPageSize: 50 });

            let suppliers;
            let total;
            if (query && query.length >= 1) {
                suppliers = await SupplierModel.search(query);
                total = suppliers.length;
                suppliers = suppliers.slice(pagination.offset, pagination.offset + pagination.limit);
            } else {
                total = await SupplierModel.count();
                suppliers = await dbUtils.query(addPagination('SELECT * FROM suppliers ORDER BY name ASC', pagination));
            }

            res.json({ success: true, data: suppliers, pagination: buildPaginationResponse(total, pagination) });
        } catch (error) {
            console.error('获取供应商列表错误:', error);
            res.status(500).json({ success: false, message: '获取供应商列表失败' });
        }
    },

    async get(req, res) {
        try {
            const supplier = await SupplierModel.findById(req.params.id);
            if (!supplier) return res.status(404).json({ success: false, message: '供应商不存在' });
            res.json({ success: true, data: supplier });
        } catch (error) {
            console.error('获取供应商错误:', error);
            res.status(500).json({ success: false, message: '获取供应商失败' });
        }
    },

    async create(req, res) {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: '供应商名称不能为空' });
        try {
            const existing = await SupplierModel.findByName(name);
            if (existing) return res.status(400).json({ success: false, message: '供应商名称已存在' });

            const supplier = await SupplierModel.create(req.body);
            logger.info('创建供应商', { operator: req.session.username, operatorId: req.session.userId, target: name });
            res.json({ success: true, data: supplier });
        } catch (error) {
            console.error('创建供应商错误:', error);
            res.status(500).json({ success: false, message: '创建供应商失败' });
        }
    },

    async update(req, res) {
        try {
            const supplier = await SupplierModel.findById(req.params.id);
            if (!supplier) return res.status(404).json({ success: false, message: '供应商不存在' });

            if (req.body.name && req.body.name !== supplier.name) {
                const existing = await SupplierModel.findByName(req.body.name);
                if (existing) return res.status(400).json({ success: false, message: '供应商名称已存在' });
            }

            await SupplierModel.update(req.params.id, req.body);
            logger.info('更新供应商', { operator: req.session.username, operatorId: req.session.userId, target: supplier.name });
            res.json({ success: true, message: '更新成功' });
        } catch (error) {
            console.error('更新供应商错误:', error);
            res.status(500).json({ success: false, message: '更新供应商失败' });
        }
    },

    async delete(req, res) {
        try {
            const supplier = await SupplierModel.findById(req.params.id);
            if (!supplier) return res.status(404).json({ success: false, message: '供应商不存在' });

            await SupplierModel.delete(req.params.id);
            logger.info('删除供应商', { operator: req.session.username, operatorId: req.session.userId, target: supplier.name });
            res.json({ success: true, message: '删除成功' });
        } catch (error) {
            console.error('删除供应商错误:', error);
            res.status(500).json({ success: false, message: '删除供应商失败' });
        }
    },

    async toggleActive(req, res) {
        try {
            const newStatus = await SupplierModel.toggleActive(req.params.id);
            res.json({ success: true, message: newStatus ? '已启用' : '已禁用', isActive: newStatus });
        } catch (error) {
            console.error('切换供应商状态错误:', error);
            res.status(500).json({ success: false, message: '操作失败' });
        }
    }
};

module.exports = supplierController;
