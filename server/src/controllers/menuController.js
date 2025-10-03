const menuService = require('../services/menuService');

class MenuController {
  async getMenu(req, res) {
    try {
      const { branchId = 1 } = req.query;
      const menu = await menuService.getMenu(branchId);
      
      res.json({
        success: true,
        data: menu
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async getMenuItem(req, res) {
    try {
      const { id } = req.params;
      const item = await menuService.getMenuItem(id);
      
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  }

  async createMenuItem(req, res) {
    try {
      const itemData = req.body;
      const item = await menuService.createMenuItem(itemData);
      
      res.status(201).json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateMenuItem(req, res) {
    try {
      const { id } = req.params;
      const itemData = req.body;
      const item = await menuService.updateMenuItem(id, itemData);
      
      res.json({
        success: true,
        data: item
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteMenuItem(req, res) {
    try {
      const { id } = req.params;
      await menuService.deleteMenuItem(id);
      
      res.json({
        success: true,
        message: 'Menu item deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async getCategories(req, res) {
    try {
      const { branchId = 1 } = req.query;
      const categories = await menuService.getCategories(branchId);
      
      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  async createCategory(req, res) {
    try {
      const categoryData = req.body;
      const category = await menuService.createCategory(categoryData);
      
      res.status(201).json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const categoryData = req.body;
      const category = await menuService.updateCategory(id, categoryData);
      
      res.json({
        success: true,
        data: category
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      await menuService.deleteCategory(id);
      
      res.json({
        success: true,
        message: 'Category deleted successfully'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = new MenuController();