import mongoose from 'mongoose';

const IssueSchema = new mongoose.Schema({
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  issueType: { type: mongoose.Schema.Types.ObjectId, ref: 'IssueType', required: true },
  count: { type: Number, default: 0 }
});

export default mongoose.model('Issue', IssueSchema);
