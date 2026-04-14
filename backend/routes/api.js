const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const ConsistencyChecker = require('../services/consistencyChecker');
const ReportGenerator = require('../services/reportGenerator');
const User = require('../models/User');
const Report = require('../models/Report');

// Constants
const VALID_COLLECTIONS = ['users'];
const DEFAULT_LIMIT = 20;

// Initialize services
const consistencyChecker = new ConsistencyChecker();
const reportGenerator = new ReportGenerator();

// Store for dynamic connections (in production, use Redis or database)
const connections = new Map();
const activeConnections = new Map();

/**
 * Utility: Standard success response
 */
const successResponse = (res, data, message = null) => {
  return res.json({
    success: true,
    data,
    message,
    timestamp: new Date()
  });
};

/**
 * Utility: Standard error response
 */
const errorResponse = (res, status, message) => {
  return res.status(status).json({
    success: false,
    message,
    timestamp: new Date()
  });
};

/**
 * POST /api/check
 * Trigger consistency check on user's connected database
 */
router.post('/check', async (req, res) => {
  try {
    const { collection = 'users', sessionId } = req.body;

    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required. Please connect to a database first.');
    }

    // Check if session has an active connection
    if (!activeConnections.has(sessionId)) {
      return errorResponse(res, 400, 'No active database connection. Please connect first.');
    }

    const connection = activeConnections.get(sessionId);
    const connInfo = connections.get(sessionId);

    // Validate collection against available collections in user's database
    const availableCollections = connInfo.collections || [];
    if (!availableCollections.includes(collection)) {
      return errorResponse(
        res,
        400,
        `Collection '${collection}' not found in connected database. Available: ${availableCollections.join(', ') || 'none'}`
      );
    }

    // Prevent concurrent execution
    if (consistencyChecker.isActive()) {
      return errorResponse(res, 409, 'Consistency check already in progress');
    }

    console.log(`[START] Consistency check → ${collection} (session: ${sessionId})`);

    // Create dynamic model from user's connection
    const dynamicModel = connection.model(
      collection,
      new mongoose.Schema({}, { strict: false }),
      collection
    );

    // Run check on user's database
    const report = await consistencyChecker.checkCollection(collection, dynamicModel);

    // Save report
    const savedReport = await reportGenerator.saveReport(report);

    // Format response
    const formattedReport =
      reportGenerator.formatReportForDisplay(savedReport);

    return successResponse(
      res,
      formattedReport,
      `Consistency check completed for ${collection}`
    );

  } catch (error) {
    console.error('[ERROR] /check:', error);
    return errorResponse(res, 500, error.message || 'Internal Server Error');
  }
});

/**
 * GET /api/report/latest
 */
router.get('/report/latest', async (req, res) => {
  try {
    const { collection } = req.query;

    const report = await reportGenerator.getLatestReport(collection);

    if (!report) {
      return errorResponse(res, 404, 'No reports found');
    }

    const formattedReport =
      reportGenerator.formatReportForDisplay(report);

    return successResponse(res, formattedReport);

  } catch (error) {
    console.error('[ERROR] /report/latest:', error);
    return errorResponse(res, 500, error.message);
  }
});

/**
 * GET /api/reports
 */
router.get('/reports', async (req, res) => {
  try {
    const { collection, limit = DEFAULT_LIMIT } = req.query;

    const reports = await reportGenerator.getAllReports(
      collection,
      parseInt(limit)
    );

    const formattedReports = reports.map(r =>
      reportGenerator.formatReportForDisplay(r)
    );

    return successResponse(res, formattedReports, null);

  } catch (error) {
    console.error('[ERROR] /reports:', error);
    return errorResponse(res, 500, error.message);
  }
});

/**
 * GET /api/status
 */
router.get('/status', async (req, res) => {
  try {
    const { collection = 'users' } = req.query;

    if (!VALID_COLLECTIONS.includes(collection)) {
      return errorResponse(res, 400, 'Invalid collection');
    }

    const status = await consistencyChecker.getConsistencyStatus(collection);
    const latestReport = await reportGenerator.getLatestReport(collection);

    return successResponse(res, {
      ...status,
      isActive: consistencyChecker.isActive(),
      latestReport: latestReport
        ? reportGenerator.formatReportForDisplay(latestReport)
        : null
    });

  } catch (error) {
    console.error('[ERROR] /status:', error);
    return errorResponse(res, 500, error.message);
  }
});

/**
 * GET /api/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const { collection } = req.query;

    const stats = await reportGenerator.generateSummaryStats(collection);

    return successResponse(res, stats);

  } catch (error) {
    console.error('[ERROR] /stats:', error);
    return errorResponse(res, 500, error.message);
  }
});

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  return successResponse(res, {
    status: 'healthy',
    uptime: process.uptime(),
    active: consistencyChecker.isActive()
  });
});

/**
 * POST /api/cleanup
 */
router.post('/cleanup', async (req, res) => {
  try {
    const { daysToKeep = 30, collection } = req.body;

    if (daysToKeep <= 0) {
      return errorResponse(res, 400, 'daysToKeep must be > 0');
    }

    const result = await reportGenerator.cleanupOldReports(
      daysToKeep,
      collection
    );

    return successResponse(
      res,
      { deletedCount: result.deletedCount },
      `Cleaned up ${result.deletedCount} old reports`
    );

  } catch (error) {
    console.error('[ERROR] /cleanup:', error);
    return errorResponse(res, 500, error.message);
  }
});

/**
 * DELETE /api/reports/:id
 * Delete a specific report by ID
 */
