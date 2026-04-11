const express = require('express');
const router = express.Router();

const ConsistencyChecker = require('../services/consistencyChecker');
const ReportGenerator = require('../services/reportGenerator');
const User = require('../models/User');

// Constants
const VALID_COLLECTIONS = ['users'];
const DEFAULT_LIMIT = 20;

// Initialize services
const consistencyChecker = new ConsistencyChecker();
const reportGenerator = new ReportGenerator();

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
 * Trigger consistency check
 */
router.post('/check', async (req, res) => {
  try {
    const { collection = 'users' } = req.body;

    // Validate collection
    if (!VALID_COLLECTIONS.includes(collection)) {
      return errorResponse(
        res,
        400,
        `Invalid collection: ${collection}. Allowed: ${VALID_COLLECTIONS.join(', ')}`
      );
    }

    // Prevent concurrent execution
    if (consistencyChecker.isActive()) {
      return errorResponse(res, 409, 'Consistency check already in progress');
    }

    console.log(`[START] Consistency check → ${collection}`);

    // Run check
    const report = await consistencyChecker.checkCollection(collection, User);

    // Save report
    const savedReport = await reportGenerator.saveReport(report);

    // Update status using the saved report to ensure we have the correct ID
    await consistencyChecker.updateConsistencyStatus(collection, savedReport);

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

module.exports = router;
