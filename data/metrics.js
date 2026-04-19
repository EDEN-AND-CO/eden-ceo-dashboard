/**
 * EDEN & CO. CEO Flight Deck - KPI Calculations and RAG Logic
 * All metric functions take enriched order arrays and return calculated values.
 */
window.EDEN = window.EDEN || {};

(function () {
  'use strict';

  var CONFIG = window.EDEN.CONFIG;

  // ── Date helpers ──

  /** Parse an order date string into a Date object. */
  function parseDate(dateStr) {
    if (!dateStr) return null;
    var d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Get start of day for a date. */
  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  /** Get today as start of day. */
  function today() {
    return startOfDay(new Date());
  }

  // ── Time-based filtering ──

  /**
   * Filter orders by date range (inclusive).
   * @param {Object[]} orders - Enriched orders
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Object[]}
   */
  function filterByDateRange(orders, startDate, endDate) {
    var start = startOfDay(startDate).getTime();
    var end = startOfDay(endDate).getTime() + 86400000 - 1;
    return orders.filter(function (o) {
      var d = parseDate(o.order_date);
      if (!d) return false;
      var t = d.getTime();
      return t >= start && t <= end;
    });
  }

  /**
   * Get MTD orders (1st of current month to today).
   * @param {Object[]} orders
   * @returns {Object[]}
   */
  function getMTDOrders(orders) {
    var t = today();
    var start = new Date(t.getFullYear(), t.getMonth(), 1);
    return filterByDateRange(orders, start, t);
  }

  /**
   * Get prior MTD orders (same day range in previous month).
   * @param {Object[]} orders
   * @returns {Object[]}
   */
  function getPriorMTDOrders(orders) {
    var t = today();
    var dayOfMonth = t.getDate();
    var priorStart = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    var priorEnd = new Date(t.getFullYear(), t.getMonth() - 1, dayOfMonth);
    return filterByDateRange(orders, priorStart, priorEnd);
  }

  /** Get full calendar last month (1st to last day). */
  function getFullLastMonthOrders(orders) {
    var t = today();
    var start = new Date(t.getFullYear(), t.getMonth() - 1, 1);
    var end   = new Date(t.getFullYear(), t.getMonth(), 0); // day 0 = last day of prev month
    return filterByDateRange(orders, start, end);
  }

  /** Get full calendar month two months ago (comparison for last month view). */
  function getFullPreviousMonthOrders(orders) {
    var t = today();
    var start = new Date(t.getFullYear(), t.getMonth() - 2, 1);
    var end   = new Date(t.getFullYear(), t.getMonth() - 1, 0);
    return filterByDateRange(orders, start, end);
  }

  /**
   * Get YTD orders (1st Jan to today).
   * @param {Object[]} orders
   * @returns {Object[]}
   */
  function getYTDOrders(orders) {
    var t = today();
    var start = new Date(t.getFullYear(), 0, 1);
    return filterByDateRange(orders, start, t);
  }

  /**
   * Get last 30 days of orders.
   * @param {Object[]} orders
   * @returns {Object[]}
   */
  function getLast30Days(orders) {
    var t = today();
    var start = new Date(t.getTime() - 30 * 86400000);
    return filterByDateRange(orders, start, t);
  }

  // ── Revenue metrics ──

  /** Sum of amount_paid across orders. */
  function totalRevenue(orders) {
    return orders.reduce(function (sum, o) { return sum + o.amount_paid; }, 0);
  }

  /** Revenue grouped by channel. Returns { channelName: total }. */
  function revenueByChannel(orders) {
    var result = {};
    orders.forEach(function (o) {
      result[o.channel] = (result[o.channel] || 0) + o.amount_paid;
    });
    return result;
  }

  /** Revenue grouped by core_product. */
  function revenueByProduct(orders) {
    var result = {};
    orders.forEach(function (o) {
      result[o.core_product] = (result[o.core_product] || 0) + o.amount_paid;
    });
    return result;
  }

  /** Revenue grouped by occasion. */
  function revenueByOccasion(orders) {
    var result = {};
    orders.forEach(function (o) {
      result[o.occasion] = (result[o.occasion] || 0) + o.amount_paid;
    });
    return result;
  }

  /** Average order value. */
  function aov(orders) {
    if (orders.length === 0) return 0;
    return totalRevenue(orders) / orders.length;
  }

  // ── Order metrics ──

  function totalOrders(orders) { return orders.length; }

  /** Average orders per day across the date range in the set. */
  function ordersPerDay(orders) {
    if (orders.length === 0) return 0;
    var dates = orders.map(function (o) { return parseDate(o.order_date); }).filter(Boolean);
    if (dates.length === 0) return 0;
    var min = Math.min.apply(null, dates.map(function (d) { return d.getTime(); }));
    var max = Math.max.apply(null, dates.map(function (d) { return d.getTime(); }));
    var days = Math.max(1, Math.round((max - min) / 86400000) + 1);
    return orders.length / days;
  }

  /** Orders grouped by channel. */
  function ordersByChannel(orders) {
    var result = {};
    orders.forEach(function (o) {
      result[o.channel] = (result[o.channel] || 0) + 1;
    });
    return result;
  }

  // ── Margin metrics ──

  /**
   * Contribution margin: Revenue - COGS - (Revenue * commission).
   * Does not include ad spend (added in Session 2+).
   */
  function contributionMargin(orders) {
    return orders.reduce(function (sum, o) {
      var rev = o.amount_ex_vat || (o.amount_paid / 1.2);
      return sum + (rev - o.cogs - (o.amount_paid * o.commission_pct));
    }, 0);
  }

  /** Contribution margin as a percentage of revenue. */
  function totalRevenueExVat(orders) {
    return orders.reduce(function (sum, o) {
      return sum + (o.amount_ex_vat || (o.amount_paid / 1.2));
    }, 0);
  }

  function contributionMarginPct(orders) {
    var rev = totalRevenueExVat(orders);
    if (rev === 0) return 0;
    return (contributionMargin(orders) / rev) * 100;
  }

  // ── Ad metrics (placeholders for Session 2+) ──

  /** Return on ad spend. */
  function roas(revenue, adSpend) {
    if (!adSpend || adSpend === 0) return 0;
    return revenue / adSpend;
  }

  /** Cost per acquisition. */
  function cpa(adSpend, conversions) {
    if (!conversions || conversions === 0) return 0;
    return adSpend / conversions;
  }

  /** Total advertising cost of sale. */
  function tacos(totalAdSpend, totalRev) {
    if (!totalRev || totalRev === 0) return 0;
    return (totalAdSpend / totalRev) * 100;
  }

  // ── Stock metrics ──

  /** Days of stock remaining. */
  function stockDaysLeft(currentStock, dailyVelocity) {
    if (!dailyVelocity || dailyVelocity <= 0) return Infinity;
    return Math.floor(currentStock / dailyVelocity);
  }

  /** Date by which reorder must be placed. */
  function reorderDate(stockDays) {
    var d = new Date();
    d.setDate(d.getDate() + stockDays);
    return d;
  }

  // ── RAG status ──

  /**
   * Determine RAG status for a metric value.
   * For normal metrics: green >= threshold, amber >= threshold, else red.
   * For inverted metrics (lower is better): green <= threshold, etc.
   * @param {number} value
   * @param {Object} config - { green, amber, red, inverted? }
   * @returns {string} 'g' | 'a' | 'r'
   */
  function ragStatus(value, config) {
    if (!config) return 'g';
    if (config.inverted) {
      if (value <= config.green) return 'g';
      if (value <= config.amber) return 'a';
      return 'r';
    }
    if (value >= config.green) return 'g';
    if (value >= config.amber) return 'a';
    return 'r';
  }

  // ── Sparkline data ──

  /**
   * Generate daily metric values for the last N days.
   * @param {Object[]} orders
   * @param {number} days
   * @param {Function} metricFn - Takes an array of orders, returns a number
   * @returns {number[]}
   */
  function sparklineData(orders, days, metricFn) {
    var result = [];
    var t = today();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(t.getTime() - i * 86400000);
      var dayOrders = filterByDateRange(orders, d, d);
      result.push(metricFn(dayOrders));
    }
    return result;
  }

  // ── Pitch progress ──

  /**
   * Calculate YTD progress toward annual revenue target.
   * @param {number} ytdRevenue
   * @param {number} annualTarget
   * @returns {{ pct: number, annualised: number, gap: number, acceleration: number }}
   */
  function pitchProgress(ytdRevenue, annualTarget) {
    annualTarget = annualTarget || 1000000;
    var t = today();
    var startOfYear = new Date(t.getFullYear(), 0, 1);
    var daysElapsed = Math.max(1, Math.round((t.getTime() - startOfYear.getTime()) / 86400000));
    var annualised = (ytdRevenue / daysElapsed) * 365;
    var pct = (annualised / annualTarget) * 100;
    var gap = Math.max(0, annualTarget - annualised);
    var acceleration = annualised > 0 ? annualTarget / annualised : Infinity;

    return {
      pct: Math.round(pct * 10) / 10,
      annualised: Math.round(annualised),
      gap: Math.round(gap),
      acceleration: Math.round(acceleration * 100) / 100
    };
  }

  // ── Percentage change helper ──

  /** Calculate % change between two values. */
  function pctChange(current, prior) {
    if (!prior || prior === 0) return current > 0 ? 100 : 0;
    return ((current - prior) / prior) * 100;
  }

  // Expose on namespace
  window.EDEN.metrics = {
    filterByDateRange: filterByDateRange,
    getMTDOrders: getMTDOrders,
    getPriorMTDOrders: getPriorMTDOrders,
    getFullLastMonthOrders: getFullLastMonthOrders,
    getFullPreviousMonthOrders: getFullPreviousMonthOrders,
    getYTDOrders: getYTDOrders,
    getLast30Days: getLast30Days,
    totalRevenue: totalRevenue,
    totalRevenueExVat: totalRevenueExVat,
    revenueByChannel: revenueByChannel,
    revenueByProduct: revenueByProduct,
    revenueByOccasion: revenueByOccasion,
    aov: aov,
    totalOrders: totalOrders,
    ordersPerDay: ordersPerDay,
    ordersByChannel: ordersByChannel,
    contributionMargin: contributionMargin,
    contributionMarginPct: contributionMarginPct,
    roas: roas,
    cpa: cpa,
    tacos: tacos,
    stockDaysLeft: stockDaysLeft,
    reorderDate: reorderDate,
    ragStatus: ragStatus,
    sparklineData: sparklineData,
    pitchProgress: pitchProgress,
    pctChange: pctChange
  };

})();
