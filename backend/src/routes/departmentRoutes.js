import express from 'express';
import Department from '../models/Department.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const departments = await Department.find();
  res.json(departments);
});

router.post('/', async (req, res) => {
  const department = new Department(req.body);
  await department.save();
  res.json(department);
});

export default router;
