import express from 'express';
import Issue from '../models/Issue.js';
const router = express.Router();

router.get('/', async (req, res) => {
  const issues = await Issue.find().populate('department issueType');
  res.json(issues);
});

router.post('/', async (req, res) => {
  const issue = new Issue(req.body);
  await issue.save();
  res.json(issue);
});

router.post('/:id/increment', async (req, res) => {
  const issue = await Issue.findById(req.params.id);
  issue.count += 1;
  await issue.save();
  res.json(issue);
});

export default router;
