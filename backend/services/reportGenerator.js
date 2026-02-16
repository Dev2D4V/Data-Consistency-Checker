const Report = require('../models/Report');

class ReportGenerator {
  /**
   * Saves a consistency check report to the database
   * @param {Object} reportData - The report data to save
   * @returns {Object} The saved report document
   */
  async saveReport(reportData) {
    try {
      const report = new Report(reportData);
      const savedReport = await report.save();
      console.log(`Report saved with ID: ${savedReport._id}`);
      return savedReport;
    } catch (error) {
      console.error(`Failed to save report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets the latest report for a specific collection
   * @param {string} collection - The collection name
   * @returns {Object|null} The latest report or null if not found
   */
  async getLatestReport(collection = null) {
    try {
      const query = collection ? { collection } : {};
      const report = await Report.findOne(query).sort({ timestamp: -1 });
      return report;
    } catch (error) {
      console.error(`Failed to get latest report: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets all reports for a specific collection
   * @param {string} collection - The collection name
   * @param {number} limit - Maximum number of reports to return
   * @returns {Array} Array of reports
   */
  async getAllReports(collection = null, limit = 50) {
    try {
      const query = collection ? { collection } : {};
      const reports = await Report.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);
      return reports;
    } catch (error) {
      console.error(`Failed to get reports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gets reports within a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} collection - Optional collection filter
   * @returns {Array} Array of reports within the date range
   */
  async getReportsByDateRange(startDate, endDate, collection = null) {
    try {
      const query = {
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      };
      
      if (collection) {
        query.collection = collection;
      }
      
      const reports = await Report.find(query).sort({ timestamp: -1 });
      return reports;
    } catch (error) {
      console.error(`Failed to get reports by date range: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generates a summary statistics report
   * @param {string} collection - Optional collection filter
   * @returns {Object} Summary statistics
   */
  async generateSummaryStats(collection = null) {
    try {
      const matchStage = collection ? { $match: { collection } } : { $match: {} };
      
      const stats = await Report.aggregate([
        matchStage,
        {
          $group: {
            _id: null,
            totalChecks: { $sum: 1 },
            totalDocuments: { $sum: '$totalDocuments' },
            totalInconsistencies: { $sum: '$inconsistenciesFound' },
            totalRepairs: { $sum: '$repairsApplied' },
            totalDeleted: { $sum: '$documentsDeleted' },
            avgDuration: { $avg: '$duration' },
            lastCheck: { $max: '$timestamp' },
            firstCheck: { $min: '$timestamp' }
          }
        }
      ]);
      
      return stats[0] || {
        totalChecks: 0,
        totalDocuments: 0,
        totalInconsistencies: 0,
        totalRepairs: 0,
        totalDeleted: 0,
        avgDuration: 0,
        lastCheck: null,
        firstCheck: null
      };
    } catch (error) {
      console.error(`Failed to generate summary stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deletes old reports to manage storage
   * @param {number} daysToKeep - Number of days to keep reports
   * @param {string} collection - Optional collection filter
   * @returns {Object} Deletion result
   */
  async cleanupOldReports(daysToKeep = 30, collection = null) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const query = {
        timestamp: { $lt: cutoffDate }
      };
      
      if (collection) {
        query.collection = collection;
      }
      
      const result = await Report.deleteMany(query);
      console.log(`Cleaned up ${result.deletedCount} old reports`);
      return result;
    } catch (error) {
      console.error(`Failed to cleanup old reports: ${error.message}`);
      throw error;
    }
  }

  /**
   * Formats a report for display in the frontend
   * @param {Object} report - The report to format
   * @returns {Object} Formatted report
   */
  formatReportForDisplay(report) {
    if (!report) return null;
    
    return {
      id: report._id,
      timestamp: report.timestamp,
      collection: report.collection,
      totalDocuments: report.totalDocuments,
      inconsistenciesFound: report.inconsistenciesFound,
      repairsApplied: report.repairsApplied,
      documentsDeleted: report.documentsDeleted,
      errors: report.errors,
      details: report.details,
      duration: report.duration,
      durationFormatted: this.formatDuration(report.duration),
      status: this.getReportStatus(report)
    };
  }

  /**
   * Formats duration in milliseconds to human-readable format
   * @param {number} durationMs - Duration in milliseconds
   * @returns {string} Formatted duration
   */
  formatDuration(durationMs) {
    if (durationMs < 1000) {
      return `${durationMs}ms`;
    } else if (durationMs < 60000) {
      return `${(durationMs / 1000).toFixed(2)}s`;
    } else {
      return `${(durationMs / 60000).toFixed(2)}m`;
    }
  }

  /**
   * Determines the status of a report
   * @param {Object} report - The report to analyze
   * @returns {string} Status string
   */
  getReportStatus(report) {
    if (report.errors.length > 0) {
      return 'error';
    } else if (report.inconsistenciesFound === 0) {
      return 'clean';
    } else if (report.inconsistenciesFound === report.repairsApplied + report.documentsDeleted) {
      return 'repaired';
    } else {
      return 'partial';
    }
  }
}

module.exports = ReportGenerator;
