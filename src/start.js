import { createApp } from './server.js';

const port = Number(process.env.PORT || 8111);
createApp().listen(port, '127.0.0.1', () => console.log(`http://127.0.0.1:${port}/`));
