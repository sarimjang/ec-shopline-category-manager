/**
 * Export Formats Handler - Manages different export formats (JSON, CSV)
 * Provides methods to export data in various formats with proper formatting
 */

const ShoplineExportFormats = (function() {
  'use strict';

  const logger = window.ShoplineLogger || console;

  /**
   * Generate timestamp for export filename
   * Format: YYYY-MM-DD
   * @returns {string} Formatted date string
   */
  function getExportDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Create JSON export data structure
   * @param {Object} allData - All storage data from chrome.storage.local
   * @returns {Object} Formatted export data
   */
  function createJsonExport(allData) {
    const exportData = {
      exportDate: new Date().toISOString(),
      exportDateFormatted: getExportDate(),
      version: '1.0',
      data: {
        stats: allData.categoryMoveStats || {
          totalMoves: 0,
          totalTimeSaved: 0,
          lastReset: null
        },
        moveHistory: allData.moveHistory || [],
        searchHistory: allData.searchHistory || [],
        errorLog: allData.errorLog || []
      }
    };

    return exportData;
  }

  /**
   * Create CSV export data with multiple sheets
   * @param {Object} allData - All storage data from chrome.storage.local
   * @returns {Object} Object with sheet names as keys, CSV strings as values
   */
  function createCsvExport(allData) {
    if (!window.ShoplineCsvExport) {
      logger.warn('CSV export utility not loaded');
      return {};
    }

    const csvData = {};

    // Statistics sheet
    if (allData.categoryMoveStats) {
      csvData.statistics = window.ShoplineCsvExport.createStatsCsv(allData.categoryMoveStats);
    }

    // Move history sheet
    if (allData.moveHistory && allData.moveHistory.length > 0) {
      csvData.moves = window.ShoplineCsvExport.createMovesCsv(allData.moveHistory);
    }

    // Search history sheet
    if (allData.searchHistory && allData.searchHistory.length > 0) {
      csvData.searches = window.ShoplineCsvExport.createSearchesCsv(allData.searchHistory);
    }

    // Error log sheet
    if (allData.errorLog && allData.errorLog.length > 0) {
      csvData.errors = window.ShoplineCsvExport.createErrorsCsv(allData.errorLog);
    }

    return csvData;
  }

  /**
   * Format size in bytes to human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Create download blob from data
   * @param {*} data - Data to convert to blob (string or object)
   * @param {string} mimeType - MIME type for the blob
   * @returns {Blob} Blob object ready for download
   */
  function createBlob(data, mimeType) {
    let content = data;

    // Convert object to JSON string if needed
    if (typeof data === 'object') {
      content = JSON.stringify(data, null, 2);
    }

    return new Blob([content], { type: mimeType });
  }

  /**
   * Generate JSON export with proper formatting
   * @param {Object} exportData - Export data object
   * @returns {Object} Contains blob, filename, size, and metadata
   */
  function generateJsonExport(exportData) {
    const blob = createBlob(exportData, 'application/json');
    const filename = `shopline-category-backup-${exportData.exportDateFormatted}.json`;
    const size = formatFileSize(blob.size);

    return {
      blob: blob,
      filename: filename,
      size: size,
      mimeType: 'application/json',
      format: 'JSON',
      stats: {
        moves: exportData.data.moveHistory ? exportData.data.moveHistory.length : 0,
        searches: exportData.data.searchHistory ? exportData.data.searchHistory.length : 0,
        errors: exportData.data.errorLog ? exportData.data.errorLog.length : 0
      }
    };
  }

  /**
   * Generate CSV export with all sheets combined into single file
   * @param {Object} csvSheets - Object with sheet names as keys, CSV data as values
   * @param {string} exportDate - Export date string
   * @returns {Object} Contains blob, filename, size, and metadata
   */
  function generateCsvExport(csvSheets, exportDate) {
    // Combine all sheets into single CSV file
    const sheets = Object.entries(csvSheets);
    const parts = [];

    for (const [sheetName, csvData] of sheets) {
      if (csvData && csvData.length > 0) {
        parts.push(`# === ${sheetName.toUpperCase()} ===`);
        parts.push(csvData);
        parts.push('');
      }
    }

    const combinedCsv = parts.join('\n');
    const blob = createBlob(combinedCsv, 'text/csv');
    const filename = `shopline-category-backup-${exportDate}.csv`;
    const size = formatFileSize(blob.size);

    return {
      blob: blob,
      filename: filename,
      size: size,
      mimeType: 'text/csv',
      format: 'CSV',
      sheets: Object.keys(csvSheets).filter(name => csvSheets[name] && csvSheets[name].length > 0)
    };
  }

  /**
   * Download file by creating blob and triggering download
   * @param {Blob} blob - Blob object to download
   * @param {string} filename - Name of file to download as
   * @returns {boolean} True if download triggered successfully
   */
  function triggerDownload(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      // Append to body, click, then remove (required for some browsers)
      document.body.appendChild(link);
      link.click();

      // Clean up
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      logger.log('Download triggered:', filename);
      return true;
    } catch (error) {
      logger.error('Error triggering download:', error);
      return false;
    }
  }

  /**
   * Get summary of export data
   * @param {Object} exportData - Export data object
   * @returns {Object} Summary with counts and sizes
   */
  function getExportSummary(exportData) {
    const stats = exportData.data;

    return {
      timestamp: exportData.exportDate,
      totalMoves: stats.stats ? stats.stats.totalMoves : 0,
      totalTimeSaved: stats.stats ? stats.stats.totalTimeSaved : 0,
      moveRecords: stats.moveHistory ? stats.moveHistory.length : 0,
      searchQueries: stats.searchHistory ? stats.searchHistory.length : 0,
      errorRecords: stats.errorLog ? stats.errorLog.length : 0
    };
  }

  return {
    getExportDate,
    createJsonExport,
    createCsvExport,
    formatFileSize,
    createBlob,
    generateJsonExport,
    generateCsvExport,
    triggerDownload,
    getExportSummary
  };
})();

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ShoplineExportFormats = ShoplineExportFormats;
}
