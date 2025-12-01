
const http = require('http');

const SECRET = ''; // Assuming empty secret based on previous checks
const HOST = 'localhost';
const PORT = 3002;

function request(method, path, body = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: HOST,
            port: PORT,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'x-dm-secret': SECRET
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                let parsed = null;
                try {
                    parsed = data ? JSON.parse(data) : null;
                } catch (e) {
                    parsed = data;
                }
                resolve({ statusCode: res.statusCode, body: parsed });
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
}

async function run() {
    try {
        console.log('1. Creating dummy entity...');
        const createRes = await request('POST', '/api/dm/entities', {
            type: 'pc',
            code_name: 'mitest4',
            name: 'mitest4'
        });

        if (createRes.statusCode !== 200) {
            console.error('Create failed:', createRes.statusCode, JSON.stringify(createRes.body));
            throw new Error(`Failed to create entity: ${createRes.statusCode}`);
        }

        const entity = createRes.body;
        console.log(`   Created entity ID: ${entity.id}`);

        console.log('2. Verifying entity exists...');
        const getRes = await request('GET', `/api/dm/entities/${entity.id}`);
        if (getRes.statusCode !== 200) {
            throw new Error(`Failed to get entity: ${getRes.statusCode}`);
        }
        console.log('   Entity found.');

        console.log('3. Deleting entity...');
        const deleteRes = await request('DELETE', `/api/dm/entities/${entity.id}`);
        if (deleteRes.statusCode !== 204) {
            console.error('Delete failed:', deleteRes.statusCode, JSON.stringify(deleteRes.body));
            throw new Error(`Failed to delete entity: ${deleteRes.statusCode}`);
        }
        console.log('   Entity deleted.');

        console.log('4. Verifying entity is gone...');
        const checkRes = await request('GET', `/api/dm/entities/${entity.id}`);
        if (checkRes.statusCode !== 404) {
            throw new Error(`Entity still exists! Status: ${checkRes.statusCode}`);
        }
        console.log('   Entity confirmed gone (404).');

        console.log('SUCCESS: Verification complete.');
    } catch (err) {
        console.error('FAILURE:', err.message);
        process.exit(1);
    }
}

run();
