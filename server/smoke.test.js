const test=require('node:test');const assert=require('node:assert/strict');
test('project API module is loadable when configured',()=>{process.env.JWT_SECRET='test-secret-that-is-long-enough-to-be-secure-123';process.env.DATABASE_FILE=':memory:';const {app,server}=require('./index');assert.ok(app);server.close();});
