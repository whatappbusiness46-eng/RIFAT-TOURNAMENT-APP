const test=require('node:test');
const assert=require('node:assert/strict');

test('PostgreSQL API starts against an explicitly supplied disposable database', {
  skip: !process.env.TEST_DATABASE_URL && 'Set TEST_DATABASE_URL to a disposable Supabase/PostgreSQL database'
}, async()=>{
  process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
  process.env.JWT_SECRET='test-secret-that-is-long-enough-to-be-secure-123';
  process.env.ADMIN_EMAIL='admin-smoke@test.local';
  process.env.ADMIN_PASSWORD='test-admin-password-123';
  const {start,db}=require('./index');
  const server=await start();
  assert.ok(server.listening);
  await new Promise(resolve=>server.close(resolve));
  await db.pool.end();
});
