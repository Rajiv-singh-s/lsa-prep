// Automated unit tests for Terminal VFS, Shell, System, and Commands
import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerminal } from '../src/terminal/index.js';

test('Terminal: execute basic commands and check exit codes', async () => {
  const term = createTerminal();
  
  const uptime = await term.run('uptime');
  assert.equal(uptime.code, 0);
  assert.ok(uptime.lines[0].s.includes('load average'));

  const uname = await term.run('uname -r');
  assert.equal(uname.code, 0);
  assert.ok(uname.lines[0].s.includes('el10'));
});

test('Terminal: filesystem file creation, listing and reading', async () => {
  const term = createTerminal();
  
  // echo to file
  await term.run('echo "hello enterprise linux" > /tmp/test.txt');
  
  // cat file
  const cat = await term.run('cat /tmp/test.txt');
  assert.equal(cat.code, 0);
  assert.ok(cat.lines[0].s.includes('hello enterprise linux'));

  // ls /tmp
  const ls = await term.run('ls /tmp');
  assert.equal(ls.code, 0);
  assert.ok(ls.lines[0].s.includes('test.txt'));
});

test('Terminal: pipeline and grep filtering', async () => {
  const term = createTerminal();
  
  const res = await term.run('cat /etc/passwd | grep root');
  assert.equal(res.code, 0);
  assert.ok(res.lines[0].s.includes('root:x:0:0'));
});

test('Terminal: user switching and permissions', async () => {
  const term = createTerminal();
  assert.ok(term.prompt().includes('root'));

  // Create normal user file
  await term.run('touch /root/secret.txt');
  await term.run('chmod 600 /root/secret.txt');

  // Verify stat
  const stat = await term.run('stat -c %a /root/secret.txt');
  assert.equal(stat.code, 0);
  assert.ok(stat.lines[0].s.includes('600'));
});
