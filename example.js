const path = require('path')
const Convert = require('./lib/convert')

const convert = new Convert({
  wordList: [
    { "start": 100, "end": 2300, "text": "白日依山尽", "is_hl": false },
    { "start": 2340, "end": 4640, "text": "黄河入海流", "is_hl": false },
    { "start": 4850, "end": 6430, "text": "欲穷千里", "is_hl": false },
    { "start": 7030, "end": 9560, "text": "更胜一层楼", "is_hl": false },
    { "start": 9830, "end": 11500, "text": "楼楼楼楼楼", "is_hl": true },
    { "start": 11980, "end": 13190, "text": "锄禾日当午", "is_hl": false },
    { "start": 13230, "end": 14480, "text": "汗滴禾下土", "is_hl": false },
    { "start": 14520, "end": 15760, "text": "谁知盘中餐", "is_hl": false },
    { "start": 15810, "end": 17510, "text": "粒粒皆辛苦", "is_hl": false }
  ],
  audioUrl: path.join(__dirname, '/public/assets/example.mp3'),
})

convert.render()