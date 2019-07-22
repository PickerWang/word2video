const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const fsExtra = require('fs-extra');
const axios = require('axios');
const { Scene, Sprite } = require('spritejs');

const Animate = require('./animate');
const { uuid, arraySlice } = require('./utils');

const { MAX_FRAMES_PER_VIDEO, FFMPEG_SAVE_SUCCESS, FMPEG_SAVE_ERROR } = require('../constants');

const resolvePath = file => path.resolve(__dirname, file);

let instance = axios.create();

class Word2video {
  constructor(words, audio) {
    this.words = words; // 文字信息
    this.audio = audio; // 语音信息

    this.key = new Buffer(uuid()).toString('base64');
    this.framesTempPath = resolvePath(`../tmp/frames_${this.key}`); // 存放关键帧图片目录
    this.videoTempPath = resolvePath(`../tmp/video_${this.key}.mp4`); // 存放视频目录
    this.audioTempPath = resolvePath(`../tmp/audio_${this.key}.mp3`); // 存放音频目录
    this.inputs = []; // 生成视频输入信息列表
    this.frameIndex = 0; // 生成关键帧图片序号

    this.scene = new Scene('#container', { // 创建场景
      resolution: [540, 960],
      viewport: [540, 960],
    });

    this.layer = this.scene.layer('fglayer'); // 创建画布

    this.frameshot =  async(duration = 0) => { // 生成关键帧图片
      duration = Math.max(duration, 0);
      const canvas = await this.scene.snapshot();
      this.inputs.push({
        index: this.frameIndex,
        duration,
      });
      fs.writeFileSync(`${this.framesTempPath}/img${this.frameIndex++}.png`, canvas.toBuffer());
    }

    fsExtra.mkdirpSync(this.framesTempPath);
    this.downloadAudioPromise = this.downloadAudio(audio);
  }

  downloadAudio(audio) { // 下载音频文件
    return new Promise((resolve, reject) => {
      instance({
        method:'get',
        url: audio,
        responseType:'stream'
      }).then((res) => {
        res.data.pipe(fs.createWriteStream(this.audioTempPath));
        resolve();
      }).catch(() => {
        this.audio = null;
        resolve();
      });
    });
  }

  saveToVideo() {
    return new Promise(async(resolve, reject) => {
      fs.readdir(this.framesTempPath, (err, files) => console.log('FRAMES COUNT', files.length));
      const inputsGroup = arraySlice(this.inputs, MAX_FRAMES_PER_VIDEO); // 帧过多 则拆分成若干组 分别生成视频 最后合并视频
      let i = 0, tempVidoes = [];
      while(inputsGroup[i]) {
        const video = await this.mergeFrames(inputsGroup[i], `${this.key}_${i}`);
        tempVidoes.push(video);
        i++;
      }

      this.mergeVideos(tempVidoes)
        .then(({ video, videos }) => this.uploadVideo({ video, videos }))
        .then(resolve);
    });
  }

  mergeFrames(inputs, key) {
    return new Promise((resolve, reject) => {
      const f = new ffmpeg();
      if (this.audio && inputs.length === this.inputs.length) f.input(this.audioTempPath);

      inputs.forEach(input => {
        f.input(`${this.framesTempPath}/img${input.index}.png`);
        if (input.duration > 0) f.inputOptions(['-loop 1' , `-t ${input.duration / 1000}`]);
      });

      f.outputOptions(['-c:v libx264', '-r 30', '-s 540x960', '-pix_fmt yuv420p', '-threads 1'])
        .complexFilter([{
          filter: 'concat',
          options: {
            n: inputs.length,
          },
        }])
        .save(resolvePath(`../tmp/video_${key}.mp4`))
        .on('end', async(res) => {
          resolve(resolvePath(`../tmp/video_${key}.mp4`));
          console.log(FFMPEG_SAVE_SUCCESS, '=>', key);
        })
        .on('error', (err) => {
          resolve('error');
          console.log(FMPEG_SAVE_ERROR, '=>', key);
          console.log(err.message);
        });
    });
  }

  mergeVideos(videos) {
    if (!videos.length || videos.indexOf('error') !== -1) return Promise.resolve({ video: 'error', videos });
    else if (videos.length === 1) {
      return Promise.resolve({ video: videos[0], videos })
    }
    return new Promise((resolve, reject) => {
      const f = new ffmpeg();
        if (this.audio) f.input(this.audioTempPath);
        videos.forEach((video) => {
          f.input(video);
        })
        f.complexFilter([{
            filter: 'concat',
            options: {
              n: videos.length,
            },
          }])
          .save(this.videoTempPath)
          .on('end', async(res) => {
            resolve({ video: this.videoTempPath, videos });
            console.log(FFMPEG_SAVE_SUCCESS, '=>', this.key);
          })
          .on('error', (err) => {
            resolve({ video: 'error', videos });
            console.log(FMPEG_SAVE_ERROR, '=>', this.key);
            console.log(err.message);
          });
    });
  }

  uploadVideo({ video, videos }) {
    console.log('生成成功', '=>', `file://${video}`);
    fsExtra.removeSync(this.framesTempPath);
    fsExtra.removeSync(this.audioTempPath);
    videos.forEach((v) => {
      if (!video.includes(v)) fsExtra.removeSync(v);
    });
    // do upload
    Promise.resolve(`file://${video}`);
  }

  async render() {
    const bg = new Sprite({
      pos: [0, 0],
      size: [540, 960],
      bgcolor: '#181818',
    });
    this.layer.append(bg);
    
    this.animate = new Animate({
      layer: this.layer,
      words: this.words,
      windowH: 960,
      windowW: 540,
      onUpdate: this.frameshot,
    });

    let index = 0;
    while(this.words[index]) {
      index = await this.animate.run();
    }
    await this.frameshot(this.animate.keyframeEnd - this.animate.keyframeBegin);
    await this.downloadAudioPromise;
    const video = await this.saveToVideo();
    return video;
  }
}

module.exports = Word2video;