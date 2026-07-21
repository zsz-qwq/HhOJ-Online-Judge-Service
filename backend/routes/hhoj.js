const express = require('express');
const router = express.Router();
const store = require('../services/store');
const requireApiKey = require('../middleware/apiKey');

router.get('/judge_fetch.php', requireApiKey, (req, res) => {
  const batch = parseInt(req.query.batch) || 1;
  const inlineTestcases = parseInt(req.query.inline_testcases) || 1;

  const pending = store.listPending(batch);

  const submissions = pending.map(item => {
    const submission = {
      id: item.judgeId,
      language: item.language,
      code: item.code,
      time_limit: item.config?.timeLimit || 1000,
      memory_limit: item.config?.memoryLimit || 256
    };

    if (inlineTestcases && item.testcases) {
      submission.testcases = item.testcases.map((tc, idx) => ({
        id: idx,
        inlined: true,
        input_data: Buffer.from(tc.input || '').toString('base64'),
        output_data: Buffer.from(tc.output || '').toString('base64'),
        score: tc.score || 10
      }));
    } else if (item.testcases) {
      submission.testcases = item.testcases.map((tc, idx) => ({
        id: idx,
        input_url: tc.inputUrl || '',
        output_url: tc.outputUrl || '',
        score: tc.score || 10
      }));
    }

    store.update(item.judgeId, { status: 'fetching' });

    return submission;
  });

  res.json({
    success: true,
    submissions: submissions,
    message: `${submissions.length} submission(s) fetched`
  });
});

router.post('/judge_report.php', requireApiKey, (req, res) => {
  const { results } = req.body;

  if (!results || !Array.isArray(results)) {
    return res.json({
      success: false,
      message: 'Invalid results format'
    });
  }

  let successCount = 0;
  for (const result of results) {
    const submissionId = result.submission_id;
    const record = store.get(submissionId);

    if (record) {
      const hhojResult = {
        status: result.status,
        score: result.score,
        time_used: result.time_used,
        memory_used: result.memory_used,
        error_message: result.error_message || ''
      };

      let finalStatus = 'completed';
      if (result.status === 'ce') finalStatus = 'error';
      else if (result.status === 're') finalStatus = 'error';

      store.update(submissionId, {
        status: finalStatus,
        result: hhojResult,
        conclusion: result.status === 'accepted' ? 'success' : 'failure'
      });
      successCount++;
    }
  }

  res.json({
    success: true,
    message: `${successCount}/${results.length} results reported successfully`
  });
});

module.exports = router;
