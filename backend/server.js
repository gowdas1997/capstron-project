const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', require('./routes/upload'));
app.use('/api', require('./routes/files'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Capstron server is running!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Capstron server running on http://localhost:${PORT}`);
});