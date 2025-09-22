const express = require('express');
const router = express.Router();

const PrimaryMediums = require('../models/PrimaryMediums');
const SkillsAndTechniques = require('../models/SkillsAndTechniques');
const ToolsAndSoftware = require('../models/ToolsAndSoftware');

// Helper to build filter from query
function buildFilter(query) {
  const { q, active, category } = query;
  const filter = {};
  if (q) filter.name = { $regex: String(q).trim().toLowerCase(), $options: 'i' };
  if (active === 'true') filter.isActive = true;
  if (active === 'false') filter.isActive = false;
  if (category) filter.category = { $regex: String(category).trim(), $options: 'i' };
  return filter;
}

// Helper to group by category into { [category]: [{ id, name }] }
function groupByCategory(items) {
  const grouped = {};
  items.forEach(item => {
    const cat = item.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push({ id: item._id, name: item.name });
  });
  return grouped;
}

// GET /api/creative-attributes
// Returns combined response of PrimaryMediums, SkillsAndTechniques, and ToolsAndSoftware
router.get('/', async (req, res) => {
  try {
    const filter = buildFilter(req.query);

    const [primaryList, skillsList, toolsList] = await Promise.all([
      PrimaryMediums.find(filter).sort({ category: 1, name: 1 }),
      SkillsAndTechniques.find(filter).sort({ category: 1, name: 1 }),
      ToolsAndSoftware.find(filter).sort({ category: 1, name: 1 }),
    ]);

    const data = {
      primaryMediums: groupByCategory(primaryList),
      skillsAndTechniques: groupByCategory(skillsList),
      toolsAndSoftware: groupByCategory(toolsList),
    };

    res.status(200).json({ status: 200, message: 'Creative attributes fetched', data });
  } catch (error) {
    res.status(500).json({ status: 500, message: 'Server error', data: error.message || error });
  }
});

module.exports = router;
