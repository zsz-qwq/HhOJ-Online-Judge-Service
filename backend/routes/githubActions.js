const express = require('express');
const router = express.Router();
const store = require('../services/store');
const requireApiKey = require('../middleware/apiKey');
const githubService = require('../services/github');

/**
 * GET /api/judge_fetch.php
 * Fetch pending submissions for GitHub Actions
 * This endpoint is called by the workflow to get submissions to judge
 */
router.get('/judge_fetch.php', requireApiKey, async (req, res) => {
  try {
    const batch = parseInt(req.query.batch) || 1;
    const inlineTestcases = parseInt(req.query.inline_testcases) || 1;

    const pending = store.listPending(batch);

    const submissions = pending.map(item => {
      const submission = {
        id: item.judgeId,
        language: item.language,
        code: item.code,
        time_limit: item.config?.timeLimit || 1000,
        memory_limit: item.config?.memoryLimit || 256,
        testcases: []
      };

      if (item.testcases && Array.isArray(item.testcases)) {
        submission.testcases = item.testcases.map((tc, index) => ({
          id: index + 1,
          input_data: inlineTestcases ? Buffer.from(tc.input || '', 'utf-8').toString('base64') : null,
          output_data: inlineTestcases ? Buffer.from(tc.output || '', 'utf-8').toString('base64') : null,
          input_url: inlineTestcases ? null : null,
          output_url: inlineTestcases ? null : null,
          inlined: inlineTestcases === 1,
          score: tc.score || 10
        }));
      }

      return submission;
    });

    res.json({
      success: true,
      submissions: submissions
    });

  } catch (error) {
    console.error('Fetch submissions error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/judge_report.php
 * Report judge results from GitHub Actions
 * This endpoint is called by the workflow to report results
 */
router.post('/judge_report.php', requireApiKey, async (req, res) => {
  try {
    const { results } = req.body;

    if (!results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: 'Missing or invalid results array'
      });
    }

    for (const result of results) {
      const judgeId = result.submission_id;
      const record = store.get(judgeId);

      if (record) {
        const status = result.status || 'unknown';
        store.update(judgeId, {
          status: 'completed',
          result: {
            status: status.toUpperCase(),
            score: result.score || 0,
            timeUsed: result.time_used || 0,
            memoryUsed: result.memory_used || 0,
            errorMessage: result.error_message || '',
            testcases: result.testcases || []
          }
        });
      }
    }

    res.json({
      success: true,
      message: `Successfully updated ${results.length} submissions`
    });

  } catch (error) {
    console.error('Report results error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;