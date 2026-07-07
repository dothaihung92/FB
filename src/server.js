require('dotenv').config();
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');

require('./db'); // đảm bảo DB & bảng được khởi tạo
const basicAuth = require('./middleware/basicAuth');
const postsRouter = require('./routes/posts');
const leadsRouter = require('./routes/leads');
const connectRouter = require('./routes/connect');
const settingsRouter = require('./routes/settings');
const adsRouter = require('./routes/ads');
const { startScheduler } = require('./jobs/scheduler');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(basicAuth);

app.get('/', (req, res) => res.redirect('/posts'));
app.use('/posts', postsRouter);
app.use('/leads', leadsRouter);
app.use('/connect', connectRouter);
app.use('/settings', settingsRouter);
app.use('/ads', adsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Có lỗi xảy ra: ' + err.message);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FB AI Page Manager đang chạy tại http://localhost:${PORT}`);
  startScheduler();
});