router.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return errorResponse(res, 400, 'Invalid report ID format');
    }

    // Find and delete the report
    const deletedReport = await Report.findByIdAndDelete(id);

    if (!deletedReport) {
      return errorResponse(res, 404, 'Report not found');
    }

    console.log(`[DELETE] Report ${id} deleted successfully`);

    return successResponse(
      res,
      { deletedId: id },
      'Report deleted successfully'
    );

  } catch (error) {
    console.error('[ERROR] DELETE /reports/:id:', error);
    return errorResponse(res, 500, error.message);
  }
});

/**
 * POST /api/connection/test
 * Test a MongoDB connection string without saving
 */
router.post('/connection/test', async (req, res) => {
  try {
    const { mongoUri } = req.body;

    if (!mongoUri) {
      return errorResponse(res, 400, 'MongoDB URI is required');
    }

    // Validate URI format
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      return errorResponse(res, 400, 'Invalid MongoDB URI format. Must start with mongodb:// or mongodb+srv://');
    }

    console.log('[TEST] Testing MongoDB connection...');

    // Create a temporary connection
    const tempConnection = mongoose.createConnection(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // 5 second timeout
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      tempConnection.once('connected', resolve);
      tempConnection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });

    // Get database info
    const db = tempConnection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // Get database name from connection
    const dbName = db.databaseName;

    // Close temporary connection
    await tempConnection.close();

    console.log(`[TEST] Connection successful to database: ${dbName}`);
    console.log(`[TEST] Found collections: ${collectionNames.join(', ')}`);

    return successResponse(res, {
      connected: true,
      database: dbName,
      collections: collectionNames,
      message: `Successfully connected to ${dbName}. Found ${collectionNames.length} collections.`
    });

  } catch (error) {
    console.error('[ERROR] Connection test failed:', error);
    return errorResponse(res, 500, `Connection failed: ${error.message}`);
  }
});

/**
 * POST /api/connection/connect
 * Save and establish a persistent connection
 */
router.post('/connection/connect', async (req, res) => {
  try {
    const { mongoUri, sessionId } = req.body;

    if (!mongoUri) {
      return errorResponse(res, 400, 'MongoDB URI is required');
    }

    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }

    // Close existing connection for this session if exists
    if (activeConnections.has(sessionId)) {
      const existingConn = activeConnections.get(sessionId);
      await existingConn.close();
      activeConnections.delete(sessionId);
    }

    console.log(`[CONNECT] Establishing connection for session: ${sessionId}`);

    // Create new persistent connection
    const newConnection = mongoose.createConnection(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Wait for connection
    await new Promise((resolve, reject) => {
      newConnection.once('connected', resolve);
      newConnection.once('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });

    // Get database info
    const db = newConnection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    const dbName = db.databaseName;

    // Store connection
    activeConnections.set(sessionId, newConnection);
    connections.set(sessionId, {
      mongoUri,
      database: dbName,
      collections: collectionNames,
      connectedAt: new Date()
    });

    console.log(`[CONNECT] Session ${sessionId} connected to ${dbName}`);

    return successResponse(res, {
      connected: true,
      sessionId,
      database: dbName,
      collections: collectionNames,
      message: `Connected to ${dbName}`
    });

  } catch (error) {
    console.error('[ERROR] Connection failed:', error);
    return errorResponse(res, 500, `Connection failed: ${error.message}`);
  }
});

/**
 * GET /api/connection/status
 * Get current connection status
 */
router.get('/connection/status', async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId || !connections.has(sessionId)) {
      return successResponse(res, {
        connected: false,
        message: 'No active connection'
      });
    }

    const connInfo = connections.get(sessionId);
    const activeConn = activeConnections.get(sessionId);

    // Check if connection is still alive
    const isConnected = activeConn && activeConn.readyState === 1;

    return successResponse(res, {
      connected: isConnected,
      sessionId,
      database: connInfo.database,
      collections: connInfo.collections,
      connectedAt: connInfo.connectedAt,
      message: isConnected ? `Connected to ${connInfo.database}` : 'Connection lost'
    });

  } catch (error) {
    console.error('[ERROR] Status check failed:', error);
    return errorResponse(res, 500, error.message);
  }
});

/**
 * POST /api/connection/disconnect
 * Disconnect from database
 */
router.post('/connection/disconnect', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return errorResponse(res, 400, 'Session ID is required');
    }

    if (activeConnections.has(sessionId)) {
      const conn = activeConnections.get(sessionId);
      await conn.close();
      activeConnections.delete(sessionId);
      connections.delete(sessionId);
      console.log(`[DISCONNECT] Session ${sessionId} disconnected`);
    }

    return successResponse(res, {
      disconnected: true,
      message: 'Disconnected successfully'
    });

  } catch (error) {
    console.error('[ERROR] Disconnect failed:', error);
    return errorResponse(res, 500, error.message);
  }
});

/**
 * GET /api/connection/collections
 * Get collections from connected database
 */
router.get('/connection/collections', async (req, res) => {
  try {
    const { sessionId } = req.query;

    if (!sessionId || !activeConnections.has(sessionId)) {
      return errorResponse(res, 400, 'No active connection. Please connect first.');
    }

    const connection = activeConnections.get(sessionId);
    const db = connection.db;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => ({
      name: c.name,
      type: c.type
    }));

    return successResponse(res, {
      collections: collectionNames,
      count: collectionNames.length
    });

  } catch (error) {
    console.error('[ERROR] Failed to get collections:', error);
    return errorResponse(res, 500, error.message);
  }
});

module.exports = router;
