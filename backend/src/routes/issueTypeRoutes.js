import express from 'express';
import IssueType from '../models/IssueType.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const issueTypes = await IssueType.find();
  res.json(issueTypes);
});

router.post('/', async (req, res) => {
  const issueType = new IssueType(req.body);
  await issueType.save();
  res.json(issueType);
});

export default router;
