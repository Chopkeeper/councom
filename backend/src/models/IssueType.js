import mongoose from 'mongoose';

const IssueTypeSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

export default mongoose.model('IssueType', IssueTypeSchema);
