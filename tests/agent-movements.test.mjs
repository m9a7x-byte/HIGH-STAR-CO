import test from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatTime, formatDateTime } from '../src/lib/dateUtils.ts';

test('dates and times use English digits and keep Baghdad time', () => {
  const instant = '2026-11-23T21:05:00Z';
  for (const format of [formatDate, formatTime, formatDateTime]) {
    const value = format(instant);
    assert.doesNotMatch(value, /[٠-٩۰-۹]/);
    assert.match(value, /[0-9]/);
  }
  assert.match(formatTime(instant, { hour12: false }), /00:05/);
  assert.match(formatDate(instant), /24/);
});
