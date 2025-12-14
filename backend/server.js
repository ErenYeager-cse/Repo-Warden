import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com'] // Replace with your production domain
    : ['http://localhost:3000'], // React dev server
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// GitHub PR routes
app.get('/api/prs/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { limit = 10 } = req.query;

    const headers = process.env.GITHUB_TOKEN
      ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
      : {};

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=open`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const prs = await response.json();

    // Sort by priority labels
    const priorities = { "🔴 Critical": 3, "🟡 High": 2, "🟢 Low": 1 };
    const ranked = prs.sort((a, b) => {
       const aPriority = a.labels.find(l => priorities[l.name])
         ? priorities[a.labels.find(l => priorities[l.name]).name] : 0;
       const bPriority = b.labels.find(l => priorities[l.name])
         ? priorities[b.labels.find(l => priorities[l.name]).name] : 0;
       return bPriority - aPriority;
    }).slice(0, parseInt(limit));

    res.json({
      success: true,
      data: ranked,
      total: prs.length,
      returned: ranked.length
    });
  } catch (error) {
    console.error('Error fetching PRs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Kestra workflow routes
app.get('/api/flows', async (req, res) => {
  try {
    const kestraApi = process.env.KESTRA_API_BASE || "http://localhost:8080/api/v1";
    const response = await fetch(`${kestraApi}/flows/search?q=*`);

    if (!response.ok) {
      throw new Error(`Kestra API error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      data: data.results || []
    });
  } catch (error) {
    console.error('Error fetching flows:', error);
    res.json({
      success: true,
      data: [] // Return empty array on error for graceful degradation
    });
  }
});

app.post('/api/flows/:namespace/:flowId/trigger', async (req, res) => {
  try {
    const { namespace, flowId } = req.params;
    const kestraApi = process.env.KESTRA_API_BASE || "http://localhost:8080/api/v1";

    const response = await fetch(`${kestraApi}/executions/${namespace}/${flowId}`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Kestra API error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      executionId: data.id,
      message: 'Flow triggered successfully'
    });
  } catch (error) {
    console.error('Error triggering flow:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/executions/:executionId', async (req, res) => {
  try {
    const { executionId } = req.params;
    const kestraApi = process.env.KESTRA_API_BASE || "http://localhost:8080/api/v1";

    const response = await fetch(`${kestraApi}/executions/${executionId}`);

    if (!response.ok) {
      throw new Error(`Kestra API error: ${response.status}`);
    }

    const data = await response.json();

    res.json({
      success: true,
      status: data.state?.current || 'unknown',
      data
    });
  } catch (error) {
    console.error('Error fetching execution status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Documentation analysis route
app.post('/api/analyze-diff', async (req, res) => {
  try {
    const { diff } = req.body;

    if (!diff) {
      return res.status(400).json({
        success: false,
        error: 'Diff content is required'
      });
    }

    // For now, return mock analysis
    // In production, this would call the Python Oumi script
    const analysis = `## 📘 Documentation Update (Auto-Generated)

**Reason:** Detected changes in \`${diff.substring(0, 20)}...\`

### New Features
- **Automatic Analysis:** The system now scans code changes.
- **Security Check:** Validates input sanitization.

*Generated by RepoWarden AI (Oumi-Powered)*`;

    res.json({
      success: true,
      analysis
    });
  } catch (error) {
    console.error('Error analyzing diff:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../frontend/build/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Something went wrong!'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 RepoWarden Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
