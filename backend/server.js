import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import departmentRoutes from './src/routes/departmentRoutes.js';
import issueTypeRoutes from './src/routes/issueTypeRoutes.js';
import issueRoutes from './src/routes/issueRoutes.js';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/departments', departmentRoutes);
app.use('/api/issue-types', issueTypeRoutes);
app.use('/api/issues', issueRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK' }));

// MongoDB connection
const PORT = process.env.PORT || 4000;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
