/**
 * EDEN & CO. CEO Flight Deck - Local CSV Fetch Layer
 * Fetches and parses CSV data from local files served by the HTTP server.
 */
window.EDEN = window.EDEN || {};

(function () {
  'use strict';

  /**
   * Parse a CSV string into an array of objects using the header row as keys.
   * Handles quoted fields with commas and newlines inside quotes.
   * @param {string} csv - Raw CSV text
   * @returns {Object[]} Array of row objects keyed by header
   */
  function parseCSV(csv) {
    if (!csv || !csv.trim()) return [];

    var rows = [];
    var row = [];
    var field = '';
    var inQuotes = false;
    var i = 0;
    var len = csv.length;

    while (i < len) {
      var ch = csv[i];

      if (inQuotes) {
        if (ch === '"') {
          // Check for escaped quote (double quote)
          if (i + 1 < len && csv[i + 1] === '"') {
            field += '"';
            i += 2;
          } else {
            // End of quoted field
            inQuotes = false;
            i++;
          }
        } else {
          field += ch;
          i++;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
        } else if (ch === ',') {
          row.push(field.trim());
          field = '';
          i++;
        } else if (ch === '\r') {
          // Handle \r\n or standalone \r
          row.push(field.trim());
          field = '';
          rows.push(row);
          row = [];
          i++;
          if (i < len && csv[i] === '\n') i++;
        } else if (ch === '\n') {
          row.push(field.trim());
          field = '';
          rows.push(row);
          row = [];
          i++;
        } else {
          field += ch;
          i++;
        }
      }
    }

    // Push final field and row
    if (field || row.length > 0) {
      row.push(field.trim());
      rows.push(row);
    }

    // Remove empty trailing rows
    while (rows.length > 0 && rows[rows.length - 1].join('') === '') {
      rows.pop();
    }

    if (rows.length < 2) return [];

    // First row is header
    var headers = rows[0].map(function (h) {
      return h.replace(/\s+/g, '_').toUpperCase();
    });

    var result = [];
    for (var r = 1; r < rows.length; r++) {
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = rows[r][c] !== undefined ? rows[r][c] : '';
      }
      result.push(obj);
    }

    return result;
  }

  /**
   * Fetch a local CSV file and parse it.
   * @param {string} path - Relative URL path to the CSV file
   * @returns {Promise<Object[]>} Parsed rows
   */
  function fetchLocalCSV(path) {
    console.log('[EDEN Sheets] Fetching local:', path);
    return fetch(path)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to fetch "' + path + '": ' + res.status);
        return res.text();
      })
      .then(function (text) {
        var parsed = parseCSV(text);
        console.log('[EDEN Sheets] Parsed rows for "' + path + '":', parsed.length);
        return parsed;
      })
      .catch(function (err) {
        console.warn('[EDEN Sheets] Error fetching "' + path + '":', err.message);
        return [];
      });
  }

  /**
   * Fetch all data files and return a keyed object.
   * @returns {Promise<Object>} { salesLog: [...], stock: [...], componentStock: [...], skuMap: [...] }
   */
  function fetchAllSheets() {
    var paths = window.EDEN.CONFIG.localCSVPaths;

    return Promise.all([
      fetchLocalCSV(paths.salesLog),
      fetchLocalCSV(paths.stock),
      fetchLocalCSV(paths.componentStock),
      fetchLocalCSV(paths.skuMap)
    ]).then(function (results) {
      return {
        salesLog: results[0],
        stock: results[1],
        componentStock: results[2],
        skuMap: results[3]
      };
    });
  }

  // Expose on namespace
  window.EDEN.sheets = {
    parseCSV: parseCSV,
    fetchAllSheets: fetchAllSheets
  };

})();
