import React, { useState, useEffect } from 'react';
import { TestSuiteResult } from '../types';
import { apiRequest } from '../lib/api';
import {
  FlaskConical,
  CheckCircle2,
  XCircle,
  Play,
  RefreshCw,
  ShieldCheck,
  FileCode,
  Download,
} from 'lucide-react';

export const TestRunnerView: React.FC = () => {
  const [results, setResults] = useState<TestSuiteResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const runTests = async () => {
    try {
      setIsRunning(true);
      const res = await apiRequest<TestSuiteResult>('/api/tests/run', { method: 'POST' });
      setResults(res);
    } catch (err: any) {
      alert(`Test execution failed: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const categories = results
    ? ['all', ...Array.from(new Set(results.tests.map((t) => t.category)))]
    : ['all'];

  const filteredTests = results
    ? results.tests.filter((t) => selectedCategory === 'all' || t.category === selectedCategory)
    : [];

  const handleDownloadTestReport = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic_compliance_test_results_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Test Suite Control Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-5 h-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-900 dark:text-white font-display">
                Automated Verification & Compliance Test Suite
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live automated test framework asserting RBAC permissions, lifecycle edge validity, SHA-256 blockchain audit integrity, and brute-force lockouts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {results && (
              <button
                onClick={handleDownloadTestReport}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 rounded-md cursor-pointer transition-colors"
                title="Download JSON Report for Grading Submission"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Test Log</span>
              </button>
            )}

            <button
              onClick={runTests}
              disabled={isRunning}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md shadow-xs cursor-pointer transition-colors"
            >
              <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              <span>{isRunning ? 'Executing Test Assertions...' : 'Run Test Suite'}</span>
            </button>
          </div>
        </div>

        {/* Category Filter */}
        {results && (
          <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
            <span className="text-xs text-slate-400 mr-1 shrink-0">Filter Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {cat === 'all' ? 'All Assertions' : cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      {results && (
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="text-[11px] text-slate-400 block uppercase">Total Test Cases</span>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
              {results.summary.total}
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 block uppercase">Assertions Passed</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              {results.summary.passed} / {results.summary.total}
            </div>
          </div>
          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            <span className="text-[11px] text-rose-600 dark:text-rose-400 block uppercase">Failed Assertions</span>
            <div className="text-2xl font-bold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
              {results.summary.failed}
            </div>
          </div>
        </div>
      )}

      {/* Test List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden shadow-xs">
        {filteredTests.map((test, idx) => (
          <div key={idx} className="p-4 flex items-start justify-between gap-3 text-xs">
            <div className="flex items-start gap-3">
              {test.passed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {test.name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                    {test.category}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  {test.message}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider ${
                  test.passed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
              >
                {test.passed ? 'PASSED' : 'FAILED'}
              </span>
              <div className="text-[10px] font-mono text-slate-400 mt-1 tabular-nums">
                {test.duration_ms} ms
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
