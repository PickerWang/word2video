const Word2video = require('../lib/word2video');

module.exports = (app) => {
  app.post('/video', function(req, res, next) {
    let words, audio_url;
    try {
      words = JSON.parse(req.body.word_json).words;
      audio_url = req.body.audio_url;
    } catch(e) {}
    if (Array.isArray(words)) {
      const word2video = new Word2video(words, audio_url);
      word2video.render();
      res.status(200).json({ ok: true });
    } else {
      res.status(200).json({ ok: false });
    }
  });
};