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

    const packages = await Package.find(filter, {
      'durationVariants.features.icon': 0
    }).sort({ packageType: 1, price: 1 });

    // Add unique package_id to each package (package_1, package_2, etc.)
    const packagesWithId = packages.map((pkg, index) => {
      const packageObj = pkg.toObject();
      return {
        ...packageObj,
        package_id: `package_${index + 1}` // Sequential unique ID: package_1, package_2, etc.
      };
    });

    res.status(200).json({
      status: 200,
      message: 'Packages fetched successfully',
      data: packagesWithId
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
    const package = await Package.findById(req.params.id, {
      'durationVariants.features.icon': 0
    });
    
    if (!package) {
      return res.status(404).json({
        status: 404,
        message: 'Package not found'
      });
    }

    // Find package index in sorted list for package_id
    const allPackages = await Package.find({}).sort({ packageType: 1, price: 1 });
    const packageIndex = allPackages.findIndex(pkg => String(pkg._id) === String(package._id));
    
    // Add unique package_id to package (package_1, package_2, etc.)
    const packageObj = package.toObject();
    const packageWithId = {
      ...packageObj,
      package_id: packageIndex !== -1 ? `package_${packageIndex + 1}` : `package_unknown` // Sequential unique ID
    };

    res.status(200).json({
      status: 200,
      message: 'Package fetched successfully',
      data: packageWithId
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

// Create new package with custom duration variants
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      packageType,
      durationVariants
    } = req.body;

    // Validation
    if (!name || !description || !durationVariants) {
      return res.status(400).json({
        status: 400,
        message: 'Name, description, and durationVariants are required'
      });
    }

    if (!Array.isArray(durationVariants) || durationVariants.length === 0) {
      return res.status(400).json({
        status: 400,
        message: 'durationVariants must be a non-empty array'
      });
    }

    // Validate each duration variant
    for (const variant of durationVariants) {
      if (!variant.duration || !variant.price || !variant.features) {
        return res.status(400).json({
          status: 400,
          message: 'Each duration variant must have duration, price, and features'
        });
      }

      if (!Array.isArray(variant.features) || variant.features.length === 0) {
        return res.status(400).json({
          status: 400,
          message: 'Each duration variant must have a non-empty features array'
        });
      }

      // Validate features structure
      for (const feature of variant.features) {
        if (!feature.name || !feature.description) {
          return res.status(400).json({
            status: 400,
            message: 'Each feature must have name and description'
          });
        }
      }
    }

    const newPackage = new Package({
      name,
      description,
      packageType: packageType || 'basic',
      durationVariants
    });

    const savedPackage = await newPackage.save();

    // Find package index in sorted list for package_id
    const allPackages = await Package.find({}).sort({ packageType: 1, price: 1 });
    const packageIndex = allPackages.findIndex(pkg => String(pkg._id) === String(savedPackage._id));
    
    // Add unique package_id to saved package
    const packageObj = savedPackage.toObject();
    const packageWithId = {
      ...packageObj,
      package_id: packageIndex !== -1 ? `package_${packageIndex + 1}` : `package_${allPackages.length}`
    };

    res.status(200).json({
      status: 200,
      message: 'Package created successfully',
      data: packageWithId
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
      packageType,
      durationVariants,
      isActive
    } = req.body;

    const package = await Package.findById(req.params.id);
    
    if (!package) {
      return res.status(404).json({
        status: 404,
        message: 'Package not found'
      });
    }

    // Validate durationVariants if provided
    if (durationVariants) {
      if (!Array.isArray(durationVariants) || durationVariants.length === 0) {
        return res.status(400).json({
          status: 400,
          message: 'durationVariants must be a non-empty array'
        });
      }

      // Validate each duration variant
      for (const variant of durationVariants) {
        if (!variant.duration || !variant.price || !variant.features) {
          return res.status(400).json({
            status: 400,
            message: 'Each duration variant must have duration, price, and features'
          });
        }

        if (!Array.isArray(variant.features) || variant.features.length === 0) {
        return res.status(400).json({
            status: 400,
            message: 'Each duration variant must have a non-empty features array'
          });
        }

        // Validate features structure
        for (const feature of variant.features) {
          if (!feature.name || !feature.description) {
            return res.status(400).json({
              status: 400,
              message: 'Each feature must have name and description'
            });
          }
        }
      }
    }

    // Update fields
    if (name !== undefined) package.name = name;
    if (description !== undefined) package.description = description;
    if (packageType !== undefined) package.packageType = packageType;
    if (durationVariants !== undefined) package.durationVariants = durationVariants;
    if (isActive !== undefined) package.isActive = isActive;

    const updatedPackage = await package.save();

    // Fetch the updated package without icon fields
    const packageWithoutIcons = await Package.findById(updatedPackage._id, {
      'durationVariants.features.icon': 0
    });

    // Find package index in sorted list for package_id
    const allPackages = await Package.find({}).sort({ packageType: 1, price: 1 });
    const packageIndex = allPackages.findIndex(pkg => String(pkg._id) === String(updatedPackage._id));
    
    // Add unique package_id to updated package
    const packageObj = packageWithoutIcons.toObject();
    const packageWithId = {
      ...packageObj,
      package_id: packageIndex !== -1 ? `package_${packageIndex + 1}` : `package_unknown`
    };

    res.status(200).json({
      status: 200,
      message: 'Package updated successfully',
      data: packageWithId
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
