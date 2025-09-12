const express = require('express');
const router = express.Router();
const Package = require('../models/Package');

// Get all packages
router.get('/', async (req, res) => {
  try {
    const { isActive } = req.query;
    
    const filter = {};
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const packages = await Package.find(filter).sort({ packageType: 1, price: 1 });

    res.status(200).json({
      status: 200,
      message: 'Packages fetched successfully',
      data: packages
    });
  } catch (error) {
    console.error('Get packages error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to fetch packages',
      error: error.message
    });
  }
});

// Get package by ID
router.get('/:id', async (req, res) => {
  try {
    const package = await Package.findById(req.params.id);
    
    if (!package) {
      return res.status(404).json({
        status: 404,
        message: 'Package not found'
      });
    }

    res.status(200).json({
      status: 200,
      message: 'Package fetched successfully',
      data: package
    });
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to fetch package',
      error: error.message
    });
  }
});

// Create new package
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      features,
      packageType,
      isBestValue
    } = req.body;

    // Validation
    if (!name || !description || price === undefined || !duration || !features) {
      return res.status(400).json({
        status: 400,
        message: 'Name, description, price, duration, and features are required'
      });
    }

    if (!Array.isArray(features) || features.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'Features must be a non-empty array'
      });
    }

    // Validate features structure
    for (const feature of features) {
      if (!feature.name || !feature.description) {
        return res.status(400).json({
          status: 400,
          message: 'Each feature must have name and description'
        });
      }
    }

    const newPackage = new Package({
      name,
      description,
      price,
      duration,
      features,
      packageType: packageType || 'basic',
      isBestValue: isBestValue || false
    });

    const savedPackage = await newPackage.save();

    res.status(200).json({
      status: 200,
      message: 'Package created successfully',
      data: savedPackage
    });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to create package',
      error: error.message
    });
  }
});

// Update package
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      duration,
      features,
      packageType,
      isBestValue,
      isActive
    } = req.body;

    const package = await Package.findById(req.params.id);
    
    if (!package) {
      return res.status(404).json({
        status: 404,
        message: 'Package not found'
      });
    }

    // Validate features if provided
    if (features) {
      if (!Array.isArray(features) || features.length === 0) {
        return res.status(400).json({
          status: 400,
          message: 'Features must be a non-empty array'
        });
      }

      for (const feature of features) {
        if (!feature.name || !feature.description) {
          return res.status(400).json({
            status: 400,
            message: 'Each feature must have name and description'
          });
        }
      }
    }

    // Update fields
    if (name !== undefined) package.name = name;
    if (description !== undefined) package.description = description;
    if (price !== undefined) package.price = price;
    if (duration !== undefined) package.duration = duration;
    if (features !== undefined) package.features = features;
    if (packageType !== undefined) package.packageType = packageType;
    if (isBestValue !== undefined) package.isBestValue = isBestValue;
    if (isActive !== undefined) package.isActive = isActive;

    const updatedPackage = await package.save();

    res.status(200).json({
      status: 200,
      message: 'Package updated successfully',
      data: updatedPackage
    });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to update package',
      error: error.message
    });
  }
});

// Delete package (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const package = await Package.findById(req.params.id);
    
    if (!package) {
      return res.status(404).json({
        status: 404,
        message: 'Package not found'
      });
    }

    package.isActive = false;
    await package.save();

    res.status(200).json({
      status: 200,
      message: 'Package deleted successfully'
    });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({
      status: 500,
      message: 'Failed to delete package',
      error: error.message
    });
  }
});

module.exports = router;
